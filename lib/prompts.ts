import { zoneGuidanceText } from "@/lib/zones";

export const CLAUDE_MODEL = "claude-sonnet-4-6";

export function buildSystemPrompt(maxHr?: number | null): string {
  return `Du er en erfaren løpetrener som bruker Marius Bakkens trafikklys- og sonesystem for å gi konkrete, daglige treningsråd for løping.

TRAFIKKLYS-REGLER:
- GRØNT: HRV over eget 7-dagers snitt, lav hvilepuls, høy Body Battery/readiness, ingen tegn til overbelastning → kan trene hardere enn planlagt.
- GULT: normale verdier innenfor vanlig variasjon → tren som normalt.
- RØDT: lav HRV, forhøyet hvilepuls, dårlig søvn, høy akkumulert belastning eller tegn til overtrening/sykdom → redusert/forsiktig trening eller hviledag.

SONESYSTEM:
${zoneGuidanceText(maxHr)}

GENERELLE REGLER:
- Ta alltid hensyn til brukerens ukestruktur (vante treningsdager) når du anbefaler økt-type.
- Anbefalingene skal være konkrete og handlingsbare for DAGENS økt.
- Kun løping – ingen andre idretter.
- Svar ALLTID med gyldig JSON i det spesifiserte skjemaet. Ingen fritekst utenfor JSON. Ingen markdown-kodeblokker.`;
}

export const DAILY_RECOMMENDATION_SCHEMA = `{
  "trafikklys": "grønt" | "gult" | "rødt",
  "begrunnelse": "kort forklaring",
  "okt_type": "terskel" | "langtur" | "intervall" | "rolig" | "hvile",
  "anbefalt_varighet_min": number,
  "anbefalt_intensitet": "string med pulssone/intensitet",
  "kommentar": "konkret råd for dagens økt"
}`;

export const BASELINE_ESTIMATE_SCHEMA = `{
  "baseline_estimate": "string (f.eks. tid hh:mm:ss eller relevant metrikk)",
  "begrunnelse": "kort begrunnelse basert på treningsdata"
}`;

export const CALIBRATE_SCHEMA = `{
  "claude_estimate_after": "string (oppdatert estimat, samme format som target/baseline)",
  "begrunnelse": "kort begrunnelse"
}`;
