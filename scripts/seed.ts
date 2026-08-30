/**
 * Seed-skript: fyller 28 dagers mock-historikk for Edvard i Supabase.
 *
 * Kjør:  npx tsx scripts/seed.ts
 *
 * Krever i .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_EMAIL   (e-posten til Edvards konto)
 *
 * Service-role omgår RLS. Kjør aldri dette fra klienten.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { MockGarminProvider } from "../lib/garmin/mock";
import { MOCK_GOALS, MOCK_PROFILE } from "../lib/mockData";

/** Enkel .env.local-laster (unngår dotenv-avhengighet). */
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local finnes ikke — stol på ekte miljøvariabler
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SEED_EMAIL;

  if (!url || !serviceKey || !email) {
    throw new Error(
      "Mangler NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY eller SEED_EMAIL.",
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Finn eller opprett Edvards auth-bruker
  const { data: list } = await supabase.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }
  const userId = user!.id;
  console.log(`Bruker: ${email} (${userId})`);

  // Profil
  await supabase.from("profiles").upsert({
    id: userId,
    name: MOCK_PROFILE.name,
    birth_date: MOCK_PROFILE.birthDate,
    weight_kg: MOCK_PROFILE.weightKg,
    max_hr: MOCK_PROFILE.hrMax,
    hr_threshold: MOCK_PROFILE.hrThreshold,
    hrv_baseline: MOCK_PROFILE.hrvBaseline,
    rhr_baseline: MOCK_PROFILE.rhrBaseline,
    weekly_km: MOCK_PROFILE.weeklyKm,
  });

  // Mål
  await supabase.from("goals").delete().eq("user_id", userId);
  await supabase.from("goals").insert(
    MOCK_GOALS.map((g) => ({
      user_id: userId,
      title: g.title,
      event_date: g.eventDate,
      target_time_s: g.targetTimeS,
      is_main: g.isMain,
    })),
  );

  // 28 dagers daglige målinger + aktiviteter fra mock-provideren
  const provider = new MockGarminProvider();
  const records = await provider.getDailyRecords(28);
  const activities = await provider.getActivities(28);

  await supabase.from("daily_metrics").upsert(
    records.map((r) => ({
      user_id: userId,
      date: r.date,
      hrv_z: r.metrics.hrv_z,
      d_rhr: r.metrics.d_rhr,
      sleep_score: r.metrics.sleep_score,
      body_battery: r.metrics.body_battery,
      acwr: r.metrics.acwr,
      recovery_hours: r.metrics.recovery_hours,
      steps: r.metrics.steps,
      stress: r.metrics.stress,
      source: r.source,
      category: r.category,
      score: r.score,
      triggers: r.triggers,
    })),
  );

  await supabase.from("activities").upsert(
    activities.map((a) => ({
      user_id: userId,
      date: a.date,
      type: a.type,
      duration_s: a.duration_s,
      distance_m: a.distance_m,
      avg_hr: a.avg_hr,
      training_load: a.training_load,
      garmin_activity_id: a.id,
    })),
    { onConflict: "garmin_activity_id" },
  );

  console.log(
    `Seeded ${records.length} dager og ${activities.length} aktiviteter.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
