/** Siste Body Battery-avlesning (nå / slutt av dagen) — aldri morgentoppen. */
export function extractBodyBatteryNow(row: unknown): number | null {
  if (!row || typeof row !== "object") return null;
  const r = row as {
    bodyBatteryValuesArray?: Array<number | null>[];
    bodyBatteryMostRecentValue?: number;
    latestBodyBatteryValue?: number;
    bodyBatteryLatestValue?: number;
  };

  if (typeof r.bodyBatteryMostRecentValue === "number") {
    return r.bodyBatteryMostRecentValue;
  }
  if (typeof r.latestBodyBatteryValue === "number") {
    return r.latestBodyBatteryValue;
  }
  if (typeof r.bodyBatteryLatestValue === "number") {
    return r.bodyBatteryLatestValue;
  }

  const values = r.bodyBatteryValuesArray;
  if (Array.isArray(values) && values.length) {
    const samples = values
      .map((v) => {
        if (!Array.isArray(v) || typeof v[1] !== "number") return null;
        return {
          t: typeof v[0] === "number" ? v[0] : 0,
          level: v[1] as number,
        };
      })
      .filter((s): s is { t: number; level: number } => s != null);
    if (!samples.length) return null;
    samples.sort((a, b) => a.t - b.t);
    return samples[samples.length - 1].level;
  }

  return null;
}

type BbSample = { t: number; level: number };

function bbSamples(row: unknown): BbSample[] {
  const values = (row as { bodyBatteryValuesArray?: Array<number | null>[] } | null)
    ?.bodyBatteryValuesArray;
  if (!Array.isArray(values)) return [];
  return values
    .filter((v): v is [number, number] => Array.isArray(v) && typeof v[0] === "number" && typeof v[1] === "number")
    .map(([t, level]) => ({ t, level }))
    .sort((a, b) => a.t - b.t);
}

/** Lokal kl. 12 for dagen, i GMT-millisekunder (bruker radens lokal/GMT-forskyvning). */
function localNoonGmtMs(row: unknown, date: string): number {
  const r = row as { startTimestampGMT?: string; startTimestampLocal?: string } | null;
  const gmt = r?.startTimestampGMT ? Date.parse(r.startTimestampGMT + "Z") : NaN;
  const local = r?.startTimestampLocal ? Date.parse(r.startTimestampLocal + "Z") : NaN;
  const offset = Number.isFinite(gmt) && Number.isFinite(local) ? local - gmt : 0;
  return Date.parse(`${date}T12:00:00Z`) - offset;
}

/**
 * Body Battery ved starten av dagen: høyeste nivå etter nattens lading, før
 * dagens økt (GMT ms) eller før kl. 12 uten økt. Treningen påvirker den ikke.
 * Uten målinger før det tidspunktet returneres null.
 */
export function bodyBatteryMorning(
  row: unknown,
  date: string,
  workoutStartGmtMs: number | null,
): number | null {
  const samples = bbSamples(row);
  if (!samples.length) return null;
  const ref = Math.min(workoutStartGmtMs ?? Infinity, localNoonGmtMs(row, date));
  const before = samples.filter((s) => s.t <= ref);
  // Ingen måling før økten/kl. 12: starten av dagen er ukjent (fylles med snitt).
  if (!before.length) return null;
  return Math.max(...before.map((s) => s.level));
}
