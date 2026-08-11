import type { DailyRecord } from "@/lib/types";

/**
 * Enkel, deterministisk prognosemodell for et tidsmål.
 * Estimerer sluttid «nå» ut fra snittform (skår) siste 14 dager mot en
 * referanseform på 72. Bedre form → raskere estimat. Avviket klippes til
 * ±4 % slik at prognosen holder seg realistisk.
 *
 * Dette er en plassholdermodell inntil Gemini/faktiske testløp kobles på.
 */
export function predictFinishSeconds(
  targetTimeS: number,
  records: DailyRecord[],
): number {
  const window = records.slice(-14);
  if (window.length === 0) return targetTimeS;

  const avgScore =
    window.reduce((s, r) => s + r.score, 0) / window.length;

  const reference = 72;
  let deviationPct = (reference - avgScore) * 0.0012;
  deviationPct = Math.max(-0.04, Math.min(0.04, deviationPct));

  return Math.round(targetTimeS * (1 + deviationPct));
}
