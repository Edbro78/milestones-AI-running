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
