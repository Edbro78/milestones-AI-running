import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TestRunForm } from "@/components/TestRunForm";
import { createClient } from "@/lib/supabase/server";
import { formatSeconds } from "@/lib/time";
import type { Milestone, TestRun } from "@/lib/types";

export default async function TestRunsPage() {
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

  const { data: recent } = active.length
    ? await supabase
        .from("test_runs")
        .select("*")
        .in(
          "milestone_id",
          active.map((m) => m.id),
        )
        .order("date", { ascending: false })
        .limit(20)
    : { data: [] as TestRun[] };

  const runs = (recent || []) as TestRun[];

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16">
        <section>
          <h1 className="font-display text-4xl md:text-5xl">Testløp</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Kalibrerer Claudes estimat mot faktisk resultat.
          </p>
        </section>

        <TestRunForm milestones={active} />

        <section className="panel rounded-2xl p-6">
          <h2 className="font-display text-2xl">Siste testløp</h2>
          {runs.length === 0 ? (
            <p className="mt-3 text-[var(--ink-muted)]">Ingen testløp registrert ennå.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--line)]">
              {runs.map((r) => {
                const m = active.find((x) => x.id === r.milestone_id);
                return (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <span>
                      <strong>{m?.title || "Mål"}</strong> · {r.date} · {r.distance_km} km ·{" "}
                      {formatSeconds(r.duration_seconds)}
                      {r.avg_hr ? ` · ${r.avg_hr} bpm` : ""}
                    </span>
                    <span className="text-[var(--ink-muted)]">
                      Estimat: {r.claude_estimate_after || "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
