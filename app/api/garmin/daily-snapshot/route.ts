import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchDailySnapshot } from "@/lib/garmin/client";
import { todayISO } from "@/lib/time";

export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const snapshot = await fetchDailySnapshot(todayISO());
    return NextResponse.json({ snapshot, userId: user!.id });
  } catch (err) {
    console.error("[api/garmin/daily-snapshot]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Garmin-feil" },
      { status: 502 },
    );
  }
}
