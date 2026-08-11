import { CATEGORIES, METRIC_META } from "@/lib/categories";
import { formatNumber, formatSigned } from "@/lib/format";
import type { DailyRecord } from "@/lib/types";

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
};

/** Konkret øktforslag innenfor dagens ramme. */
export function suggestSession(today: DailyRecord): SessionSuggestion {
  const cat = CATEGORIES[today.category];
  switch (today.category) {
    case "green_plus":
      return {
        warmup: "15 min rolig jogg i sone 1–2, deretter 4 × 20 s stigningsløp.",
        main: "6 × 1000 m i terskelfart (sone 4) med 90 s pause. Legg gjerne på et ekstra drag hvis følelsen er god.",
        cooldown: "10 min rolig nedjogg i sone 1.",
      };
    case "green":
      return {
        warmup: "15 min rolig jogg i sone 1–2, 3 × 20 s stigningsløp.",
        main: "5 × 1000 m i terskelfart (sone 4) med 90 s pause. Hold planlagt volum.",
        cooldown: "10 min rolig nedjogg i sone 1.",
      };
    case "yellow":
      return {
        warmup: "12 min rolig jogg i sone 1–2.",
        main: "35 min jevnt i sone 3 / lett terskel. Unngå full utmattelse på siste del, ingen ekstra omganger.",
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
export function coachReply(question: string, today: DailyRecord): string {
  const cat = CATEGORIES[today.category];
  const q = question.toLowerCase();

  const intensityWords = ["intervall", "terskel", "hardt", "fort", "race", "tempo"];
  if (intensityWords.some((w) => q.includes(w))) {
    if (["red1", "red2", "red3", "yellow_caution"].includes(today.category)) {
      return `Ikke i dag. Dagens ramme er ${cat.label.toLowerCase()}: ${cat.limit.toLowerCase()}. ${cat.advice}`;
    }
    return `Det er rom for det innenfor ${cat.label.toLowerCase()}. ${cat.advice} Hold deg til ${cat.limit.toLowerCase()}.`;
  }

  if (q.includes("hvile") || q.includes("fri") || q.includes("pause")) {
    if (["red2", "red3"].includes(today.category)) {
      return `Ja. Kroppen ber om hvile i dag (${cat.label.toLowerCase()}). ${cat.advice}`;
    }
    return `Du trenger ikke full hvile, men hold det lett: ${cat.advice}`;
  }

  return `Dagens kategori er ${cat.label.toLowerCase()} (skår ${today.score}/100). ${cat.advice} Ramme: ${cat.limit.toLowerCase()}.`;
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
