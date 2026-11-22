import { GarminConnect } from "garmin-connect";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBodyBatteryNow } from "@/lib/garmin/bodyBattery";
import {
  isMfaError,
  isNotFoundError,
  isRateLimitError,
} from "@/lib/garmin/errors";
import type { DayMetrics, GarminSnapshot, Trafikklys } from "@/lib/types";
import { todayISO } from "@/lib/time";

export { formatGarminUserError } from "@/lib/garmin/errors";
export type { DayMetrics };

type OauthBundle = {
  oauth1: Record<string, unknown>;
  oauth2: Record<string, unknown>;
};

/** Innloggede Garmin-klienter per app-bruker (gjenbrukes mellom forespørsler). */
type Session = { client: GarminConnect; displayName: string | null };
const sessions = new Map<string, Session>();

/** Kastes når brukerens Garmin-tokens ikke virker og Garmin må kobles til på nytt. */
export class GarminReconnectRequiredError extends Error {
  constructor() {
    super("Garmin-tilkoblingen har utløpt. Koble til Garmin på nytt.");
    this.name = "GarminReconnectRequiredError";
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isAuthError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(msg);
}

async function loadTokensFromDb(
  userId: string,
): Promise<(OauthBundle & { displayName: string | null }) | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("garmin_tokens")
      .select("oauth1, oauth2, display_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return { oauth1: data.oauth1, oauth2: data.oauth2, displayName: data.display_name ?? null };
  } catch {
    return null;
  }
}

async function saveTokensToDb(userId: string, tokens: OauthBundle): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("garmin_tokens")
      .update({
        oauth1: tokens.oauth1,
        oauth2: tokens.oauth2,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } catch (err) {
    console.error("[garmin] Failed to persist tokens to Supabase:", err);
  }
}

/** Tokens virker ikke lenger: krev ny tilkobling (appen sendes til «Koble til Garmin»). */
async function markReconnectRequired(userId: string): Promise<void> {
  sessions.delete(userId);
  try {
    const admin = createAdminClient();
    await admin.from("garmin_tokens").update({ verified_at: null }).eq("user_id", userId);
  } catch (err) {
    console.error("[garmin] Failed to mark reconnect required:", err);
  }
}

function exportTokens(client: GarminConnect): OauthBundle {
  const exported = client.exportToken();
  return {
    oauth1: exported.oauth1 as unknown as Record<string, unknown>,
    oauth2: exported.oauth2 as unknown as Record<string, unknown>,
  };
}

async function getClient(userId: string): Promise<GarminConnect> {
  const cached = sessions.get(userId);
  if (cached) return cached.client;

  const stored = await loadTokensFromDb(userId);
  if (!stored) throw new GarminReconnectRequiredError();

  // Brukernavn/passord brukes ikke når vi laster lagrede tokens.
  const client = new GarminConnect({ username: "token", password: "token" });
  client.loadToken(stored.oauth1 as never, stored.oauth2 as never);
  try {
    // Sjekk at sesjonen virker (fornyer oauth2 automatisk ved behov).
    await client.getUserProfile();
  } catch (err) {
    if (isAuthError(err)) {
      console.warn("[garmin] Stored tokens rejected, reconnect required:", err);
      await markReconnectRequired(userId);
      throw new GarminReconnectRequiredError();
    }
    throw err;
  }
  sessions.set(userId, { client, displayName: stored.displayName });
  return client;
}

export type GarminConnectResult =
  | { ok: true; displayName: string }
  | { ok: false; reason: "invalid_credentials" | "mfa" | "rate_limited" | "unknown" };

/**
 * Kobler Garmin til brukeren: logger inn én gang med e-post/passord, bekrefter
 * sesjonen mot profilen og lagrer kun OAuth-tokens. Passordet lagres aldri.
 */
