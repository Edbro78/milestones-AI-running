import { CATEGORIES, METRIC_META } from "@/lib/categories";
import { formatNumber, formatSigned } from "@/lib/format";
import type { SignalLight } from "@/lib/reportLight";
import type { DailyRecord } from "@/lib/types";
import {
  DISTANCE_LABEL,
  EFFORT_LABEL,
  isInterval,
  sessionSummary,
  type PlannedSession,
} from "@/lib/weekPlan";

/**
 * Deterministisk trener-tekst. Brukes som fallback når Gemini ikke er
 * tilkoblet ennå (eller hvis API-kallet feiler). Appen skal aldri stå tom.
 *
 * Når Gemini kobles på: send de samme dataene til modellen og la denne
 * funksjonen være fallback ved feil.
 */

export type SessionSuggestion = {
  warmup: string;
  main: string;
  cooldown: string;
  title?: string;
  note?: string;
  /** Fremhevet terskelråd, vises tydelig i øktforslaget. */
  emphasis?: string;
};

export const THRESHOLD_HR_BASE = 80;
export const THRESHOLD_HR_PUSH = 87;

function isGreenDay(category: DailyRecord["category"]): boolean {
  return category === "green" || category === "green_plus";
}

function allowsThreshold(category: DailyRecord["category"]): boolean {
  return isGreenDay(category) || category === "yellow";
}

function hrBpm(hrMax: number | null | undefined, pct: number): string {
  return hrMax && hrMax > 0 ? ` (${Math.round((hrMax * pct) / 100)} bpm)` : "";
}

/** Terskelpuls: mest på 80 % av maks; 87 % og litt over kun på grønne dager. */
export function thresholdHrGuidance(
  category: DailyRecord["category"],
  hrMax?: number | null,
): string {
  const at80 = hrBpm(hrMax, THRESHOLD_HR_BASE);
  const at87 = hrBpm(hrMax, THRESHOLD_HR_PUSH);
  if (isGreenDay(category)) {
    return `Viktig: løp mesteparten av terskelen på ${THRESHOLD_HR_BASE} % av makspuls${at80}. Dagen er grønn, så du kan pushe til ${THRESHOLD_HR_PUSH} %${at87} og litt over.`;
  }
  return `Viktig: løp mesteparten av terskelen på ${THRESHOLD_HR_BASE} % av makspuls${at80}. Ikke opp mot ${THRESHOLD_HR_PUSH} % i dag.`;
}

function thresholdHrCue(greenPush: boolean): string {
  return greenPush
    ? `${THRESHOLD_HR_BASE} % av makspuls, inntil ${THRESHOLD_HR_PUSH} % og litt over`
    : `${THRESHOLD_HR_BASE} % av makspuls`;
}

function roundKm(km: number): number {
  return Math.round(Math.max(3, km) * 10) / 10;
}

function plannedMain(
  planned: PlannedSession,
  km: number,
  allowInterval: boolean,
  greenPush: boolean,
): string {
  const label = `${DISTANCE_LABEL[planned.distance]}, ${EFFORT_LABEL[planned.effort].toLowerCase()}`;
  const hr = thresholdHrCue(greenPush);
  if (allowInterval && isInterval(planned.effort)) {
    const hard = planned.effort === "hard";
    if (planned.distance === "kort") {
      return hard
        ? `${formatNumber(km, 1)} km intervall: 8–10 × 400 m på ${hr} med 60–75 s jogg.pause. Dette er den planlagte ${label}-økta.`
        : `${formatNumber(km, 1)} km intervall: 5 × 800 m på ${hr} med 90 s pause. Planlagt ${label}.`;
    }
    if (planned.distance === "lang") {
      return hard
        ? `${formatNumber(km, 1)} km: 5 × 1600 m på ${hr} med 2 min pause, eller tilsvarende langintervaller. Planlagt ${label}.`
        : `${formatNumber(km, 1)} km: 4–5 × 8 min lett terskel på ${hr} med 2 min pause. Planlagt ${label}.`;
    }
    return hard
      ? `${formatNumber(km, 1)} km intervall: 5 × 1000 m på ${hr} med 90 s pause. Planlagt ${label}.`
      : `${formatNumber(km, 1)} km intervall: 4 × 6 min på ${hr} med 90 s pause. Planlagt ${label}.`;
  }
  return `${formatNumber(km, 1)} km jevn ${label} i sone 1–2.`;
}

