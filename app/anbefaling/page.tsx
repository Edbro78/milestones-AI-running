import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { GeminiPingPanel } from "@/components/GeminiPingPanel";
import { createClient } from "@/lib/supabase/server";

export default async function AnbefalingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16">
        <GeminiPingPanel />
      </main>
    </div>
  );
}
