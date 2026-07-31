import { NextResponse } from "next/server";
import { getSelectedAthlete } from "@/lib/athlete-session";
import { requireUser } from "@/lib/auth";
import { fetchDailySnapshot } from "@/lib/garmin/client";
import { todayISO } from "@/lib/time";

export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const athlete = await getSelectedAthlete();
  if (!athlete?.garminReady) {
    return NextResponse.json(
      {
        error: athlete
          ? `Garmin er ikke koblet for ${athlete.name} ennå.`
          : "Velg utøver først",
      },
      { status: athlete ? 503 : 400 },
    );
  }

  try {
    const snapshot = await fetchDailySnapshot(todayISO());
    return NextResponse.json({ snapshot, userId: user!.id, athleteId: athlete.id });
  } catch (err) {
    console.error("[api/garmin/daily-snapshot]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Garmin-feil" },
      { status: 502 },
    );
  }
}
