import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AthleteNotReady } from "@/components/AthleteNotReady";
import { ThirtyDayDashboard } from "@/components/ThirtyDayDashboard";
import { getSelectedAthlete } from "@/lib/athlete-session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const athlete = await getSelectedAthlete();
  if (!athlete) redirect("/velg");

  return (
    <div>
      <AppNav email={user.email} athlete={athlete} />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16">
        <section>
          <h1 className="font-display text-4xl md:text-5xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
            Siste 60 dager: Body Battery, sleep score, HRV, km, skritt og etasjer.
          </p>
        </section>
        {athlete.garminReady ? <ThirtyDayDashboard /> : <AthleteNotReady athlete={athlete} />}
      </main>
    </div>
  );
}
