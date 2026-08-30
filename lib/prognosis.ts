import type { DailyRecord } from "@/lib/types";
import {
  daysUntil,
  formatDuration,
  formatNumber,
  recordDistanceKm,
} from "@/lib/format";

/**
 * Dagens maratonpotensial ut fra form (siste 14 dager).
 * Uavhengig nok av måltiden til at f.eks. 3:10 mot 2:59 vises tydelig.
 */
export function currentMarathonSeconds(
  targetTimeS: number,
  records: DailyRecord[],
): number {
  const window = records.slice(-14);
  if (window.length === 0) return Math.round(targetTimeS * 1.061);

  const avgScore =
    window.reduce((s, r) => s + r.score, 0) / window.length;

  const fitnessRef = 88;
  let deviationPct = (fitnessRef - avgScore) * 0.004;
  deviationPct = Math.max(-0.02, Math.min(0.14, deviationPct));

  return Math.round(targetTimeS * (1 + deviationPct));
}

export function predictFinishSeconds(
  targetTimeS: number,
  records: DailyRecord[],
): number {
  return currentMarathonSeconds(targetTimeS, records);
}

export type GoalWeekVerdict = {
  direction: "closer" | "further" | "unchanged";
  headline: string;
  detail: string;
};

/**
 * Vurderer om siste 7 dager har flyttet utøveren nærmere eller lenger unna
 * et tidsmål, ut fra estimert sluttid før vs. etter uken, supplert med
 * volum og trafikklys.
 */
export function weekTowardGoal(
  records: DailyRecord[],
  goal: { title: string; targetTimeS: number },
  plannedWeeklyKm?: number,
): GoalWeekVerdict {
  const week = records.slice(-7);
  const before = records.slice(0, Math.max(0, records.length - 7));
  const predAfter = predictFinishSeconds(goal.targetTimeS, records);
  const predBefore = predictFinishSeconds(
    goal.targetTimeS,
    before.length ? before : week,
  );
  const gapAfter = predAfter - goal.targetTimeS;
  const gapBefore = predBefore - goal.targetTimeS;
  const delta = gapAfter - gapBefore;

  const weekKm = week.reduce((s, r) => s + recordDistanceKm(r), 0);
  const redDays = week.filter((r) => r.category.startsWith("red")).length;
  const greenDays = week.filter((r) => r.category.startsWith("green")).length;

  let direction: GoalWeekVerdict["direction"] = "unchanged";
  if (delta <= -15) direction = "closer";
  else if (delta > 15) direction = "further";
  else if (before.length === 0) {
    if (greenDays >= 4 && redDays === 0) direction = "closer";
    else if (redDays >= 3) direction = "further";
  }

  const volumeNote =
    plannedWeeklyKm && plannedWeeklyKm > 0
      ? ` Volum ${formatNumber(weekKm, 1)} km mot ønsket ${formatNumber(plannedWeeklyKm, 0)} km.`
      : ` Volum ${formatNumber(weekKm, 1)} km.`;

  const lightsNote = `${greenDays} grønne og ${redDays} røde dager.`;

  if (direction === "closer") {
    return {
      direction,
      headline: "Nærmere målet",
      detail: `Siste 7 dager har brakt deg nærmere ${goal.title}. Estimat ${formatDuration(predAfter)} mot ${formatDuration(goal.targetTimeS)}. ${lightsNote}${volumeNote}`,
    };
  }
  if (direction === "further") {
    return {
      direction,
      headline: "Lenger unna målet",
      detail: `Siste 7 dager har tatt deg lenger unna ${goal.title}. Estimat ${formatDuration(predAfter)} mot ${formatDuration(goal.targetTimeS)}. ${lightsNote}${volumeNote}`,
    };
  }
  return {
    direction,
    headline: "Uendret mot målet",
    detail: `Siste 7 dager har ikke flyttet deg merkbart mot ${goal.title}. Estimat ${formatDuration(predAfter)} mot ${formatDuration(goal.targetTimeS)}. ${lightsNote}${volumeNote}`,
  };
}

export type TrendPoint = { t: number; seconds: number };

export type MarathonFormTrend = {
  history: TrendPoint[];
  plan: TrendPoint[];
  targetS: number;
  todayS: number;
  daysLeft: number;
  onTrack: boolean;
  requiredTodayS: number;
};

/**
 * Historisk form + planlagt bane mot måltid (om alt gjøres som det skal).
 * t = dager fra i dag (negativt = fortid, 0 = i dag, positivt = frem mot løp).
 */
export function marathonFormTrend(
  records: DailyRecord[],
  goal: { eventDate: string; targetTimeS: number },
  from = new Date(),
): MarathonFormTrend {
  const daysLeft = Math.max(0, daysUntil(goal.eventDate, from));
  const todayS = currentMarathonSeconds(goal.targetTimeS, records);

  const history: TrendPoint[] = records.map((_, i) => ({
    t: daysUntil(records[i].date, from),
    seconds: currentMarathonSeconds(goal.targetTimeS, records.slice(0, i + 1)),
  }));

  if (history.length === 0) {
    history.push({ t: 0, seconds: todayS });
  } else {
    history[history.length - 1] = { t: 0, seconds: todayS };
  }

  const planPoints = Math.max(8, Math.min(daysLeft, 28));
  const plan: TrendPoint[] = [];
  for (let i = 0; i <= planPoints; i++) {
    const d = daysLeft === 0 ? 0 : Math.round((i / planPoints) * daysLeft);
    const progress = daysLeft === 0 ? 1 : d / daysLeft;
    const eased = 1 - (1 - progress) ** 1.55;
    plan.push({
      t: d,
      seconds: Math.round(todayS + (goal.targetTimeS - todayS) * eased),
    });
  }
  const lastPlan = plan[plan.length - 1];
  if (!lastPlan || lastPlan.t !== daysLeft) {
    plan.push({ t: daysLeft, seconds: goal.targetTimeS });
  } else {
    lastPlan.seconds = goal.targetTimeS;
  }

  const first = history[0];
  const span = daysLeft - first.t || 1;
  const u = Math.max(0, Math.min(1, (0 - first.t) / span));
  const requiredTodayS = Math.round(
    first.seconds + (goal.targetTimeS - first.seconds) * u,
  );
  const onTrack = todayS <= requiredTodayS + 45;

  return {
    history,
    plan,
    targetS: goal.targetTimeS,
    todayS,
    daysLeft,
    onTrack,
    requiredTodayS,
  };
}
