import type { DailyRecord } from "@/lib/types";

/** Rå Garmin-aktivitet (brukes til belastning/ACWR og historikk). */
export type GarminActivity = {
  id: string;
  date: string;
  type: string;
  duration_s: number;
  distance_m: number;
  avg_hr: number;
  training_load: number;
};

export type GarminConnection = {
  connected: boolean;
  lastSync: string | null;
  garminUserId: string | null;
};

/**
 * Grensesnitt for Garmin-integrasjon. To implementasjoner:
 *   - LiveGarminProvider (Health API, OAuth) — kobles på til slutt
 *   - MockGarminProvider (GARMIN_MOCK=true) — realistisk 28d historikk
 */
export interface GarminProvider {
  getConnection(): Promise<GarminConnection>;
  /** Daglige, ferdig avledede + evaluerte rader (nyeste sist). */
  getDailyRecords(days: number): Promise<DailyRecord[]>;
  getActivities(days: number): Promise<GarminActivity[]>;
}
