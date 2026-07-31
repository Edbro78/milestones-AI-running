import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ThirtyDayDashboard } from "@/components/ThirtyDayDashboard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16">
        <section>
          <h1 className="font-display text-4xl md:text-5xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
            Siste 60 dager: Body Battery, sleep score, HRV og km løpt per dag.
          </p>
        </section>
        <ThirtyDayDashboard />
      </main>
    </div>
  );
}
