import { GarminConnect } from "garmin-connect";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DayMetrics, GarminSnapshot, Trafikklys } from "@/lib/types";
import { todayISO } from "@/lib/time";

export type { DayMetrics };

type OauthBundle = {
  oauth1: Record<string, unknown>;
  oauth2: Record<string, unknown>;
};

let memoryClient: GarminConnect | null = null;
let memoryTokens: OauthBundle | null = null;

function getCredentials() {
  const username = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("Missing GARMIN_EMAIL or GARMIN_PASSWORD");
  }
  return { username, password };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isMfaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /mfa|multi.?factor|totp|verification code|2fa/i.test(msg);
}

async function loadTokensFromDb(): Promise<OauthBundle | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("garmin_tokens")
      .select("oauth1, oauth2")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return null;
    return { oauth1: data.oauth1, oauth2: data.oauth2 };
  } catch {
    return null;
  }
}

async function saveTokensToDb(tokens: OauthBundle): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("garmin_tokens").upsert({
      id: 1,
      oauth1: tokens.oauth1,
      oauth2: tokens.oauth2,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[garmin] Failed to persist tokens to Supabase:", err);
  }
}

function exportTokens(client: GarminConnect): OauthBundle {
  const exported = client.exportToken();
  return {
    oauth1: exported.oauth1 as unknown as Record<string, unknown>,
    oauth2: exported.oauth2 as unknown as Record<string, unknown>,
  };
}

async function loginFresh(): Promise<GarminConnect> {
  const credentials = getCredentials();
  const client = new GarminConnect(credentials);
  try {
    await client.login();
  } catch (err) {
    if (isMfaError(err)) {
      console.error(
        "[garmin] MFA required. This app has no MFA UI. Disable MFA for the Garmin account used in GARMIN_EMAIL, or complete MFA manually and re-export tokens.",
        err,
      );
      throw new Error(
        "Garmin MFA er påkrevd. Skru av MFA for kontoen eller løs MFA manuelt – se serverloggen.",
      );
    }
    throw err;
  }
  const tokens = exportTokens(client);
  memoryTokens = tokens;
  await saveTokensToDb(tokens);
  memoryClient = client;
  return client;
}

async function getClient(): Promise<GarminConnect> {
  if (memoryClient && memoryTokens) {
    return memoryClient;
  }

  const stored = memoryTokens ?? (await loadTokensFromDb());
  if (stored) {
    try {
      const client = new GarminConnect(getCredentials());
      client.loadToken(
        stored.oauth1 as never,
        stored.oauth2 as never,
      );
      // Probe session
      await client.getUserProfile();
      memoryClient = client;
      memoryTokens = stored;
      return client;
    } catch (err) {
      console.warn("[garmin] Stored token expired or invalid, re-logging in:", err);
      memoryClient = null;
      memoryTokens = null;
    }
  }

  return loginFresh();
}

