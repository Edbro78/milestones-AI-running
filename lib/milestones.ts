import { formatDate, formatNumber, formatPace } from "@/lib/format";

export type MilestoneKind = "lt2" | "mp" | "long";

export type MilestoneLog = {
  id: string;
  kind: MilestoneKind;
  date: string;
  avgPaceS?: number;
  easyPaceS?: number;
  mpPaceS?: number;
  avgHr?: number;
  avgHrPart1?: number;
  avgHrPart2?: number;
  maxHr?: number;
  decouplingPct?: number;
  lactate?: number;
  carbsPerHour?: number;
};

export type MilestoneTargets = {
  mpPaceS: number;
  lt2PaceS: number;
  easyPaceS: number;
  hrMax: number | null;
};

export const INTERVAL_DAYS = 21;
export const CYCLE_OFFSET: Record<MilestoneKind, number> = {
  lt2: 0,
  mp: 7,
  long: 14,
};

export const MILESTONE_META: Record<
  MilestoneKind,
  { title: string; short: string; protocol: string }
> = {
  lt2: {
    title: "LT2-test",
    short: "30 min terskel",
    protocol:
      "15 min oppvarming, deretter 30 min jevnt terskelløp på flatt underlag. Avvik 1. vs 2. halvdel under 2 %.",
  },
  mp: {
    title: "MP-test",
    short: "60 min maratonfart",
    protocol:
      "60 min kontinuerlig i eksakt maratonfart. Aerob dekobling under 3 %.",
  },
  long: {
    title: "30 km-test",
    short: "15 km rolig + 15 km MP",
    protocol:
      "15 km i sone 2, deretter 15 km i maratonfart. 75 g karbohydrat per time. Dekobling under 5 % på del 2.",
  },
};

export const MILESTONE_ORDER: MilestoneKind[] = ["lt2", "mp", "long"];

const STORAGE_KEY = "milestones_test_logs_v1";
const MARATHON_KM = 42.195;
const ESTIMATE_MIN_S = 2 * 3600;
const ESTIMATE_MAX_S = 6 * 3600 + 30 * 60;
const KIND_WEIGHT: Record<MilestoneKind, number> = {
  lt2: 1,
  mp: 1.15,
  long: 1.25,
};

export function marathonPaceS(targetTimeS: number): number {
  return Math.round(targetTimeS / MARATHON_KM);
}

export function marathonTimeFromMpPaceS(paceS: number): number {
  return Math.round(paceS * MARATHON_KM);
}

