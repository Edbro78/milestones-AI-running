import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { CreateMilestoneForm } from "@/components/CreateMilestoneForm";
import { MilestoneCard } from "@/components/MilestoneCard";
import { createClient } from "@/lib/supabase/server";
import { daysBetween, todayISO } from "@/lib/time";
import type { Milestone, TestRun } from "@/lib/types";

export default async function MilestonesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const all = (milestones || []) as Milestone[];
  const active = all.filter((m) => m.status === "aktiv");
  const done = all.filter((m) => m.status === "fullført");

  const { data: testRuns } = active.length
    ? await supabase
        .from("test_runs")
        .select("*")
        .in(
          "milestone_id",
          active.map((m) => m.id),
        )
    : { data: [] as TestRun[] };

  const runs = (testRuns || []) as TestRun[];
  const today = todayISO();

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16">
        <section>
          <h1 className="font-display text-4xl md:text-5xl">Mine mål</h1>
          <p className="mt-2 text-[var(--ink-muted)]">Maks 3 aktive mål samtidig.</p>
        </section>

        <CreateMilestoneForm canCreate={active.length < 3} />

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Aktive ({active.length}/3)</h2>
          {active.map((m) => {
            const last = [...runs]
              .filter((r) => r.milestone_id === m.id)
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            return (
              <MilestoneCard
                key={m.id}
                milestone={m}
                daysSinceTest={last ? daysBetween(last.date, today) : 999}
              />
            );
          })}
        </section>

        {done.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-display text-2xl">Fullført</h2>
            {done.map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
