export type Trafikklys = "grønt" | "gult" | "rødt";

export type OktType = "terskel" | "langtur" | "intervall" | "rolig" | "hvile";

export type MilestoneStatus = "aktiv" | "fullført";

export interface Profile {
  id: string;
  weekly_structure: string;
  max_hr: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  title: string;
  target_metric: string;
  target_value: string;
  start_date: string;
  target_date: string;
  baseline_estimate: string | null;
  status: MilestoneStatus;
  created_at: string;
}

export interface TestRun {
  id: string;
  milestone_id: string;
  date: string;
  distance_km: number;
  duration_seconds: number;
  avg_hr: number | null;
  claude_estimate_after: string | null;
  created_at: string;
}

export interface DailyRecommendation {
  trafikklys: Trafikklys;
  begrunnelse: string;
  okt_type: OktType;
  anbefalt_varighet_min: number;
  anbefalt_intensitet: string;
  kommentar: string;
}

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

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  garmin_snapshot: GarminSnapshot;
  trafikklys: Trafikklys;
  claude_recommendation: DailyRecommendation | null;
  created_at: string;
}
