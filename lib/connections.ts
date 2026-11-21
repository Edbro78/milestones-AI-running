import { createAdminClient } from "@/lib/supabase/admin";

export type ConnectionStatus = {
  garmin: { connected: boolean; displayName: string | null; verifiedAt: string | null };
  /** Appen låses først opp når Garmin er koblet til og bekreftet av brukeren. */
  complete: boolean;
};

export async function getConnectionStatus(userId: string): Promise<ConnectionStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("garmin_tokens")
    .select("display_name, verified_at")
    .eq("user_id", userId)
    .maybeSingle();

  const garminOk = !!data?.verified_at;
  return {
    garmin: {
      connected: garminOk,
      displayName: data?.display_name ?? null,
      verifiedAt: data?.verified_at ?? null,
    },
    complete: garminOk,
  };
}