/** Inverterer LT2-tabellen: terskelfart → implisert maratontid. */
export function marathonTimeFromLt2PaceS(paceS: number): number {
  let lo = ESTIMATE_MIN_S;
  let hi = ESTIMATE_MAX_S;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (lt2PaceS(mid) < paceS) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export function marathonTimeFromEasyPaceS(easyPaceS: number): number {
  return marathonTimeFromMpPaceS(Math.max(1, easyPaceS - 35));
}

/** LT2: 15–25 s/km raskere enn MP, tilpasset tabellen 2:30–4:30. */
export function lt2PaceS(targetTimeS: number): number {
  const mp = marathonPaceS(targetTimeS);
  const clamped = Math.min(16200, Math.max(9000, targetTimeS));
  const offset = Math.round(18 + ((clamped - 9000) / 7200) * 9);
  return mp - offset;
}

/** Del 1 av 30 km-testen: 35 s/km tregere enn MP. */
export function easyLongPaceS(targetTimeS: number): number {
  return marathonPaceS(targetTimeS) + 35;
}

export function milestoneTargets(
  targetTimeS: number,
  hrMax: number | null,
): MilestoneTargets {
  return {
    mpPaceS: marathonPaceS(targetTimeS),
    lt2PaceS: lt2PaceS(targetTimeS),
    easyPaceS: easyLongPaceS(targetTimeS),
    hrMax: hrMax && hrMax > 0 ? hrMax : null,
  };
}

export function hrAtPct(hrMax: number, pct: number): number {
  return Math.round((hrMax * pct) / 100);
}

export function toIsoDate(from = new Date()): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  const d = String(from.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function latestLog(
  logs: MilestoneLog[],
  kind: MilestoneKind,
): MilestoneLog | undefined {
  return logs
    .filter((l) => l.kind === kind)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

export const FRESH_DAYS = 30;
export const STALE_DAYS = 60;

export type LogFreshness = "green" | "yellow" | "red";

/** Grønn mens testen er logget, gul etter 1 mnd, rød etter 2 mnd. */
export function logFreshness(
  lastDate: string | undefined,
  from = new Date(),
): LogFreshness | null {
  if (!lastDate) return null;
  const today = toIsoDate(from);
  if (today > addDays(lastDate, STALE_DAYS)) return "red";
  if (today > addDays(lastDate, FRESH_DAYS)) return "yellow";
  return "green";
}

/** Neste frist: 21 dager etter siste logg, ellers fast syklus mot løpsdagen. */
export function nextDueIso(
  kind: MilestoneKind,
  logs: MilestoneLog[],
  eventDate?: string | null,
  from = new Date(),
): string {
  const last = latestLog(logs, kind);
  if (last) return addDays(last.date, INTERVAL_DAYS);

  const today = toIsoDate(from);
  const offset = CYCLE_OFFSET[kind];
  if (eventDate) {
    let due = addDays(eventDate, -90 + offset);
    while (due < today) due = addDays(due, INTERVAL_DAYS);
    return due;
  }
  return addDays(today, offset);
}

export function dueLabel(dueIso: string, from = new Date()): string {
  const today = toIsoDate(from);
  if (dueIso === today) return "Forfall i dag";
  const a = new Date(`${dueIso}T00:00:00`).getTime();
  const b = new Date(`${today}T00:00:00`).getTime();
  const days = Math.round((a - b) / 86_400_000);
  if (days > 0) return `Om ${days} dager`;
  return `${Math.abs(days)} dager over frist`;
}

export type MilestoneVerdict = {
  passed: boolean | null;
  summary: string;
};

function nearPace(actual: number, target: number, slackS = 5): boolean {
  return Math.abs(actual - target) <= slackS;
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function evaluateLog(
  log: MilestoneLog,
  targets: MilestoneTargets,
): MilestoneVerdict {
  const checks: boolean[] = [];
  const bits: string[] = [];
  const hr = targets.hrMax;

  if (log.kind === "lt2") {
    if (log.avgPaceS != null) {
      const ok = nearPace(log.avgPaceS, targets.lt2PaceS);
      checks.push(ok);
      bits.push(
        ok
          ? `Fart ${formatPace(log.avgPaceS)}`
          : `Fart ${formatPace(log.avgPaceS)}, mål ${formatPace(targets.lt2PaceS)}`,
      );
    }
    if (hr && log.avgHr != null) {
      const pct = (log.avgHr / hr) * 100;
      const ok = inRange(pct, 88, 92);
      checks.push(ok);
      bits.push(`Puls ${formatNumber(pct, 0)} % av maks`);
    }
    if (hr && log.maxHr != null) {
      checks.push((log.maxHr / hr) * 100 <= 93);
    }
    if (log.lactate != null) {
      const ok = inRange(log.lactate, 3.8, 4.2);
      checks.push(ok);
    }
  }

  if (log.kind === "mp") {
    if (log.avgPaceS != null) {
      const ok = nearPace(log.avgPaceS, targets.mpPaceS);
      checks.push(ok);
      bits.push(
        ok
          ? `Fart ${formatPace(log.avgPaceS)}`
          : `Fart ${formatPace(log.avgPaceS)}, mål ${formatPace(targets.mpPaceS)}`,
      );
    }
    if (hr && log.avgHr != null) {
      const pct = (log.avgHr / hr) * 100;
      const ok = inRange(pct, 80, 85);
      checks.push(ok);
      bits.push(`Puls ${formatNumber(pct, 0)} % av maks`);
    }
    if (hr && log.maxHr != null) {
      checks.push((log.maxHr / hr) * 100 <= 85);
    }
    if (log.decouplingPct != null) {
      const ok = log.decouplingPct < 3;
      checks.push(ok);
      bits.push(`Dekobling ${formatNumber(log.decouplingPct, 1)} %`);
    }
  }

  if (log.kind === "long") {
    if (log.easyPaceS != null) {
      checks.push(nearPace(log.easyPaceS, targets.easyPaceS, 8));
    }
    if (log.mpPaceS != null) {
      const ok = nearPace(log.mpPaceS, targets.mpPaceS);
      checks.push(ok);
      bits.push(`MP ${formatPace(log.mpPaceS)}`);
    }
    if (hr && log.avgHrPart1 != null) {
      checks.push((log.avgHrPart1 / hr) * 100 < 75);
    }
    if (hr && log.avgHrPart2 != null) {
      const pct = (log.avgHrPart2 / hr) * 100;
      const ok = pct < 85;
      checks.push(ok);
      bits.push(`Puls del 2 ${formatNumber(pct, 0)} %`);
    }
    if (hr && log.maxHr != null) {
      checks.push((log.maxHr / hr) * 100 < 87);
    }
    if (log.decouplingPct != null) {
      const ok = log.decouplingPct < 5;
      checks.push(ok);
      bits.push(`Dekobling ${formatNumber(log.decouplingPct, 1)} %`);
    }
  }

  if (checks.length === 0) {
    return {
      passed: null,
      summary: log.date ? `Logget ${formatDate(log.date)}` : "Ikke vurdert",
    };
  }
  const passed = checks.every(Boolean);
  return {
    passed,
    summary: bits[0] ?? (passed ? "Innenfor mål" : "Utenfor mål"),
  };
}

function hrPct(hr: number | undefined, hrMax: number | null): number | null {
  if (hr == null || !hrMax || hrMax <= 0) return null;
  return (hr / hrMax) * 100;
}

function timeAdj(baseS: number, pct: number): number {
  return Math.round(baseS * (1 + pct));
}

/**
 * Implisert maratontid fra én testøkt.
 * Fart inverteres mot kalibreringstabellen; for høy puls eller dekobling
 * gjør estimatet tregere fordi farten da ikke er fysiologisk bærekraftig.
 */
export function impliedMarathonSeconds(
  log: MilestoneLog,
  hrMax: number | null,
): number | null {
  if (log.kind === "lt2") {
    if (log.avgPaceS == null) return null;
    let t = marathonTimeFromLt2PaceS(log.avgPaceS);
    const pct = hrPct(log.avgHr, hrMax);
    if (pct != null && pct > 92) {
      t = timeAdj(t, Math.min(0.08, (pct - 92) * 0.012));
    }
    if (log.lactate != null && log.lactate > 4.2) {
      t = timeAdj(t, Math.min(0.04, (log.lactate - 4.2) * 0.02));
    }
    return t;
  }

  if (log.kind === "mp") {
    if (log.avgPaceS == null) return null;
    const pct = hrPct(log.avgHr, hrMax);
    let t: number;
    if (pct != null && pct >= 88) {
      t = marathonTimeFromLt2PaceS(log.avgPaceS);
    } else {
      t = marathonTimeFromMpPaceS(log.avgPaceS);
      if (pct != null && pct > 85) {
        t = timeAdj(t, Math.min(0.06, (pct - 85) * 0.012));
      }
    }
    if (log.decouplingPct != null && log.decouplingPct >= 3) {
      t = timeAdj(t, Math.min(0.08, (log.decouplingPct - 3) * 0.012));
    }
    const maxPct = hrPct(log.maxHr, hrMax);
    if (maxPct != null && maxPct > 85) {
      t = timeAdj(t, Math.min(0.03, (maxPct - 85) * 0.004));
    }
    return t;
  }

  const parts: number[] = [];
  if (log.mpPaceS != null) parts.push(marathonTimeFromMpPaceS(log.mpPaceS));
  if (log.easyPaceS != null) {
    parts.push(marathonTimeFromEasyPaceS(log.easyPaceS));
  }
  if (parts.length === 0) return null;

  let t =
    log.mpPaceS != null && log.easyPaceS != null
      ? Math.round(
          marathonTimeFromMpPaceS(log.mpPaceS) * 0.7 +
            marathonTimeFromEasyPaceS(log.easyPaceS) * 0.3,
        )
      : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);

  const pct2 = hrPct(log.avgHrPart2, hrMax);
  if (pct2 != null && pct2 >= 85) {
    t = timeAdj(t, Math.min(0.07, (pct2 - 85) * 0.012));
  }
  const pct1 = hrPct(log.avgHrPart1, hrMax);
  if (pct1 != null && pct1 >= 75) {
    t = timeAdj(t, Math.min(0.03, (pct1 - 75) * 0.004));
  }
  if (log.decouplingPct != null && log.decouplingPct >= 5) {
    t = timeAdj(t, Math.min(0.1, (log.decouplingPct - 5) * 0.014));
  }
  const maxPct = hrPct(log.maxHr, hrMax);
  if (maxPct != null && maxPct >= 87) {
    t = timeAdj(t, Math.min(0.04, (maxPct - 87) * 0.006));
  }
  return t;
}

export type MilestoneBlend = {
  seconds: number;
  n: number;
};

/** Recency-vektet snitt av testdata t.o.m. asOf. Nyere økter teller mer. */
export function blendedMilestoneSeconds(
  logs: MilestoneLog[],
  hrMax: number | null,
  asOf: string,
): MilestoneBlend | null {
  let num = 0;
  let den = 0;
  let n = 0;
  const asOfMs = Date.parse(`${asOf}T00:00:00`);
  if (!Number.isFinite(asOfMs)) return null;

  for (const log of logs) {
    if (log.date > asOf) continue;
    const implied = impliedMarathonSeconds(log, hrMax);
    if (implied == null) continue;
    const logMs = Date.parse(`${log.date}T00:00:00`);
    const daysAgo = Math.max(0, (asOfMs - logMs) / 86_400_000);
    const recency = Math.exp((-daysAgo * Math.LN2) / INTERVAL_DAYS);
    const w = KIND_WEIGHT[log.kind] * recency;
    num += implied * w;
    den += w;
    n += 1;
  }
  if (den === 0) return null;
  return { seconds: Math.round(num / den), n };
}

export function clampMarathonSeconds(seconds: number): number {
  return Math.min(ESTIMATE_MAX_S, Math.max(ESTIMATE_MIN_S, Math.round(seconds)));
}

export function emptyLogs(): MilestoneLog[] {
  return [];
}

export function loadMilestoneLogs(): MilestoneLog[] {
  if (typeof window === "undefined") return emptyLogs();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLogs();
    const parsed = JSON.parse(raw) as MilestoneLog[];
    return Array.isArray(parsed) ? parsed : emptyLogs();
  } catch {
    return emptyLogs();
  }
}

export function saveMilestoneLogs(logs: MilestoneLog[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function upsertMilestoneLog(
  logs: MilestoneLog[],
  entry: MilestoneLog,
): MilestoneLog[] {
  const next = [...logs.filter((l) => l.id !== entry.id), entry];
  next.sort((a, b) => a.date.localeCompare(b.date));
  return next;
}
