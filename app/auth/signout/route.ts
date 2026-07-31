import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATHLETE_COOKIE } from "@/lib/athletes";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete(ATHLETE_COOKIE);
  redirect("/login");
}
