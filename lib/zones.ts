/** Marius Bakken-inspirert sonesystem for løping */

export const TRAINING_ZONES = {
  rolig: {
    name: "Rolig / grunntrening",
    description:
      "Lav intensitet. Bygger aerob base. Hold deg komfortabelt i lav sone – snakkefart.",
    pctOfMaxHr: { min: 60, max: 75 },
  },
  terskel: {
    name: "Terskel",
    description:
      "Normalt ca. 80 % av maxpuls. Ved grønt trafikklys og gode forhold kan intensiteten justeres opp mot 87 %.",
    pctOfMaxHr: { min: 78, max: 87, default: 80 },
  },
  intervall: {
    name: "Intervall / VO2max",
    description:
      "Høyere soner. Korte, harde drag med god restitusjon mellom. Kun ved grønt eller stabilt gult lys.",
    pctOfMaxHr: { min: 88, max: 98 },
  },
} as const;

export function zoneGuidanceText(maxHr?: number | null): string {
  const max = maxHr ?? null;
  const fmt = (pct: number) => (max ? `${Math.round((max * pct) / 100)} bpm (${pct}%)` : `${pct}% av maxpuls`);

  return [
    `Rolig/grunntrening: ${fmt(TRAINING_ZONES.rolig.pctOfMaxHr.min)}–${fmt(TRAINING_ZONES.rolig.pctOfMaxHr.max)}. ${TRAINING_ZONES.rolig.description}`,
    `Terskel: normalt ${fmt(TRAINING_ZONES.terskel.pctOfMaxHr.default)}, kan gå mot ${fmt(TRAINING_ZONES.terskel.pctOfMaxHr.max)} ved grønt lys. ${TRAINING_ZONES.terskel.description}`,
    `Intervall/VO2max: ${fmt(TRAINING_ZONES.intervall.pctOfMaxHr.min)}–${fmt(TRAINING_ZONES.intervall.pctOfMaxHr.max)}. ${TRAINING_ZONES.intervall.description}`,
  ].join("\n");
}
