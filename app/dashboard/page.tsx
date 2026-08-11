import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="app-min-h">
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <div>
          <p className="font-display text-lg leading-none text-[var(--brand)]">
            Milestones
          </p>
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
            AI Running
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-ghost text-sm">
            Logg ut
          </button>
        </form>
      </header>

      <section
        className="mx-auto w-full max-w-2xl px-4 py-8"
        style={{
          paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        }}
      >
        <p className="text-sm text-[var(--ink-muted)]">Velkommen tilbake</p>
        <h1 className="mt-1 break-words font-display text-3xl text-[var(--ink)]">
          {user.email}
        </h1>

        <div className="panel mt-6 rounded-3xl p-6">
          <h2 className="font-display text-xl">Ingen data ennå</h2>
          <p className="mt-2 text-[var(--ink-muted)]">
            Koble til Garmin Connect for å få daglige AI-treningsråd rett her.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-5 w-full sm:w-auto"
            disabled
          >
            Koble til Garmin (kommer)
          </button>
        </div>
      </section>
    </main>
  );
}
