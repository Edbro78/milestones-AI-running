export type DistanceKind = "kort" | "middels" | "lang";
export type EffortKind = "rolig" | "middels" | "hard";
export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type PlannedSession = {
  distance: DistanceKind;
  effort: EffortKind;
  km: number;
};

export type WeekPlan = Record<WeekdayKey, PlannedSession | null>;

export const WEEKDAYS: {
  key: WeekdayKey;
  label: string;
  short: string;
}[] = [
  { key: "mon", label: "Mandag", short: "Man" },
  { key: "tue", label: "Tirsdag", short: "Tir" },
  { key: "wed", label: "Onsdag", short: "Ons" },
  { key: "thu", label: "Torsdag", short: "Tor" },
  { key: "fri", label: "Fredag", short: "Fre" },
  { key: "sat", label: "Lørdag", short: "Lør" },
  { key: "sun", label: "Søndag", short: "Søn" },
];

export const DISTANCE_DEFAULT_KM: Record<DistanceKind, number> = {
  kort: 8,
  middels: 14,
  lang: 24,
};

export const DISTANCE_LABEL: Record<DistanceKind, string> = {
  kort: "Kort tur",
  middels: "Middels tur",
  lang: "Lang tur",
};

export const EFFORT_LABEL: Record<EffortKind, string> = {
  rolig: "Rolig",
  middels: "Middels",
  hard: "Hard",
};

const STORAGE_KEY = "milestones_week_plan_v1";

export function emptyWeekPlan(): WeekPlan {
  return {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  };
}

export function isInterval(effort: EffortKind): boolean {
  return effort === "middels" || effort === "hard";
}

export function sessionSummary(session: PlannedSession): string {
  const kind = isInterval(session.effort) ? "intervall" : "rolig";
  return `${DISTANCE_LABEL[session.distance]} · ${EFFORT_LABEL[session.effort]} (${kind})`;
}

export function plannedWeeklyKm(plan: WeekPlan): number {
  return WEEKDAYS.reduce((sum, day) => sum + (plan[day.key]?.km ?? 0), 0);
}

/** Mandag = 0 … søndag = 6. */
export function todayWeekdayIndex(from = new Date()): number {
  const js = from.getDay();
  return js === 0 ? 6 : js - 1;
}

export function loadWeekPlan(): WeekPlan {
  if (typeof window === "undefined") return emptyWeekPlan();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWeekPlan();
    const parsed = JSON.parse(raw) as Partial<WeekPlan>;
    return { ...emptyWeekPlan(), ...parsed };
  } catch {
    return emptyWeekPlan();
  }
}

export function saveWeekPlan(plan: WeekPlan): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function hasPlannedSessions(plan: WeekPlan | null | undefined): boolean {
  if (!plan) return false;
  return WEEKDAYS.some((day) => plan[day.key] != null);
}

export function plannedForToday(
  plan: WeekPlan,
  from = new Date(),
): PlannedSession | null {
  return plan[WEEKDAYS[todayWeekdayIndex(from)].key];
}

export function parseWeekPlan(raw: unknown): WeekPlan {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return emptyWeekPlan();
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return emptyWeekPlan();
    }
  }
  if (!obj || typeof obj !== "object") return emptyWeekPlan();
  const next = emptyWeekPlan();
  for (const day of WEEKDAYS) {
    const value = (obj as Record<string, unknown>)[day.key];
    if (!value || typeof value !== "object") continue;
    const session = value as Partial<PlannedSession>;
    if (
      (session.distance === "kort" ||
        session.distance === "middels" ||
        session.distance === "lang") &&
      (session.effort === "rolig" ||
        session.effort === "middels" ||
        session.effort === "hard") &&
      typeof session.km === "number" &&
      Number.isFinite(session.km)
    ) {
      next[day.key] = {
        distance: session.distance,
        effort: session.effort,
        km: session.km,
      };
    }
  }
  return next;
}
