import type { DailyRecord } from "@/lib/types";
import { todayISO } from "@/lib/time";

const STORAGE_KEY = "milestones_garmin_records_v1";
const KEEP_DAYS = 60;

export type StoredGarminSync = {
  lastSync: string;
  records: DailyRecord[];
};

function dateList(fromISO: string, toISO: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(fromISO + "T12:00:00");
  const end = new Date(toISO + "T12:00:00");
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function daysAgoISO(n: number, from = todayISO()): string {
  const d = new Date(from + "T12:00:00");
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function mergeRecords(
  existing: DailyRecord[],
  incoming: DailyRecord[],
  keepDays = KEEP_DAYS,
): DailyRecord[] {
  const map = new Map<string, DailyRecord>();
  for (const row of existing) map.set(row.date, row);
  for (const row of incoming) {
    const prev = map.get(row.date);
    // Behold kjente løpeturer når den nye raden ikke har hentet dem.
    map.set(row.date, row.runs === undefined && prev?.runs ? { ...row, runs: prev.runs } : row);
  }
  const cutoff = daysAgoISO(keepDays - 1);
  return [...map.values()]
    .filter((row) => row.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Første dato i 60-dagersvinduet som mangler, ellers i dag (alltid oppdatert).
 * `null` = ingen cache, hent hele vinduet.
 */
export function nextFetchFrom(
  records: DailyRecord[],
  today = todayISO(),
): string | null {
  if (!records.length) return null;
  const have = new Set(records.map((r) => r.date));
  const windowStart = daysAgoISO(KEEP_DAYS - 1, today);
  for (const date of dateList(windowStart, today)) {
    if (date === today) return today;
    if (!have.has(date)) return date;
  }
  return today;
}

export function loadLocalRecords(): StoredGarminSync | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGarminSync;
    if (!Array.isArray(parsed.records) || !parsed.records.length) return null;
    return {
      lastSync: parsed.lastSync ?? null,
      records: parsed.records,
    };
  } catch {
    return null;
  }
}

export function saveLocalRecords(
  records: DailyRecord[],
  lastSync: string | null,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ lastSync, records }),
  );
}