export async function connectGarminAccount(
  userId: string,
  username: string,
  password: string,
): Promise<GarminConnectResult> {
  const client = new GarminConnect({ username, password });
  try {
    await client.login();
  } catch (err) {
    if (isMfaError(err)) return { ok: false, reason: "mfa" };
    if (isRateLimitError(err)) return { ok: false, reason: "rate_limited" };
    const msg = String((err as Error)?.message ?? err).toLowerCase();
    if (/401|403|credential|password|unauthor|invalid/.test(msg)) {
      return { ok: false, reason: "invalid_credentials" };
    }
    console.error("[garmin] connect login failed", err);
    return { ok: false, reason: "unknown" };
  }

  let displayName: string;
  try {
    const profile = await client.getUserProfile();
    if (!profile?.displayName) throw new Error("Profil uten displayName");
    displayName = profile.displayName;
  } catch (err) {
    console.error("[garmin] connect verify failed", err);
    return { ok: false, reason: "unknown" };
  }

  const tokens = exportTokens(client);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("garmin_tokens").upsert(
    {
      oauth1: tokens.oauth1,
      oauth2: tokens.oauth2,
      user_id: userId,
      display_name: displayName,
      verified_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[garmin] connect save failed", error);
    return { ok: false, reason: "unknown" };
  }

  sessions.set(userId, { client, displayName });
  return { ok: true, displayName };
}

async function getDisplayName(userId: string, client: GarminConnect): Promise<string> {
  const session = sessions.get(userId);
  if (session?.displayName) return session.displayName;
  const profile = await client.getUserProfile();
  if (!profile?.displayName) throw new Error("Garmin-profilen mangler displayName");
  if (session) session.displayName = profile.displayName;
  return profile.displayName;
}

async function withGarmin<T>(
  userId: string,
  fn: (client: GarminConnect) => Promise<T>,
): Promise<T> {
  const run = async (client: GarminConnect) => {
    const result = await fn(client);
    try {
      await saveTokensToDb(userId, exportTokens(client));
    } catch {
      // ignore token export failures
    }
    return result;
  };

  const client = await getClient(userId);
  try {
    return await run(client);
  } catch (err) {
    if (isRateLimitError(err) || isNotFoundError(err)) throw err;
    if (isMfaError(err)) {
      console.error("[garmin] MFA required during request.", err);
      throw new Error(
        "Garmin MFA er påkrevd. Skru av MFA for kontoen og koble til Garmin på nytt.",
      );
    }
    if (!isAuthError(err)) throw err;
    // Prøv én gang til med tokens fra databasen (en annen instans kan ha fornyet dem).
    console.warn("[garmin] Request rejected, retrying with stored tokens:", err);
    sessions.delete(userId);
    return run(await getClient(userId));
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export async function fetchDailySnapshot(
  userId: string,
  date = todayISO(),
): Promise<GarminSnapshot> {
  return withGarmin(userId, async (client) => {
    const notes: string[] = [];
    const target = new Date(date + "T12:00:00");

    let resting_hr: number | null = null;
    let sleep_hours: number | null = null;
    let sleep_score: number | null = null;
    let hrv: number | null = null;
    let body_battery: number | null = null;
    let training_readiness: number | null = null;
    let stress: number | null = null;
    let training_load: number | null = null;
    const raw: Record<string, unknown> = {};

    try {
      const hr = await client.getHeartRate(target);
      resting_hr = (hr as { restingHeartRate?: number })?.restingHeartRate ?? null;
      raw.heartRate = hr;
    } catch (err) {
      notes.push("Kunne ikke hente hvilepuls");
      console.warn("[garmin] getHeartRate failed", err);
    }

    try {
      const sleep = await client.getSleepData(target);
      raw.sleep = sleep;
      const daily = (sleep as { dailySleepDTO?: { sleepTimeSeconds?: number; sleepScores?: { overall?: { value?: number } } } })
        ?.dailySleepDTO;
      if (daily?.sleepTimeSeconds) {
        sleep_hours = Math.round((daily.sleepTimeSeconds / 3600) * 10) / 10;
      }
      sleep_score = daily?.sleepScores?.overall?.value ?? null;
    } catch (err) {
      notes.push("Kunne ikke hente søvn");
      console.warn("[garmin] getSleepData failed", err);
    }

    // HRV – custom endpoint
    try {
      const hrvData = await client.get<Record<string, unknown>>(
        `https://connectapi.garmin.com/hrv-service/hrv/${date}`,
      );
      raw.hrv = hrvData;
      const summary = hrvData?.hrvSummary as { lastNightAvg?: number; weeklyAvg?: number } | undefined;
      hrv = summary?.lastNightAvg ?? null;
    } catch (err) {
      notes.push("Kunne ikke hente HRV");
      console.warn("[garmin] HRV fetch failed", err);
    }

    // Body Battery – query-param range endpoint
    try {
      const bb = await client.get<unknown[]>(
        "https://connectapi.garmin.com/wellness-service/wellness/bodyBattery/reports/daily",
        { params: { startDate: date, endDate: date } },
      );
      raw.bodyBattery = bb;
      body_battery = extractBodyBatteryNow(
        Array.isArray(bb) ? bb.find((row) => rowDate(row) === date) ?? bb[bb.length - 1] : null,
      );
    } catch (err) {
      notes.push("Kunne ikke hente Body Battery");
      console.warn("[garmin] Body Battery fetch failed", err);
    }

    // Training Readiness er ikke på alle kontoer — 404 er forventet.
    try {
      const rows = await client.get<unknown>(
        `https://connectapi.garmin.com/metrics-service/metrics/trainingreadiness/${date}/${date}`,
      );
      const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
      const first = list[0] as { score?: number; trainingReadiness?: number } | undefined;
      training_readiness =
        typeof first?.score === "number"
          ? first.score
          : typeof first?.trainingReadiness === "number"
            ? first.trainingReadiness
            : null;
      raw.trainingReadiness = rows;
    } catch (err) {
      if (!isNotFoundError(err)) {
        notes.push("Kunne ikke hente training readiness");
        console.warn("[garmin] readiness skipped");
      }
    }

    // 7-day averages for HRV / RHR
    const hrvSamples: number[] = [];
    const rhrSamples: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = daysAgo(i);
      const iso = formatDate(d);
      try {
        const hr = await client.getHeartRate(d);
        const r = (hr as { restingHeartRate?: number })?.restingHeartRate;
        if (typeof r === "number") rhrSamples.push(r);
      } catch {
        // skip
      }
      try {
        const hrvData = await client.get<Record<string, unknown>>(
          `https://connectapi.garmin.com/hrv-service/hrv/${iso}`,
        );
        const summary = hrvData?.hrvSummary as { lastNightAvg?: number } | undefined;
        if (typeof summary?.lastNightAvg === "number") hrvSamples.push(summary.lastNightAvg);
      } catch {
        // skip
      }
    }

    return {
      date,
      hrv,
      hrv_7d_avg: avg(hrvSamples),
      resting_hr,
      resting_hr_7d_avg: avg(rhrSamples),
      body_battery,
      sleep_hours,
      sleep_score,
      training_readiness,
      stress,
      training_load,
      notes,
      raw,
    };
  });
}

export async function fetchRecentActivities(userId: string, days = 90): Promise<
  Array<{
    date: string;
    startTime: string | null;
    name: string;
    distanceKm: number;
    durationSec: number;
    avgHr: number | null;
    elevationGainM: number | null;
    type: string;
  }>
> {
  return withGarmin(userId, async (client) => {
    const activities = await client.getActivities(0, 200);
    const cutoff = daysAgo(days).getTime();
    return (activities || [])
      .filter((a) => {
        const start = (a as { startTimeLocal?: string }).startTimeLocal;
        if (!start) return false;
        return new Date(start).getTime() >= cutoff;
      })
      .map((a) => {
        const act = a as {
          startTimeLocal?: string;
          activityName?: string;
          distance?: number;
          duration?: number;
          averageHR?: number;
          elevationGain?: number;
          activityType?: { typeKey?: string };
        };
        return {
          date: (act.startTimeLocal || "").slice(0, 10),
          startTime: act.startTimeLocal ?? null,
          name: act.activityName || "Aktivitet",
          distanceKm: Math.round(((act.distance || 0) / 1000) * 100) / 100,
          durationSec: Math.round(act.duration || 0),
          avgHr: act.averageHR ?? null,
          elevationGainM:
            typeof act.elevationGain === "number" ? Math.round(act.elevationGain) : null,
          type: act.activityType?.typeKey || "unknown",
        };
      })
      .filter((a) => a.type.toLowerCase().includes("run") || a.distanceKm > 0);
  });
}

export function summarizeActivities(
  activities: Awaited<ReturnType<typeof fetchRecentActivities>>,
): string {
  if (!activities.length) return "Ingen aktiviteter funnet i perioden.";
  const runs = activities.filter((a) => a.type.toLowerCase().includes("run"));
  const totalKm = runs.reduce((s, a) => s + a.distanceKm, 0);
  const recent = runs.slice(0, 15).map(
    (a) => `${a.date}: ${a.distanceKm} km på ${Math.round(a.durationSec / 60)} min (snittpuls ${a.avgHr ?? "—"})`,
  );
  return `Antall løpeturer: ${runs.length}, total distanse: ${Math.round(totalKm)} km.\nSiste økter:\n${recent.join("\n")}`;
}

/** Temporary traffic-light heuristic until detailed rules arrive. */
export function provisionalTrafficLight(day: {
  body_battery: number | null;
  sleep_score: number | null;
  hrv: number | null;
  recovery?: number | null;
}): Trafikklys {
  let score = 0;
  let signals = 0;

  if (day.body_battery != null) {
    signals += 1;
    if (day.body_battery >= 65) score += 1;
    else if (day.body_battery < 35) score -= 1;
  }
  if (day.sleep_score != null) {
    signals += 1;
    if (day.sleep_score >= 75) score += 1;
    else if (day.sleep_score < 50) score -= 1;
  }
  if (day.hrv != null) {
    signals += 1;
    // Absolute HRV is personal; treat very low as red-ish, higher as green-ish.
    if (day.hrv >= 50) score += 1;
    else if (day.hrv < 25) score -= 1;
  }
  if (day.recovery != null) {
    signals += 1;
    if (day.recovery >= 70) score += 1;
    else if (day.recovery < 40) score -= 1;
  }

  if (signals === 0) return "gult";
  if (score <= -1) return "rødt";
  if (score >= 1) return "grønt";
  return "gult";
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/** Inclusive date chunks of at most `maxDays` (Garmin stats endpoints often cap at 28). */
function dateChunks(startISO: string, endISO: string, maxDays = 28): Array<[string, string]> {
  const chunks: Array<[string, string]> = [];
  let cursor = new Date(startISO + "T12:00:00");
  const end = new Date(endISO + "T12:00:00");
  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + (maxDays - 1));
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push([formatDate(cursor), formatDate(chunkEnd)]);
    cursor = new Date(chunkEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return chunks;
}

function rowDate(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const r = row as { calendarDate?: string; date?: string };
  return (r.calendarDate || r.date || "").slice(0, 10);
}

type GarminGet = {
  get: <T>(url: string, data?: unknown) => Promise<T>;
};

async function fetchBodyBatteryByDate(
  client: GarminGet,
  startISO: string,
  endISO: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const [from, to] of dateChunks(startISO, endISO, 28)) {
    try {
      const bb = await client.get<unknown[]>(
        "https://connectapi.garmin.com/wellness-service/wellness/bodyBattery/reports/daily",
        { params: { startDate: from, endDate: to } },
      );
      if (!Array.isArray(bb)) continue;
      for (const row of bb) {
        const date = rowDate(row);
        const value = extractBodyBatteryNow(row);
        if (date && value != null) map.set(date, value);
      }
    } catch (err) {
      console.warn(`[garmin] body battery chunk ${from}..${to} failed`, err);
    }
  }
  return map;
}

async function fetchStepsByDate(
  client: GarminGet,
  startISO: string,
  endISO: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const [from, to] of dateChunks(startISO, endISO, 28)) {
    try {
      const rows = await client.get<
        Array<{
          calendarDate?: string;
          totalSteps?: number;
          values?: { totalSteps?: number; stepGoal?: number };
        }>
      >(`https://connectapi.garmin.com/usersummary-service/stats/steps/daily/${from}/${to}`);
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const date = rowDate(row);
        const steps = row.totalSteps ?? row.values?.totalSteps;
        if (date && typeof steps === "number") map.set(date, steps);
      }
    } catch (err) {
      console.warn(`[garmin] steps chunk ${from}..${to} failed`, err);
    }
  }
  return map;
}

