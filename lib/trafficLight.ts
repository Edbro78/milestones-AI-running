import type {
  Category,
  Evaluation,
  Metrics,
  Subscores,
  Trigger,
} from "@/lib/types";

/** Vekt per delskår. Summerer til 1,0. */
export const WEIGHTS: Record<keyof Metrics, number> = {
  hrv_z: 0.25,
  d_rhr: 0.15,
  body_battery: 0.05,
  sleep_score: 0.15,
  acwr: 0.15,
  recovery_hours: 0.1,
  steps: 0.1,
  stress: 0.05,
};

/** Kategoriene sortert fra mildest til strengest. Indeks = strenghet. */
export const CATEGORY_ORDER: Category[] = [
  "green_plus",
  "green",
  "yellow",
  "yellow_caution",
  "red1",
  "red2",
  "red3",
];

const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));

/** Velg den strengeste av to kategorier (aldri mildere). */
function strictest(a: Category, b: Category): Category {
  return CATEGORY_ORDER.indexOf(a) >= CATEGORY_ORDER.indexOf(b) ? a : b;
}

/** Parasympatisk metning: lav HRV her er ikke et faresignal. */
export function isSaturated(m: Metrics): boolean {
  return m.d_rhr <= -3 && m.hrv_z < -0.5 && m.sleep_score >= 70;
}

/** Regn ut de åtte delskårene (hver klippet til 0–100). */
export function computeSubscores(m: Metrics): Subscores {
  const saturated = isSaturated(m);
  return {
    hrv_z: clamp(((m.hrv_z + 2) / 3) * 100 + (saturated ? 30 : 0)),
    d_rhr: clamp(100 - (m.d_rhr + 2) * 12.5),
    body_battery: clamp((m.body_battery / 80) * 100),
    sleep_score: clamp(((m.sleep_score - 30) / 55) * 100),
    acwr: clamp(
      100 -
        Math.max(0, m.acwr - 1.15) * 250 -
        Math.max(0, 0.8 - m.acwr) * 250,
    ),
    recovery_hours: clamp(100 - m.recovery_hours * 2),
    steps: clamp(100 - Math.max(0, m.steps - 8000) / 120),
    stress: clamp(100 - Math.max(0, m.stress - 20) * 2),
  };
}

/** Kategori kun ut fra totalskåren, før harde regler. */
export function categoryFromScore(score: number): Category {
  if (score >= 88) return "green_plus";
  if (score >= 75) return "green";
  if (score >= 62) return "yellow";
  if (score >= 50) return "yellow_caution";
  if (score >= 35) return "red1";
  if (score >= 20) return "red2";
  return "red3";
}

const isGreen = (c: Category) => c === "green_plus" || c === "green";

/**
 * Harde regler overstyrer skåren nedover (aldri oppover).
 * Returnerer alle utløste regler som lesbare begrunnelser.
 */
export function evaluateTriggers(
  m: Metrics,
  scoreCategory: Category,
): Trigger[] {
  const triggers: Trigger[] = [];

  if (m.d_rhr >= 7) {
    triggers.push({
      field: "d_rhr",
      forces: "red3",
      reason:
        "Sympato-adrenal aktivering, mulig feber eller dehydrering (ΔRHR ≥ 7 bpm).",
    });
  }
  if (m.hrv_z <= -2.5) {
    triggers.push({
      field: "hrv_z",
      forces: "red3",
      reason: "Ekstrem undertrykking av vagal tonus (HRV z ≤ −2,5).",
    });
  }
  if (m.sleep_score <= 40) {
    triggers.push({
      field: "sleep_score",
      forces: "red3",
      reason: "Alvorlig forstyrret søvnarkitektur (søvnskår ≤ 40).",
    });
  }
  if (m.body_battery < 25) {
    triggers.push({
      field: "body_battery",
      forces: "red3",
      reason: "Ingen metabolsk reserve for adaptasjon (Body Battery < 25).",
    });
  }
  if (m.recovery_hours > 60) {
    triggers.push({
      field: "recovery_hours",
      forces: "red3",
      reason: "Forrige økt er ikke reparert (restitusjon > 60 t).",
    });
  }

  if (m.acwr >= 1.75) {
    triggers.push({
      field: "acwr",
      forces: "red3",
      reason:
        "Løping sperret av hensyn til sener og beinvev (ACWR ≥ 1,75).",
    });
  } else if (m.acwr >= 1.5) {
    triggers.push({
      field: "acwr",
      forces: "red2",
      reason:
        "Løping sperret av hensyn til sener og beinvev (ACWR ≥ 1,50).",
    });
  }

  if (m.steps >= 25000) {
    triggers.push({
      field: "steps",
      forces: "red3",
      reason: "Ekstremt skrittvolum før økt (≥ 25 000 skritt).",
    });
  } else if (m.steps >= 20000) {
    triggers.push({
      field: "steps",
      forces: "red2",
      reason: "Svært høyt skrittvolum før økt (≥ 20 000 skritt).",
    });
  } else if (m.steps >= 16000 && isGreen(scoreCategory)) {
    triggers.push({
      field: "steps",
      forces: "yellow_caution",
      reason:
        "Høyt skrittvolum før økt (≥ 16 000 skritt) demper en grønn dag.",
    });
  }

  return triggers;
}

/**
 * Kjernefunksjonen: evaluer dagens åtte målinger til kategori, skår,
 * delskårer og utløste regler.
 */
export function evaluate(m: Metrics): Evaluation {
  const saturated = isSaturated(m);
  const subscores = computeSubscores(m);

  const rawScore = (Object.keys(WEIGHTS) as (keyof Metrics)[]).reduce(
    (sum, key) => sum + subscores[key] * WEIGHTS[key],
    0,
  );
  const score = Math.round(rawScore);

  const scoreCategory = categoryFromScore(score);
  const triggers = evaluateTriggers(m, scoreCategory);

  const category = triggers.reduce<Category>(
    (acc, t) => strictest(acc, t.forces),
    scoreCategory,
  );

  return { category, score, subscores, triggers, saturated };
}