function withThresholdEmphasis(
  suggestion: SessionSuggestion,
  today: DailyRecord,
  isThreshold: boolean,
  hrMax?: number | null,
): SessionSuggestion {
  if (!isThreshold) return suggestion;
  return {
    ...suggestion,
    emphasis: thresholdHrGuidance(today.category, hrMax),
  };
}

/**
 * Øktforslag fra ukeplanen, justert etter trafikklys.
 * Uten plan faller vi tilbake til kategori-økt.
 */
export function suggestSession(
  today: DailyRecord,
  planned?: PlannedSession | null,
  hrMax?: number | null,
): SessionSuggestion {
  const cat = CATEGORIES[today.category];
  const greenPush = isGreenDay(today.category);
  if (!planned) {
    return withThresholdEmphasis(
      suggestByCategory(today),
      today,
      allowsThreshold(today.category),
      hrMax,
    );
  }

  const wantInterval = isInterval(planned.effort);
  const planLine = `Planlagt i dag: ${sessionSummary(planned)}, ${formatNumber(planned.km, 1)} km.`;
  const threshold = wantInterval && allowsThreshold(today.category);

  let suggestion: SessionSuggestion;
  switch (today.category) {
    case "green_plus":
      suggestion = {
        title: sessionSummary(planned),
        note: `${planLine} Trafikklyset er sterkt — gjennomfør fullt, gjerne litt ekstra.`,
        warmup: "15 min rolig jogg i sone 1–2, deretter 4 × 20 s stigningsløp.",
        main: plannedMain(planned, roundKm(planned.km * 1.05), true, greenPush),
        cooldown: "10 min rolig nedjogg i sone 1.",
      };
      break;
    case "green":
      suggestion = {
        title: sessionSummary(planned),
        note: `${planLine} Trafikklyset er grønt — kjør økta som planlagt.`,
        warmup: "15 min rolig jogg i sone 1–2, 3 × 20 s stigningsløp.",
        main: plannedMain(planned, planned.km, true, greenPush),
        cooldown: "10 min rolig nedjogg i sone 1.",
      };
      break;
    case "yellow":
      suggestion = {
        title: sessionSummary(planned),
        note: `${planLine} Gult: gjennomfør, men uten å tømme deg.`,
        warmup: "12 min rolig jogg i sone 1–2.",
        main: wantInterval
          ? plannedMain(planned, roundKm(planned.km * 0.85), true, false) +
            " Dropp siste drag hvis følelsen blir sliten."
          : plannedMain(planned, roundKm(planned.km * 0.9), false, false),
        cooldown: "8 min rolig nedjogg.",
      };
      break;
    case "yellow_caution":
      suggestion = {
        title: sessionSummary(planned),
        note: `${planLine} Gult forsiktig: dropp intervall, hold det rolig.`,
        warmup: "10 min svært rolig jogg.",
        main: plannedMain(planned, roundKm(planned.km * 0.55), false, false),
        cooldown: "5 min gange og lette tøyninger.",
      };
      break;
    case "red1":
      suggestion = {
        title: sessionSummary(planned),
        note: `${planLine} Rødt: ikke den planlagte økta. Bare blodgjennomstrømning.`,
        warmup: "5 min gange over til rolig jogg.",
        main: "20–35 min lavintensiv jogg i sone 1, under 70 % av makspuls.",
        cooldown: "5 min gange.",
      };
      break;
    case "red2":
      suggestion = {
        title: sessionSummary(planned),
        note: `${planLine} Rødt: ingen løping i dag.`,
        warmup: "10 min svært rolig oppvarming på sykkel/ellipse.",
        main: "30 min rolig sykkel, svømming eller ellipse. Null vektbærende støt.",
        cooldown: "5 min rolig nedtrapping.",
      };
      break;
    case "red3":
    default:
      suggestion = {
        title: sessionSummary(planned),
        note: `${planLine} Trafikklyset sier full hvile.`,
        warmup: "Ingen oppvarming.",
        main: `Ingen trening i dag. ${cat.advice}`,
        cooldown: "Prioriter væske, mat og søvn.",
      };
  }
  return withThresholdEmphasis(suggestion, today, threshold, hrMax);
}

