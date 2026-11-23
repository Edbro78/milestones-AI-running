import type { Category, MetricKey } from "@/lib/types";

export type CategoryMeta = {
  key: Category;
  /** Nivå 1 (best) til 7 (full hvile). */
  level: number;
  /** Kort navn, f.eks. «Grønt pluss». */
  label: string;
  /** Dagens råd. */
  advice: string;
  /** Rammen/grensen for dagen. */
  limit: string;
  /** Bakgrunnsfarge for kortet. */
  bg: string;
  /** Kantfarge. */
  border: string;
  /** Tekstfarge. */
  text: string;
  /** Prikkfarge (trafikklys). */
  dot: string;
};

export const CATEGORIES: Record<Category, CategoryMeta> = {
  green_plus: {
    key: "green_plus",
    level: 1,
    label: "Grønt pluss",
    advice: "Kjør planlagt økt fullt ut, og legg gjerne på et ekstra drag.",
    limit: "Full intensitet tillatt",
    bg: "#ECFDF3",
    border: "#A6F4C5",
    text: "#067647",
    dot: "#079455",
  },
  green: {
    key: "green",
    level: 2,
    label: "Grønt standard",
    advice: "Gjennomfør økten som planlagt.",
    limit: "Planlagt volum og intensitet",
    bg: "#F6FEF9",
    border: "#A6F4C5",
    text: "#067647",
    dot: "#47CD89",
  },
  yellow: {
    key: "yellow",
    level: 3,
    label: "Gult standard",
    advice:
      "Gjennomfør, men unngå full utmattelse på siste drag. Ingen ekstra omganger.",
    limit: "Maks sone 3 / terskel",
    bg: "#FFFAEB",
    border: "#FEC84B",
    text: "#93370D",
    dot: "#EAAA08",
  },
  yellow_caution: {
    key: "yellow_caution",
    level: 4,
    label: "Gult forsiktig",
    advice: "Dropp intervallene. Rolig tur i sone 1–2, 30–50 min.",
    limit: "Ingen høyintensiv støtbelastning",
    bg: "#FFFCF5",
    border: "#FEC84B",
    text: "#B54708",
    dot: "#F79009",
  },
  red1: {
    key: "red1",
    level: 5,
    label: "Rødt 1",
    advice:
      "Lavintensiv jogg i sone 1, 20–35 min. Blodgjennomstrømning, ikke trening.",
    limit: "Under 70 % av makspuls",
    bg: "#FFFBFA",
    border: "#FDA29B",
    text: "#B42318",
    dot: "#F97066",
  },
  red2: {
    key: "red2",
    level: 6,
    label: "Rødt 2",
    advice: "Ingen løping. Sykkel, svømming eller ellipse på rolig innsats.",
    limit: "Null vektbærende støt",
    bg: "#FEF3F2",
    border: "#FDA29B",
    text: "#B42318",
    dot: "#D92D20",
  },
  red3: {
    key: "red3",
    level: 7,
    label: "Rødt 3",
    advice: "Ingen trening. Væske, mat og søvn.",
    limit: "Null belastning",
    bg: "#FEF3F2",
    border: "#FDA29B",
    text: "#912018",
    dot: "#7A271A",
  },
};

export type MetricMeta = {
  key: MetricKey;
  label: string;
  /** Enhet vist etter tallet, tom hvis ingen. */
  unit: string;
  /** Antall desimaler i visning. */
  decimals: number;
  /** Kort forklaring. */
  hint: string;
};

export const METRIC_META: Record<MetricKey, MetricMeta> = {
  hrv_z: {
    key: "hrv_z",
    label: "HRV-status",
    unit: "z",
    decimals: 2,
    hint: "z-skår mot 90-dagers baseline",
  },
  d_rhr: {
    key: "d_rhr",
    label: "Hvilepuls-avvik",
    unit: "bpm",
    decimals: 0,
    hint: "avvik fra 60-dagers baseline",
  },
  body_battery: {
    key: "body_battery",
    label: "Body Battery",
    unit: "",
    decimals: 0,
    hint: "ved oppvåkning",
  },
  sleep_score: {
    key: "sleep_score",
    label: "Søvnskår",
    unit: "",
    decimals: 0,
    hint: "Garmin søvnskår",
  },
  acwr: {
    key: "acwr",
    label: "Belastning",
    unit: "ACWR",
    decimals: 2,
    hint: "7-dag mot 28-dag",
  },
  recovery_hours: {
    key: "recovery_hours",
    label: "Restitusjon",
    unit: "t",
    decimals: 0,
    hint: "gjenstående restitusjonstid",
  },
  steps: {
    key: "steps",
    label: "Skritt",
    unit: "",
    decimals: 0,
    hint: "før øktstart",
  },
  stress: {
    key: "stress",
    label: "Stress",
    unit: "",
    decimals: 0,
    hint: "dagsstress-snitt",
  },
};

/** Rekkefølge for de åtte målingene i UI-et. */
export const METRIC_ORDER: MetricKey[] = [
  "hrv_z",
  "d_rhr",
  "body_battery",
  "sleep_score",
  "acwr",
  "recovery_hours",
  "steps",
  "stress",
];
