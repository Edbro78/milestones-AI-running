import { recordDistanceKm } from "@/lib/format";
import { todayISO } from "@/lib/time";
import type { Category, DailyRecord, RunSummary } from "@/lib/types";

export type DayStatus = {
  /** Nivået som vises nå: rødt 3 når dagens økt er gjennomført. */
  category: Category;
  /** Nivået før økten (fra morgenmålingene). */
  preWorkoutCategory: Category;
  /** Dagens løpetur er gjennomført – ingen ny økt anbefales i dag. */
  workoutDone: boolean;
  /** Løpeturene som er logget i dag. */
  runs: RunSummary[];
  km: number;
};

/**
 * Før dagens trening gjelder morgenens trafikklys. Etter at en løpetur er
 * registrert i dag, går lyset til rødt: restitusjon til i morgen.
 */
export function dayStatus(record: DailyRecord, today = todayISO()): DayStatus {
  const runs = record.runs ?? [];
  const km = recordDistanceKm(record);
  const workoutDone = record.date === today && (runs.length > 0 || km > 0);
  return {
    category: workoutDone ? "red3" : record.category,
    preWorkoutCategory: record.category,
    workoutDone,
    runs,
    km,
  };
}
