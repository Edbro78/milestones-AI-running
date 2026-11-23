/**
 * Mapper rå Garmin-historikk til DailyRecord via derive + evaluate.
 * Bruker den eksisterende garmin-connect-klienten — ikke mock.
 */
import { acwr, deltaRhr, hrvZ } from "@/lib/derive";
import {
  fetchDailySnapshot,
  fetchHistoryMetrics,
  fetchRecentActivities,
} from "@/lib/garmin/client";
import { evaluate } from "@/lib/trafficLight";
import type { DailyRecord, DayMetrics, Metrics, RunSummary } from "@/lib/types";
import { todayISO } from "@/lib/time";
import { fillFromPrevious7 } from "@/lib/fillMissing";

const round = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export type GarminSyncResult = {
  connected: boolean;
  lastSync: string;
  records: DailyRecord[];
  hrvBaseline: number | null;
  rhrBaseline: number | null;
  error?: string;
};

/** Siste kjente historikk per app-bruker (cache i serverminnet). */
const memoryHistory = new Map<string, DayMetrics[]>();

function daysAgoISO(n: number): string {
  const d = new Date(todayISO() + "T12:00:00");
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function mergeHistory(existing: DayMetrics[], incoming: DayMetrics[]): DayMetrics[] {
  const map = new Map(existing.map((d) => [d.date, d]));
  for (const day of incoming) map.set(day.date, day);
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Henter Garmin-historikk og bygger evaluerte dagsrader.
 * `fromISO` = hent bare fra denne datoen (inkl.) — bruk cache for eldre dager.
 */
export async function syncGarminRecords(
  userId: string,
  days = 60,
  fromISO?: string,
): Promise<GarminSyncResult> {
  // Hent alltid hele vinduet: HRV-normal og belastning (ACWR) trenger full
  // historikk, ellers får samme dag ulikt trafikklys avhengig av hvilken synk
  // som kjørte. Garmin gir inntil 28 dager per kall, så det koster lite ekstra.
  void fromISO;
  const activityDays = days;
  let activitiesOk = true;
  const [freshHistory, activities, todaySnap] = await Promise.all([
    fetchHistoryMetrics(userId, days),
    fetchRecentActivities(userId, activityDays).catch(() => {
      activitiesOk = false;
      return [] as Awaited<ReturnType<typeof fetchRecentActivities>>;
    }),
    // Dagens øyeblikksbilde (hvilepuls, stress) hentes ved hver synk, så dagens
    // trafikklys blir det samme enten synken er full eller kort.
    fetchDailySnapshot(userId).catch(() => null),
  ]);

  const rawHistory = mergeHistory(memoryHistory.get(userId) ?? [], freshHistory).slice(-days);
  memoryHistory.set(userId, rawHistory);

  // Dager uten Garmin-data får snittet av de 7 foregående dagene. Dagens skritt
  // fylles ikke: «0 så langt» om morgenen er riktig.
  const todayIdx = rawHistory.findIndex((d) => d.date === todayISO());
  const bbFill = fillFromPrevious7(rawHistory.map((d) => d.body_battery));
  const sleepFill = fillFromPrevious7(rawHistory.map((d) => d.sleep_score));
  const stepsFill = fillFromPrevious7(rawHistory.map((d) => d.steps), { skipIndex: todayIdx });
  const stepsTotalFill = fillFromPrevious7(
    rawHistory.map((d) => d.steps_total ?? null),
    { skipIndex: todayIdx },
  );
  const history: DayMetrics[] = rawHistory.map((d, i) => ({
    ...d,
    body_battery: bbFill.values[i],
    sleep_score: sleepFill.values[i],
    // I dag uten skritt fra Garmin ennå = 0 skritt så langt.
    steps: i === todayIdx ? (stepsFill.values[i] ?? 0) : stepsFill.values[i],
    steps_total: i === todayIdx ? (stepsTotalFill.values[i] ?? 0) : stepsTotalFill.values[i],
  }));
  const estimatedFor = (i: number): string[] => [
    ...(bbFill.estimated[i] ? ["bodyBattery"] : []),
    ...(sleepFill.estimated[i] ? ["sleepScore"] : []),
    ...(stepsTotalFill.estimated[i] || stepsFill.estimated[i] ? ["steps"] : []),
  ];

  // Bygg RHR-serie: bruk dagens snapshot der vi har den; ellers ukjent.
  // Historikk-endepunktet leverer ikke RHR per dag i dagens klient.
  const rhrToday = todaySnap?.resting_hr ?? null;
  const rhrBaseline = todaySnap?.resting_hr_7d_avg ?? rhrToday;

  const hrvSeries = history.map((d) => d.hrv).filter((v): v is number => v != null);
  const recentHrv = hrvSeries.slice(-7);
  const hrvBaseline =
    todaySnap?.hrv_7d_avg ??
    (recentHrv.length
      ? Math.round((recentHrv.reduce((a, b) => a + b, 0) / recentHrv.length) * 10) / 10
      : null);
  // For z-skår trenger vi historikk før hver dag — bygg kumulativt
  const loads = history.map((d) => {
    // Bruk km som belastningsproxy når Garmin ikke leverer training_load i historikk
    return Math.max(0, d.distance_km) * 10;
  });

  const activityByDate = new Map<string, string>();
  for (const a of activities) {
    if (!a.date) continue;
    const label = `${a.type || "økt"}, ${a.distanceKm.toFixed(1)} km`;
    const prev = activityByDate.get(a.date);
    activityByDate.set(a.date, prev ? `${prev}; ${label}` : label);
  }

  // Løpeturer per dag. Bare dager innenfor aktivitetsvinduet får `runs`;
  // eldre dager beholder det klienten har i cache.
  const runsWindowStart = daysAgoISO(activityDays - 1);
  const runsByDate = new Map<string, RunSummary[]>();
  for (const a of activities) {
    if (!a.date || !a.type.toLowerCase().includes("run")) continue;
    const list = runsByDate.get(a.date) ?? [];
    list.push({
      startTime: a.startTime,
      name: a.name,
      distanceKm: a.distanceKm,
      durationSec: a.durationSec,
      avgHr: a.avgHr,
      elevationGainM: a.elevationGainM,
    });
    runsByDate.set(a.date, list);
  }
  const runsFor = (date: string): RunSummary[] | undefined =>
    activitiesOk && date >= runsWindowStart ? (runsByDate.get(date) ?? []) : undefined;

  const records: DailyRecord[] = history.map((day, i) => {
    const hrvHistory = history
      .slice(0, i)
      .map((d) => d.hrv)
      .filter((v): v is number => v != null);
    const currentHrv = day.hrv ?? (hrvSeries.length ? hrvSeries[hrvSeries.length - 1] : 0);

    // ΔRHR: kun for i dag når vi har snapshot; ellers 0
    const isToday = i === history.length - 1;
    const d_rhr =
      isToday && rhrToday != null && rhrBaseline != null
        ? deltaRhr(rhrToday, [rhrBaseline])
        : 0;

    const metrics: Metrics = {
      hrv_z: round(hrvZ(currentHrv, hrvHistory.length ? hrvHistory : [currentHrv]), 2),
      d_rhr,
      body_battery: day.body_battery ?? 50,
      sleep_score: day.sleep_score ?? 70,
      acwr: round(acwr(loads.slice(0, i + 1)), 2),
      recovery_hours: Math.max(
        0,
        Math.round((100 - (day.body_battery ?? 50)) * 0.4),
      ),
      steps: day.steps ?? 0,
      stress: todaySnap?.stress ?? 25,
    };

    const result = evaluate(metrics);

    const recoveryScore =
      day.recovery ??
      (day.body_battery != null || day.sleep_score != null
        ? Math.round(
            ((day.body_battery ?? day.sleep_score ?? 50) +
              (day.sleep_score ?? day.body_battery ?? 50)) /
              2,
          )
        : null);

    return {
      date: day.date,
      metrics,
      category: result.category,
      score: result.score,
      triggers: result.triggers,
      source: "garmin" as const,
      completed: activityByDate.get(day.date) ?? (day.distance_km > 0
        ? `løping, ${day.distance_km.toFixed(1)} km`
        : null),
      distanceKm: day.distance_km > 0 ? round(day.distance_km, 1) : 0,
      hrvMs: day.hrv,
      recoveryScore,
      floors: day.floors,
      bodyBattery: day.body_battery,
      sleepScore: day.sleep_score,
      stepsTotal: day.steps_total ?? null,
      stepsBeforeRun: day.steps,
      estimated: estimatedFor(i),
      runs: runsFor(day.date),
    };
  });

  return {
    connected: true,
    lastSync: new Date().toISOString(),
    records,
    hrvBaseline: hrvBaseline != null ? hrvBaseline : null,
    rhrBaseline: rhrBaseline != null ? rhrBaseline : null,
  };
}