async function fetchFloorsByDate(
  client: GarminGet,
  startISO: string,
  endISO: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const [from, to] of dateChunks(startISO, endISO, 28)) {
    try {
      const rows = await client.get<
        Array<{
          calendarDate?: string;
          values?: { wellnessFloorsAscended?: number; wellnessFloorsDescended?: number };
          wellnessFloorsAscended?: number;
        }>
      >(`https://connectapi.garmin.com/usersummary-service/stats/floors/daily/${from}/${to}`);
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const date = rowDate(row);
        const floors = row.values?.wellnessFloorsAscended ?? row.wellnessFloorsAscended;
        if (date && typeof floors === "number") {
          map.set(date, Math.round(floors * 10) / 10);
        }
      }
    } catch (err) {
      console.warn(`[garmin] floors chunk ${from}..${to} failed`, err);
    }
  }
  return map;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of [
      "entries",
      "values",
      "hrvSummaries",
      "dailySleepList",
      "calendarDays",
      "individualStats",
    ]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
  }
  return [];
}

async function fetchHrvByDate(
  client: GarminGet,
  startISO: string,
  endISO: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const [from, to] of dateChunks(startISO, endISO, 28)) {
    try {
      const rows = await client.get<unknown>(
        `https://connectapi.garmin.com/hrv-service/hrv/daily/${from}/${to}`,
      );
      const list = asRows(rows);
      for (const row of list) {
        if (!row || typeof row !== "object") continue;
        const r = row as {
          calendarDate?: string;
          hrvSummary?: { lastNightAvg?: number };
          lastNightAvg?: number;
        };
        const date = rowDate(r);
        const hrv = asNumber(r.hrvSummary?.lastNightAvg ?? r.lastNightAvg);
        if (date && hrv != null) map.set(date, hrv);
      }
    } catch (err) {
      console.warn(`[garmin] HRV chunk ${from}..${to} failed`, err);
    }
  }
  return map;
}

