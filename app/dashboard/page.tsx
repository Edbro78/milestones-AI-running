import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-dvh">
      <form action="/auth/signout" method="post" className="absolute right-4 top-4">
        <button type="submit" className="btn btn-ghost text-sm">
          Logg ut
        </button>
      </form>
    </main>
  );
}