async function withGarmin<T>(fn: (client: GarminConnect) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    const result = await fn(client);
    try {
      const tokens = exportTokens(client);
      memoryTokens = tokens;
      await saveTokensToDb(tokens);
    } catch {
      // ignore token export failures
    }
    return result;
  } catch (err) {
    if (isMfaError(err)) {
      console.error(
        "[garmin] MFA required during request. Disable MFA or resolve manually.",
        err,
      );
      throw new Error(
        "Garmin MFA er påkrevd. Skru av MFA for kontoen eller løs MFA manuelt – se serverloggen.",
      );
    }
    // Retry once with fresh login on auth failures
    console.warn("[garmin] Request failed, retrying with fresh login:", err);
    memoryClient = null;
    memoryTokens = null;
    const fresh = await loginFresh();
    return fn(fresh);
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export async function fetchDailySnapshot(date = todayISO()): Promise<GarminSnapshot> {
  return withGarmin(async (client) => {
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

    // Body Battery – custom range endpoint
    try {
      const start = formatDate(daysAgo(1));
      const bb = await client.get<unknown[]>(
        `https://connectapi.garmin.com/wellness-service/wellness/bodyBattery/reports/daily/${start}/${date}`,
      );
      raw.bodyBattery = bb;
      const last = Array.isArray(bb) ? bb[bb.length - 1] : null;
      const values = (last as { bodyBatteryValuesArray?: [number, number, number?][] })
        ?.bodyBatteryValuesArray;
      if (values?.length) {
        body_battery = values[values.length - 1]?.[1] ?? null;
      }
    } catch (err) {
      notes.push("Kunne ikke hente Body Battery");
      console.warn("[garmin] Body Battery fetch failed", err);
    }

    // Training readiness
    try {
      const readiness = await client.get<Record<string, unknown>>(
        `https://connectapi.garmin.com/metrics-service/metrics/maxmet/daily/${date}/${date}`,
      );
      raw.trainingReadiness = readiness;
    } catch {
      // optional
    }

    try {
      const readiness2 = await client.get<{
        score?: number;
      }>(`https://connectapi.garmin.com/training-readiness-service/trainingReadiness/${date}`);
      raw.trainingReadinessDetail = readiness2;
      training_readiness = readiness2?.score ?? null;
    } catch (err) {
      notes.push("Kunne ikke hente training readiness");
      console.warn("[garmin] readiness failed", err);
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

export async function fetchRecentActivities(days = 90): Promise<
  Array<{
    date: string;
    name: string;
    distanceKm: number;
    durationSec: number;
    avgHr: number | null;
    type: string;
  }>
> {
  return withGarmin(async (client) => {
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
          activityType?: { typeKey?: string };
        };
        return {
          date: (act.startTimeLocal || "").slice(0, 10),
          name: act.activityName || "Aktivitet",
          distanceKm: Math.round(((act.distance || 0) / 1000) * 100) / 100,
          durationSec: Math.round(act.duration || 0),
          avgHr: act.averageHR ?? null,
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

/** Last N days of body battery, sleep score, HRV and run distance. */
export async function fetchThirtyDayMetrics(days = 30): Promise<DayMetrics[]> {
  return withGarmin(async (client) => {
    const end = new Date();
    const start = daysAgo(days - 1);
    const startISO = formatDate(start);
    const endISO = formatDate(end);

    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      dates.push(formatDate(daysAgo(i)));
    }

    const bbByDate = new Map<string, number>();
    try {
      const bb = await client.get<
        Array<{
          date?: string;
          calendarDate?: string;
          bodyBatteryValuesArray?: [number, number, number?][];
        }>
      >(
        `https://connectapi.garmin.com/wellness-service/wellness/bodyBattery/reports/daily/${startISO}/${endISO}`,
      );
      if (Array.isArray(bb)) {
        for (const row of bb) {
          const date = (row.calendarDate || row.date || "").slice(0, 10);
          const values = row.bodyBatteryValuesArray;
          if (!date || !values?.length) continue;
          // Use morning / first reading of the day as readiness proxy, else last.
          const morning = values.find((v) => v[1] != null)?.[1];
          const last = values[values.length - 1]?.[1];
          const value = last ?? morning;
          if (typeof value === "number") bbByDate.set(date, value);
        }
      }
    } catch (err) {
      console.warn("[garmin] 30d body battery failed", err);
    }

    const kmByDate = new Map<string, number>();
    try {
      const activities = await client.getActivities(0, 200);
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
      console.warn("[garmin] 30d activities failed", err);
    }

    const daily = await mapPool(dates, 4, async (date) => {
      let sleep_score: number | null = null;
      let hrv: number | null = null;

      try {
        const sleep = await client.getSleepData(new Date(date + "T12:00:00"));
        sleep_score =
          (sleep as { dailySleepDTO?: { sleepScores?: { overall?: { value?: number } } } })
            ?.dailySleepDTO?.sleepScores?.overall?.value ?? null;
      } catch {
        // skip day
      }

      try {
        const hrvData = await client.get<Record<string, unknown>>(
          `https://connectapi.garmin.com/hrv-service/hrv/${date}`,
        );
        const summary = hrvData?.hrvSummary as { lastNightAvg?: number } | undefined;
        hrv = summary?.lastNightAvg ?? null;
      } catch {
        // skip day
      }

      const body_battery = bbByDate.get(date) ?? null;
      const distance_km = kmByDate.get(date) ?? 0;
      const trafikklys = provisionalTrafficLight({ body_battery, sleep_score, hrv });

      return { date, body_battery, sleep_score, hrv, distance_km, trafikklys };
    });

    return daily;
  });
}
