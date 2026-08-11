import { NextResponse } from "next/server";
import { getSelectedAthlete } from "@/lib/athlete-session";
import { requireUser } from "@/lib/auth";
import { fetchHistoryMetrics } from "@/lib/garmin/client";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const athlete = await getSelectedAthlete();
  if (!athlete) {
    return NextResponse.json({ error: "Velg utøver først" }, { status: 400 });
  }
  if (!athlete.garminReady) {
    return NextResponse.json(
      { error: `Garmin er ikke koblet for ${athlete.name} ennå.` },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days") || "60");
  const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(7, daysParam)) : 60;

  try {
    const series = await fetchHistoryMetrics(days);
    return NextResponse.json({ days: series, rangeDays: days, athleteId: athlete.id });
  } catch (err) {
    console.error("[api/garmin/history]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Garmin-feil" },
      { status: 502 },
    );
  }
}
