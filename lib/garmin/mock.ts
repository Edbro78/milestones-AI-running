import { evaluate } from "@/lib/trafficLight";
import { acwr, deltaRhr, hrvZ } from "@/lib/derive";
import type { DailyRecord, Metrics } from "@/lib/types";
import type {
  GarminActivity,
  GarminConnection,
  GarminProvider,
} from "@/lib/garmin/provider";

/** Liten deterministisk PRNG (mulberry32) — stabil mock mellom kjøringer. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(daysAgo: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const round = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

type RawDay = {
  date: string;
  hrv: number;
  rhr: number;
  sleep_score: number;
  body_battery: number;
  recovery_hours: number;
  steps: number;
  stress: number;
  training_load: number;
  activity: GarminActivity | null;
};

/**
 * Genererer realistiske rådata for `total` dager, med baselines før
 * vinduet slik at hrv_z/d_rhr/acwr blir meningsfulle fra dag én.
 */
function generateRaw(total: number, seed = 20260811): RawDay[] {
  const rng = mulberry32(seed);
  const gauss = () => {
    // Box–Muller
    const u = 1 - rng();
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const HRV_BASE = 62; // ms
  const RHR_BASE = 48; // bpm
  const history = 90; // dager baseline-oppvarming før synlig vindu
  const days = total + history;

  const raw: RawDay[] = [];
  let fatigue = 0; // akkumulert tretthet påvirker HRV/RHR/restitusjon

  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    const date = isoDaysAgo(daysAgo);
    const dow = new Date(`${date}T00:00:00`).getDay(); // 0=søn

    // Treningsmønster: hard tirs/tors, langtur søn, hvile man/fre
    let plannedLoad = 55;
    if (dow === 2 || dow === 4) plannedLoad = 130; // intervaller/terskel
    else if (dow === 0) plannedLoad = 150; // langtur
    else if (dow === 6) plannedLoad = 80; // moderat
    else if (dow === 1 || dow === 5) plannedLoad = 20; // rolig/hvile

    const didRun = plannedLoad > 30 && rng() > 0.08;
    const training_load = didRun
      ? clamp(plannedLoad + gauss() * 18, 10, 220)
      : clamp(gauss() * 8 + 5, 0, 25);

    fatigue = fatigue * 0.72 + training_load * 0.28;

    const hrv = clamp(
      HRV_BASE + gauss() * 6 - (fatigue - 70) * 0.09,
      28,
      95,
    );
    const rhr = clamp(
      Math.round(RHR_BASE + gauss() * 1.6 + (fatigue - 70) * 0.05),
      40,
      66,
    );
    const sleep_score = clamp(
      Math.round(80 + gauss() * 9 - (fatigue - 70) * 0.06),
      30,
      98,
    );
    const body_battery = clamp(
      Math.round(78 + gauss() * 10 - (fatigue - 70) * 0.12),
      12,
      100,
    );
    const recovery_hours = clamp(
      Math.round(fatigue * 0.28 + gauss() * 4),
      2,
      72,
    );
    const stepBase = didRun ? 12500 : 8500;
    const steps = clamp(
      Math.round(stepBase + gauss() * 2600),
      3000,
      22000,
    );
    const stress = clamp(Math.round(28 + gauss() * 10), 8, 85);

    const activity: GarminActivity | null = didRun
      ? {
          id: `mock-act-${date}`,
          date,
          type: dow === 0 ? "langtur" : dow === 2 || dow === 4 ? "intervall" : "rolig",
          duration_s: Math.round((training_load / 130) * 3600 + 1800),
          distance_m: Math.round((training_load / 130) * 12000 + 5000),
          avg_hr: Math.round(135 + (training_load / 130) * 25 + gauss() * 4),
          training_load: round(training_load, 1),
        }
      : null;

    raw.push({
      date,
      hrv: round(hrv, 1),
      rhr,
      sleep_score,
      body_battery,
      recovery_hours,
      steps,
      stress,
      training_load: round(training_load, 1),
      activity,
    });
  }

  return raw;
}

function toDailyRecords(raw: RawDay[], visibleDays: number): DailyRecord[] {
  const records: DailyRecord[] = [];
  const start = raw.length - visibleDays;

  for (let i = start; i < raw.length; i++) {
    const day = raw[i];
    const hrvHistory = raw.slice(0, i).map((r) => r.hrv);
    const rhrHistory = raw.slice(0, i).map((r) => r.rhr);
    const loads = raw.slice(0, i + 1).map((r) => r.training_load);

    const metrics: Metrics = {
      hrv_z: round(hrvZ(day.hrv, hrvHistory), 2),
      d_rhr: deltaRhr(day.rhr, rhrHistory),
      body_battery: day.body_battery,
      sleep_score: day.sleep_score,
      acwr: round(acwr(loads), 2),
      recovery_hours: day.recovery_hours,
      steps: day.steps,
      stress: day.stress,
    };

    const evalResult = evaluate(metrics);

    records.push({
      date: day.date,
      metrics,
      category: evalResult.category,
      score: evalResult.score,
      triggers: evalResult.triggers,
      source: "garmin",
      completed: day.activity
        ? `${day.activity.type}, ${(day.activity.distance_m / 1000).toFixed(1)} km`
        : null,
      distanceKm: day.activity
        ? Math.round((day.activity.distance_m / 1000) * 10) / 10
        : 0,
      hrvMs: day.hrv,
      recoveryScore: clamp(Math.round(day.body_battery * 0.6 + day.sleep_score * 0.4), 0, 100),
      floors: Math.round(day.steps / 900),
    });
  }

  return records;
}

export class MockGarminProvider implements GarminProvider {
  async getConnection(): Promise<GarminConnection> {
    return {
      connected: true,
      lastSync: new Date().toISOString(),
      garminUserId: "mock-edvard",
    };
  }

  async getDailyRecords(days = 28): Promise<DailyRecord[]> {
    const raw = generateRaw(days);
    return toDailyRecords(raw, days);
  }

  async getActivities(days = 28): Promise<GarminActivity[]> {
    const raw = generateRaw(days);
    return raw
      .slice(raw.length - days)
      .map((r) => r.activity)
      .filter((a): a is GarminActivity => a !== null);
  }
}

/** Synkron variant for bruk i klient-komponenter med mock-data. */
export function mockDailyRecords(days = 28): DailyRecord[] {
  return toDailyRecords(generateRaw(days), days);
}
