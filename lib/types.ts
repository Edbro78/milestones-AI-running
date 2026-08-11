/**
 * Delte typer for trafikklys-algoritmen og Garmin-data.
 */

/** De åtte inndataene per dag, hentet/avledet fra Garmin. */
export type Metrics = {
  /** HRV-status som z-skår mot 90-dagers baseline. */
  hrv_z: number;
  /** Avvik i hvilepuls (bpm) fra baseline. */
  d_rhr: number;
  /** Body Battery ved oppvåkning (0–100). */
  body_battery: number;
  /** Garmin søvnskår (0–100). */
  sleep_score: number;
  /** 7-dagers mot 28-dagers belastning (EPOC). */
  acwr: number;
  /** Gjenstående restitusjonstid i timer. */
  recovery_hours: number;
  /** Skritt før øktstart. */
  steps: number;
  /** Dagsstress-snitt (0–100). */
  stress: number;
};

export type MetricKey = keyof Metrics;

/** Kategorinøkler, sortert fra mildest (0) til strengest (6). */
export type Category =
  | "green_plus"
  | "green"
  | "yellow"
  | "yellow_caution"
  | "red1"
  | "red2"
  | "red3";

export type Subscores = Record<MetricKey, number>;

export type Trigger = {
  /** Feltet som utløste regelen. */
  field: MetricKey;
  /** Kategorien regelen tvinger fram. */
  forces: Category;
  /** Lesbar begrunnelse vist i UI-et. */
  reason: string;
};

export type Evaluation = {
  category: Category;
  /** Totalskår 0–100 (avrundet). */
  score: number;
  subscores: Subscores;
  triggers: Trigger[];
  /** Parasympatisk metning oppdaget. */
  saturated: boolean;
};

/** En daglig rad med rådata + evaluering, brukt gjennom appen. */
export type DailyRecord = {
  /** ISO-dato (YYYY-MM-DD). */
  date: string;
  metrics: Metrics;
  category: Category;
  score: number;
  triggers: Trigger[];
  source: "garmin" | "manual";
  /** Gjennomført økt (fritekst), null hvis ingen. */
  completed?: string | null;
};

/* ---- Typer brukt av eksisterende Garmin-klient (garmin-connect) ---- */

export type Trafikklys = "grønt" | "gult" | "rødt";

export interface GarminSnapshot {
  date: string;
  hrv?: number | null;
  hrv_7d_avg?: number | null;
  resting_hr?: number | null;
  resting_hr_7d_avg?: number | null;
  body_battery?: number | null;
  sleep_hours?: number | null;
  sleep_score?: number | null;
  training_readiness?: number | null;
  stress?: number | null;
  training_load?: number | null;
  notes?: string[];
  raw?: Record<string, unknown>;
}

export interface TrafficLightResult {
  trafikklys: Trafikklys;
  begrunnelse: string;
  triggers: string[];
}

export interface DayMetrics {
  date: string;
  body_battery: number | null;
  sleep_score: number | null;
  hrv: number | null;
  distance_km: number;
  steps: number | null;
  floors: number | null;
  trafikklys: Trafikklys;
}
