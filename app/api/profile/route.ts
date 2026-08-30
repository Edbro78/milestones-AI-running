import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  hasSavedUserFields,
  mergeProfile,
  rowToProfile,
  userFieldsForDb,
  type ProfileRow,
} from "@/lib/profileStorage";
import { MOCK_PROFILE, type Profile } from "@/lib/mockData";

export async function GET() {
  const { supabase, user, errorResponse } = await requireUser();
  if (errorResponse || !user) return errorResponse!;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, birth_date, weight_kg, max_hr, hr_threshold, weekly_km, hrv_baseline, rhr_baseline",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as ProfileRow | null;
  const remote = rowToProfile(row);
  const profile = mergeProfile(remote, MOCK_PROFILE);

  return NextResponse.json({
    profile,
    saved: hasSavedUserFields(row),
  });
}

export async function PUT(request: Request) {
  const { supabase, user, errorResponse } = await requireUser();
  if (errorResponse || !user) return errorResponse!;

  let body: Profile;
  try {
    body = (await request.json()) as Profile;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const payload = {
    id: user.id,
    ...userFieldsForDb(body),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, name, birth_date, weight_kg, max_hr, hr_threshold, weekly_km, hrv_baseline, rhr_baseline",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profile = mergeProfile(rowToProfile(data as ProfileRow), {
    ...MOCK_PROFILE,
    ...body,
  });

  return NextResponse.json({ profile, saved: true });
}
