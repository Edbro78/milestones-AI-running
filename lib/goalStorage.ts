import type { Goal } from "@/lib/mockData";

export const GOAL_STORAGE_KEY = "milestones_marathon_goal_v1";

/** Maratonmålet brukeren har lagret i nettleseren, ellers `fallback`. */
export function loadStoredGoal(fallback: Goal | null): Goal | null {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(GOAL_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Goal;
    if (!parsed?.eventDate || !parsed.targetTimeS) return fallback;
    return { ...parsed, isMain: true };
  } catch {
    return fallback;
  }
}

export function saveStoredGoal(goal: Goal): void {
  try {
    window.localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goal));
  } catch {
    // ignore
  }
}
