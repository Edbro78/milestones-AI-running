import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchHistoryMetrics } from "@/lib/garmin/client";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days") || "60");
  const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(7, daysParam)) : 60;

  try {
    const series = await fetchHistoryMetrics(days);
    return NextResponse.json({ days: series, rangeDays: days });
  } catch (err) {
    console.error("[api/garmin/history]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Garmin-feil" },
      { status: 502 },
    );
  }
}
