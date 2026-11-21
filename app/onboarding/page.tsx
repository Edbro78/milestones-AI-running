import { redirect } from "next/navigation";
import { GarminConnectForm } from "@/components/GarminConnectForm";
import { getConnectionStatus } from "@/lib/connections";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const status = await getConnectionStatus(user.id);
  const garmin = status.garmin;

  return (
    <main
      className="app-min-h flex items-center justify-center"
      style={{
        paddingTop: "max(3rem, env(safe-area-inset-top))",
        paddingBottom: "max(3rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="panel mx-auto w-full max-w-md p-6 sm:p-8" style={{ borderRadius: "var(--radius-lg)" }}>
        <h1 className="text-3xl" style={{ fontWeight: 500, color: "var(--sp-navy)" }}>
          Koble til Garmin
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "var(--gray-500)" }}>
          Appen henter økter, HRV, søvn, Body Battery og hvilepuls fra Garmin Connect. Du må koble
          til før du kan starte.
        </p>

        {garmin.connected ? (
          <>
            <p
              className="mt-6 flex items-center gap-2 p-3 text-sm"
              style={{
                background: "var(--blue-50)",
                color: "var(--gray-700)",
                border: "1px solid var(--blue-200)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span aria-hidden="true">✓</span>
              Garmin er koblet til{garmin.displayName ? ` (${garmin.displayName})` : ""}.
            </p>
            <a href="/dashboard" className="btn btn-primary mt-6 w-full">
              Gå til appen
            </a>
          </>
        ) : (
          <GarminConnectForm />
        )}

        <form action="/auth/signout" method="post" className="mt-6 text-center">
          <button type="submit" className="text-sm" style={{ color: "var(--gray-500)" }}>
            Logg ut
          </button>
        </form>
      </div>
    </main>
  );
}
