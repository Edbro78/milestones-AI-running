import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { DailyRecommendationPanel } from "@/components/DailyRecommendationPanel";
import { MilestoneCard } from "@/components/MilestoneCard";
import { MilestoneChart } from "@/components/MilestoneChart";
import { createClient } from "@/lib/supabase/server";
import { buildMilestoneChartData } from "@/lib/progress";
import { daysBetween, todayISO } from "@/lib/time";
import type { Milestone, TestRun } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "aktiv")
    .order("created_at", { ascending: true });

  const active = (milestones || []) as Milestone[];
  const milestoneIds = active.map((m) => m.id);

  const { data: testRuns } = milestoneIds.length
    ? await supabase.from("test_runs").select("*").in("milestone_id", milestoneIds)
    : { data: [] as TestRun[] };

  const runs = (testRuns || []) as TestRun[];
  const today = todayISO();

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16">
        <section>
          <h1 className="font-display text-4xl md:text-5xl">Dagens økt</h1>
          <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
            Trafikklys fra Garmin, konkrete råd fra Claude – tilpasset ukestrukturen din.
          </p>
        </section>

        <DailyRecommendationPanel />

        <section className="space-y-4">
          <h2 className="font-display text-3xl">Aktive mål</h2>
          {active.length === 0 ? (
            <p className="panel rounded-2xl p-5 text-[var(--ink-muted)]">
              Ingen aktive mål ennå. Gå til Mine mål for å legge til.
            </p>
          ) : (
            <div className="grid gap-4">
              {active.map((m) => {
                const mRuns = runs.filter((r) => r.milestone_id === m.id);
                const last = [...mRuns].sort((a, b) => b.date.localeCompare(a.date))[0];
                const daysSince = last ? daysBetween(last.date, today) : 999;
                const { points, status } = buildMilestoneChartData(m, mRuns);
                return (
                  <div key={m.id} className="space-y-3">
                    <MilestoneCard milestone={m} daysSinceTest={daysSince} />
                    <MilestoneChart
                      title={m.title}
                      metric={m.target_metric}
                      points={points}
                      status={status}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
