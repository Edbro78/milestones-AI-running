import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchHistoryMetrics } from "@/lib/garmin/client";

export const maxDuration = 60;

/** @deprecated Prefer /api/garmin/history?days=60 */
export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse || !user) return errorResponse!;

  try {
    const days = await fetchHistoryMetrics(user.id, 60);
    return NextResponse.json({ days, rangeDays: 60 });
  } catch (err) {
    console.error("[api/garmin/history-30d]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Garmin-feil" },
      { status: 502 },
    );
  }
}
