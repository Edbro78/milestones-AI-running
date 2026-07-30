import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      // Avoid navigator.locks hang that can leave login stuck on "Vent…"
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  });
}