async function fetchSleepByDate(
  client: GarminGet,
  startISO: string,
  endISO: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const [from, to] of dateChunks(startISO, endISO, 28)) {
    try {
      // Gammelt endepunkt (wellness-service/stats/sleep/daily) gir 404; sleep-service
      // svarer med { overallStats, individualStats: [{ calendarDate, values: { sleepScore } }] }.
      const rows = await client.get<unknown>(
        `https://connectapi.garmin.com/sleep-service/stats/sleep/daily/${from}/${to}`,
      );
      const list = asRows(rows);
      for (const row of list) {
        if (!row || typeof row !== "object") continue;
        const r = row as {
          calendarDate?: string;
          values?: { sleepScore?: number; overallSleepScore?: number };
          sleepScore?: number;
          overallSleepScore?: number;
        };
        const date = rowDate(r);
        const score = asNumber(
          r.values?.sleepScore ?? r.values?.overallSleepScore ?? r.sleepScore ?? r.overallSleepScore,
        );
        if (date && score != null) map.set(date, score);
      }
    } catch (err) {
      console.warn(`[garmin] sleep chunk ${from}..${to} failed`, err);
    }
  }
  return map;
}

function extractReadinessScore(row: unknown): number | null {
  if (!row || typeof row !== "object") return null;
  const r = row as { score?: number; trainingReadiness?: number };
  return asNumber(r.score ?? r.trainingReadiness);
}