/**
 * Dagens økt styres av trafikklyset på Start (60-dagers sammenligning):
 * grønt = ambisiøst og fremoverlent, gult og rødt = tydelig forsiktig.
 */
export function categoryForLight(light: SignalLight): DailyRecord["category"] {
  if (light === "green") return "green_plus";
  if (light === "yellow") return "yellow_caution";
  return "red1";
}

export function suggestSessionForLight(
  today: DailyRecord,
  light: SignalLight,
  planned?: PlannedSession | null,
  hrMax?: number | null,
): { category: DailyRecord["category"]; suggestion: SessionSuggestion } {
  const category = categoryForLight(light);
  return {
    category,
    suggestion: suggestSession({ ...today, category }, planned, hrMax),
  };
}

function suggestByCategory(today: DailyRecord): SessionSuggestion {
  const cat = CATEGORIES[today.category];
  const hr = thresholdHrCue(isGreenDay(today.category));
  switch (today.category) {
    case "green_plus":
      return {
        warmup: "15 min rolig jogg i sone 1–2, deretter 4 × 20 s stigningsløp.",
        main: `6 × 1000 m i terskel på ${hr} med 90 s pause. Legg gjerne på et ekstra drag hvis følelsen er god.`,
        cooldown: "10 min rolig nedjogg i sone 1.",
      };
    case "green":
      return {
        warmup: "15 min rolig jogg i sone 1–2, 3 × 20 s stigningsløp.",
        main: `5 × 1000 m i terskel på ${hr} med 90 s pause. Hold planlagt volum.`,
        cooldown: "10 min rolig nedjogg i sone 1.",
      };
    case "yellow":
      return {
        warmup: "12 min rolig jogg i sone 1–2.",
        main: `35 min jevn lett terskel på ${hr}. Unngå full utmattelse på siste del, ingen ekstra omganger.`,
        cooldown: "8 min rolig nedjogg.",
      };
    case "yellow_caution":
      return {
        warmup: "10 min svært rolig jogg.",
        main: "30–50 min rolig tur i sone 1–2. Ingen intervaller, ingen støtbelastning.",
        cooldown: "5 min gange og lette tøyninger.",
      };
    case "red1":
      return {
        warmup: "5 min gange over til rolig jogg.",
        main: "20–35 min lavintensiv jogg i sone 1, under 70 % av makspuls. Blodgjennomstrømning, ikke trening.",
        cooldown: "5 min gange.",
      };
    case "red2":
      return {
        warmup: "10 min svært rolig oppvarming på sykkel/ellipse.",
        main: "30 min rolig sykkel, svømming eller ellipse. Null vektbærende støt.",
        cooldown: "5 min rolig nedtrapping.",
      };
    case "red3":
    default:
      return {
        warmup: "Ingen oppvarming.",
        main: `Ingen trening i dag. ${cat.advice}`,
        cooldown: "Prioriter væske, mat og søvn.",
      };
  }
}

