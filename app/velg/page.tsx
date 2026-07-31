import { redirect } from "next/navigation";
import { AthletePicker } from "@/components/AthletePicker";
import { createClient } from "@/lib/supabase/server";

export default async function VelgPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="athlete-picker-page">
      <div className="athlete-picker-page__glow" aria-hidden />
      <div className="home-grain athlete-picker-page__grain" aria-hidden />
      <AthletePicker />
      <form action="/auth/signout" method="post" className="athlete-picker-page__signout">
        <button type="submit" className="btn btn-ghost text-sm">
          Logg ut
        </button>
      </form>
    </main>
  );
}
