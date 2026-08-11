import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  garminCredentialsConfigured,
  syncGarminRecords,
} from "@/lib/garmin/live";
import { getMockRecords } from "@/lib/mockData";

export const maxDuration = 120;

/**
 * Synkroniserer Garmin og returnerer evaluerte dagsrader.
 * Mock brukes kun når GARMIN_MOCK=true — aldri som falsk «tilkoblet»-status.
 */
export async function GET(request: Request) {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days") || "28");
  const days = Number.isFinite(daysParam)
    ? Math.min(90, Math.max(7, daysParam))
    : 28;

  const useMock = process.env.GARMIN_MOCK === "true";

  if (useMock) {
    return NextResponse.json({
      connected: false,
      mock: true,
      lastSync: null,
      records: getMockRecords(days),
      message: "GARMIN_MOCK=true — viser demodata, ikke live Garmin.",
    });
  }

  if (!garminCredentialsConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        mock: false,
        lastSync: null,
        records: [],
        error:
          "Garmin er ikke konfigurert. Sett GARMIN_EMAIL og GARMIN_PASSWORD.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await syncGarminRecords(days);
    return NextResponse.json({
      connected: result.connected,
      mock: false,
      lastSync: result.lastSync,
      records: result.records,
    });
  } catch (err) {
    console.error("[api/garmin/sync]", err);
    return NextResponse.json(
      {
        connected: false,
        mock: false,
        lastSync: null,
        records: [],
        error: err instanceof Error ? err.message : "Garmin-feil",
      },
      { status: 502 },
    );
  }
}
