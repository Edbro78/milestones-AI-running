import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { getConnectionStatus } from "@/lib/connections";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Appen er låst til Garmin er koblet til og bekreftet.
  const status = await getConnectionStatus(user.id);
  if (!status.complete) redirect("/onboarding");

  return <AppShell userEmail={user.email ?? "Edvard"} />;
}
