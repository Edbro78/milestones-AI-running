/**
 * Norsk formatering (nb-NO): mellomrom som tusenskille, komma som desimal,
 * datoer DD.MM.ÅÅÅÅ.
 */

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Signert tall, f.eks. «+3» eller «−2» (ekte minustegn). */
export function formatSigned(value: number, decimals = 0): string {
  const s = formatNumber(Math.abs(value), decimals);
  if (value > 0) return `+${s}`;
  if (value < 0) return `−${s}`;
  return s;
}

/** ISO-dato (YYYY-MM-DD) → DD.MM.ÅÅÅÅ. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Kort ukedag + dag, f.eks. «man. 11.». */
export function formatShortDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = new Intl.DateTimeFormat("nb-NO", { weekday: "short" }).format(
    date,
  );
  return `${weekday} ${date.getDate()}.`;
}

/** Sekunder → «t:mm:ss» eller «mm:ss». */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Sekunder per km → «m:ss/km». */
export function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

/** «HH:mm:ss» → sekunder. */
export function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

/** Dager mellom i dag og en fremtidig ISO-dato (kan bli negativ). */
export function daysUntil(iso: string, from = new Date()): number {
  const target = new Date(`${iso}T00:00:00`);
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  const ms = target.getTime() - base.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Km denne dagen — strukturert felt, ellers parse fra «12,3 km» i completed. */
export function recordDistanceKm(record: {
  distanceKm?: number;
  completed?: string | null;
}): number {
  if (typeof record.distanceKm === "number" && Number.isFinite(record.distanceKm)) {
    return Math.max(0, record.distanceKm);
  }
  const match = record.completed?.match(/(\d+(?:[.,]\d+)?)\s*km/i);
  if (!match) return 0;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
