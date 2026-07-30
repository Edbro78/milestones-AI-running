/** Parse time strings like "2:59:59" or "29:30" to seconds */
export function parseDurationToSeconds(value: string): number | null {
  const cleaned = value.trim().replace(",", ".");
  if (!cleaned) return null;

  // Pure number treated as seconds if large, or minutes if small? Prefer hh:mm:ss / mm:ss
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const parts = cleaned.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return null;

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return null;
}

export function formatSeconds(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

export function isTimeMetric(metric: string): boolean {
  const m = metric.toLowerCase();
  return m.includes("tid") || m.includes("time") || m.includes("pace") || m.includes("min");
}

/** Convert estimate string to a comparable numeric Y value */
export function estimateToNumber(value: string | null | undefined, metric: string): number | null {
  if (!value) return null;
  if (isTimeMetric(metric) || value.includes(":")) {
    return parseDurationToSeconds(value);
  }
  const n = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function formatEstimate(value: number, metric: string): string {
  if (isTimeMetric(metric) || value > 100) {
    // Heuristic: large values likely seconds for race times
    if (isTimeMetric(metric) || value >= 60) {
      return formatSeconds(value);
    }
  }
  return String(Math.round(value * 10) / 10);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsISO(dateISO: string, months: number): string {
  const d = new Date(dateISO + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function maxTargetDate(startDate: string): string {
  return addMonthsISO(startDate, 6);
}
