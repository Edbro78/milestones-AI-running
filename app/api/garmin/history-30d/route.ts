import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchThirtyDayMetrics } from "@/lib/garmin/client";

export const maxDuration = 60;

export async function GET() {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const days = await fetchThirtyDayMetrics(30);
    return NextResponse.json({ days });
  } catch (err) {
    console.error("[api/garmin/history-30d]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Garmin-feil" },
      { status: 502 },
    );
  }
}