async function fetchReadinessByDate(
  client: GarminGet,
  startISO: string,
  endISO: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const [from, to] of dateChunks(startISO, endISO, 28)) {
    try {
      const rows = await client.get<unknown>(
        `https://connectapi.garmin.com/metrics-service/metrics/trainingreadiness/${from}/${to}`,
      );
      const list = asRows(rows);
      for (const row of list) {
        const date = rowDate(row);
        const score = extractReadinessScore(row);
        if (date && score != null) map.set(date, score);
      }
    } catch (err) {
      if (!isNotFoundError(err)) {
        console.warn(`[garmin] readiness chunk ${from}..${to} skipped`);
      }
    }
  }
  return map;
}

/** Last N days, or from `fromISO` through today when doing an incremental sync. */
export async function fetchHistoryMetrics(
  userId: string,
  days = 60,
  fromISO?: string,
): Promise<DayMetrics[]> {
  return withGarmin(userId, async (client) => {
    const end = new Date();
    const start = fromISO
      ? new Date(fromISO + "T12:00:00")
      : daysAgo(days - 1);
    if (start > end) start.setTime(end.getTime());
    const startISO = formatDate(start);
    const endISO = formatDate(end);

    const dates: string[] = [];
    // Sammenlign på dato, ikke klokkeslett: start står kl. 12, så i dag falt
    // ellers ut når synken kjørte før kl. 12.
    const cursor = new Date(start);
    while (formatDate(cursor) <= endISO) {
      dates.push(formatDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const [bbByDate, stepsByDate, floorsByDate, hrvByDate, sleepByDate, recByDate] =
      await Promise.all([
        fetchBodyBatteryByDate(client, startISO, endISO),
        fetchStepsByDate(client, startISO, endISO),
        fetchFloorsByDate(client, startISO, endISO),
        fetchHrvByDate(client, startISO, endISO),
        fetchSleepByDate(client, startISO, endISO),
        fetchReadinessByDate(client, startISO, endISO),
      ]);

    const kmByDate = new Map<string, number>();
    try {
      const activities = await client.getActivities(0, 400);
      const cutoff = start.getTime();
      for (const a of activities || []) {
        const act = a as {
          startTimeLocal?: string;
          distance?: number;
          activityType?: { typeKey?: string };
        };
        const startLocal = act.startTimeLocal;
        if (!startLocal) continue;
        const t = new Date(startLocal).getTime();
        if (t < cutoff) continue;
        const type = (act.activityType?.typeKey || "").toLowerCase();
        if (!type.includes("run") && !type.includes("trail")) continue;
        const date = startLocal.slice(0, 10);
        const km = (act.distance || 0) / 1000;
        kmByDate.set(date, Math.round(((kmByDate.get(date) || 0) + km) * 100) / 100);
      }
    } catch (err) {
      console.warn("[garmin] history activities failed", err);
    }

    // Dagens tall: bruk verdien nå (user summary), ikke morgentopp / døgnstart.
    const today = formatDate(end);
    if (dates.includes(today)) {
      try {
        // Garmin krever displayName i stien; uten den svarer endepunktet 403.
        const displayName = await getDisplayName(userId, client);
        const summary = await client.get<Record<string, unknown>>(
          `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${encodeURIComponent(displayName)}?calendarDate=${today}`,
        );
        const liveBb = extractBodyBatteryNow(summary);
        if (liveBb != null) bbByDate.set(today, liveBb);
        const liveSteps = asNumber(summary.totalSteps);
        if (liveSteps != null) stepsByDate.set(today, liveSteps);
        const liveFloors = asNumber(
          summary.floorsAscended ??
            summary.totalFloors ??
            (summary as { wellnessFloorsAscended?: number }).wellnessFloorsAscended,
        );
        if (liveFloors != null) floorsByDate.set(today, liveFloors);
      } catch (err) {
        console.warn("[garmin] current-day summary failed", err);
      }
    }

    const fallbackDates = dates.slice(-10);
    const missingSleep = fallbackDates.filter((d) => !sleepByDate.has(d));
    const missingHrv = fallbackDates.filter((d) => !hrvByDate.has(d));
    const missingRec = fallbackDates.filter((d) => !recByDate.has(d));

    await mapPool(missingSleep, 4, async (date) => {
      try {
        const sleep = await client.getSleepData(new Date(date + "T12:00:00"));
        const score =
          (sleep as { dailySleepDTO?: { sleepScores?: { overall?: { value?: number } } } })
            ?.dailySleepDTO?.sleepScores?.overall?.value ?? null;
        if (typeof score === "number") sleepByDate.set(date, score);
      } catch {
        // skip day
      }
    });

    await mapPool(missingHrv, 4, async (date) => {
      try {
        const hrvData = await client.get<Record<string, unknown>>(
          `https://connectapi.garmin.com/hrv-service/hrv/${date}`,
        );
        const summary = hrvData?.hrvSummary as { lastNightAvg?: number } | undefined;
        if (typeof summary?.lastNightAvg === "number") {
          hrvByDate.set(date, summary.lastNightAvg);
        }
      } catch {
        // skip day
      }
    });

    await mapPool(missingRec, 4, async (date) => {
      try {
        const rows = await client.get<unknown>(
          `https://connectapi.garmin.com/metrics-service/metrics/trainingreadiness/${date}/${date}`,
        );
        const list = asRows(rows);
        const row = list.find((r) => rowDate(r) === date) ?? list[0];
        const score = extractReadinessScore(row);
        if (score != null) recByDate.set(date, score);
      } catch {
        // skip day — 404 betyr at kontoen ikke har Training Readiness
      }
    });

    return dates.map((date) => {
      const body_battery = bbByDate.get(date) ?? null;
      const sleep_score = sleepByDate.get(date) ?? null;
      const hrv = hrvByDate.get(date) ?? null;
      const recovery = recByDate.get(date) ?? null;
      const distance_km = kmByDate.get(date) ?? 0;
      const steps = stepsByDate.get(date) ?? null;
      const floors = floorsByDate.get(date) ?? null;
      return {
        date,
        body_battery,
        sleep_score,
        hrv,
        distance_km,
        steps,
        floors,
        recovery,
        trafikklys: provisionalTrafficLight({
          body_battery,
          sleep_score,
          hrv,
          recovery,
        }),
      };
    });
  });
}
