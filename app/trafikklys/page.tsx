import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TrafficLightTimeline } from "@/components/TrafficLightTimeline";
import { createClient } from "@/lib/supabase/server";

export default async function TrafikklysPage() {
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
          <h1 className="font-display text-4xl md:text-5xl">Trafikklys</h1>
          <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">
            Én status per dag for siste 30 dager. Beregningsregler finpusses senere.
          </p>
        </section>
        <TrafficLightTimeline />
      </main>
    </div>
  );
}
