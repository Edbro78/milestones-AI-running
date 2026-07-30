import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { SettingsForm } from "@/components/SettingsForm";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("weekly_structure, max_hr")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16">
        <section>
          <h1 className="font-display text-4xl md:text-5xl">Innstillinger</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Garmin kobles automatisk via miljøvariabler – ingen UI for Garmin-login.
          </p>
        </section>
        <SettingsForm
          weeklyStructure={profile?.weekly_structure || ""}
          maxHr={profile?.max_hr ?? null}
        />
      </main>
    </div>
  );
}