/** Enkel, deterministisk svar-generator for fri chat. */
export function coachReply(
  question: string,
  today: DailyRecord,
  planned?: PlannedSession | null,
  hrMax?: number | null,
): string {
  const cat = CATEGORIES[today.category];
  const q = question.toLowerCase();
  const planBit = planned
    ? ` Planlagt i dag er ${sessionSummary(planned)} (${formatNumber(planned.km, 1)} km).`
    : "";

  const intensityWords = ["intervall", "terskel", "hardt", "fort", "race", "tempo"];
  if (intensityWords.some((w) => q.includes(w))) {
    if (["red1", "red2", "red3", "yellow_caution"].includes(today.category)) {
      return `Ikke i dag. Dagens ramme er ${cat.label.toLowerCase()}: ${cat.limit.toLowerCase()}. ${cat.advice}`;
    }
    return `Det er rom for det innenfor ${cat.label.toLowerCase()}. ${thresholdHrGuidance(today.category, hrMax)} ${cat.advice} Hold deg til ${cat.limit.toLowerCase()}.${planBit}`;
  }

  if (q.includes("hvile") || q.includes("fri") || q.includes("pause")) {
    if (["red2", "red3"].includes(today.category)) {
      return `Ja. Kroppen ber om hvile i dag (${cat.label.toLowerCase()}). ${cat.advice}`;
    }
    return `Du trenger ikke full hvile, men hold det lett: ${cat.advice}`;
  }

  return `Dagens kategori er ${cat.label.toLowerCase()} (skår ${today.score}/100). ${cat.advice} Ramme: ${cat.limit.toLowerCase()}.${planBit}`;
}

/** Deterministisk ukesoppsummering med enkel trendanalyse. */
export function weeklyReport(records: DailyRecord[]): string {
  const week = records.slice(-7);
  if (week.length === 0) return "Ingen data for uken ennå.";

  const avgScore = Math.round(
    week.reduce((s, r) => s + r.score, 0) / week.length,
  );
  const avgHrv =
    week.reduce((s, r) => s + r.metrics.hrv_z, 0) / week.length;
  const avgRhr =
    week.reduce((s, r) => s + r.metrics.d_rhr, 0) / week.length;
  const lastAcwr = week[week.length - 1].metrics.acwr;

  const prev = records.slice(-14, -7);
  const prevAvg =
    prev.length > 0
      ? prev.reduce((s, r) => s + r.score, 0) / prev.length
      : avgScore;
  const trend = avgScore - prevAvg;
  const trendText =
    trend > 3
      ? "Formen peker oppover mot forrige uke."
      : trend < -3
        ? "Formen er lavere enn forrige uke."
        : "Formen er stabil mot forrige uke.";

  const redDays = week.filter((r) => r.category.startsWith("red")).length;
  const greenDays = week.filter((r) => r.category.startsWith("green")).length;

  const acwrNote =
    lastAcwr >= 1.5
      ? `ACWR er høy (${formatNumber(lastAcwr, 2)}) — trapp ned volum de neste dagene for å beskytte sener og beinvev.`
      : lastAcwr < 0.8
        ? `ACWR er lav (${formatNumber(lastAcwr, 2)}) — du tåler å øke belastningen gradvis.`
        : `ACWR ligger i trygt vindu (${formatNumber(lastAcwr, 2)}).`;

  const hrvNote =
    avgHrv < -0.5
      ? "HRV ligger under baseline i snitt — nervesystemet er noe belastet."
      : avgHrv > 0.5
        ? "HRV ligger over baseline — god parasympatisk balanse."
        : "HRV er nær baseline.";

  const rhrNote =
    avgRhr >= 3
      ? `Hvilepulsen er ${formatSigned(Math.round(avgRhr))} bpm over baseline — et tegn på ufullstendig restitusjon.`
      : `Hvilepulsen holder seg nær baseline (${formatSigned(Math.round(avgRhr))} bpm).`;

  const advice =
    redDays >= 2
      ? "Legg inn mer rolig volum og prioriter søvn neste uke."
      : greenDays >= 4
        ? "Grunnlaget er godt — du kan holde planlagt progresjon neste uke."
        : "Hold en balansert uke med to kvalitetsøkter og resten rolig.";

  return [
    `Snittskår denne uken er ${avgScore}/100. ${trendText}`,
    `${hrvNote} ${rhrNote}`,
    acwrNote,
    `${greenDays} grønne og ${redDays} røde dager. ${METRIC_META.acwr.label}: følg utviklingen.`,
    `Neste uke: ${advice}`,
  ].join("\n\n");
}
