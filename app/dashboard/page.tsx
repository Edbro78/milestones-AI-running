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
        className="sticky top-0 z-10 flex items-center justify-between"
        style={{
          background: "var(--white)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <div>
          <p
            className="text-lg leading-none"
            style={{ fontWeight: 700, color: "var(--sp-navy)" }}
          >
            Milestones
          </p>
          <p
            className="mt-1 text-[0.7rem] uppercase"
            style={{ letterSpacing: "0.16em", color: "var(--gray-500)" }}
          >
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
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <p className="text-sm" style={{ color: "var(--gray-500)" }}>
          Velkommen tilbake
        </p>
        <h1
          className="mt-1 break-words text-3xl"
          style={{ fontWeight: 500, color: "var(--sp-navy)" }}
        >
          {user.email}
        </h1>

        <div className="panel mt-6 p-6" style={{ borderRadius: "var(--radius-lg)" }}>
          <h2 className="text-xl" style={{ fontWeight: 600, color: "var(--sp-navy)" }}>
            Ingen data ennå
          </h2>
          <p className="mt-2" style={{ color: "var(--gray-600)" }}>
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
