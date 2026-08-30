import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  garminCredentialsConfigured,
  syncGarminRecords,
} from "@/lib/garmin/live";
import { formatGarminUserError, isRateLimitError } from "@/lib/garmin/errors";
import { getMockRecords } from "@/lib/mockData";

export const maxDuration = 120;

let rateLimitedUntil = 0;

/**
 * Synkroniserer Garmin og returnerer evaluerte dagsrader.
 * Mock brukes kun når GARMIN_MOCK=true — aldri som falsk «tilkoblet»-status.
 */
export async function GET(request: Request) {
  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days") || "60");
  const days = Number.isFinite(daysParam)
    ? Math.min(90, Math.max(7, daysParam))
    : 60;
  const sinceRaw = url.searchParams.get("since");
  const since =
    sinceRaw && /^\d{4}-\d{2}-\d{2}$/.test(sinceRaw) ? sinceRaw : undefined;

  const useMock = process.env.GARMIN_MOCK === "true";

  if (useMock) {
    return NextResponse.json({
      connected: false,
      mock: true,
      lastSync: null,
      records: getMockRecords(days),
      hrvBaseline: null,
      rhrBaseline: null,
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

  if (Date.now() < rateLimitedUntil) {
    return NextResponse.json(
      {
        connected: false,
        mock: false,
        lastSync: null,
        records: [],
        error: formatGarminUserError("429"),
      },
      { status: 429 },
    );
  }

  try {
    const result = await syncGarminRecords(days, since);

    if (user && (result.hrvBaseline != null || result.rhrBaseline != null)) {
      const patch: Record<string, number | string> = {
        updated_at: new Date().toISOString(),
      };
      if (result.hrvBaseline != null) patch.hrv_baseline = result.hrvBaseline;
      if (result.rhrBaseline != null) patch.rhr_baseline = result.rhrBaseline;
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          ...patch,
        },
        { onConflict: "id" },
      );
      if (profileError) {
        console.warn("[api/garmin/sync] kunne ikke lagre Garmin-baselines", profileError);
      }
    }

    return NextResponse.json({
      connected: result.connected,
      mock: false,
      lastSync: result.lastSync,
      records: result.records,
      hrvBaseline: result.hrvBaseline,
      rhrBaseline: result.rhrBaseline,
    });
  } catch (err) {
    console.error("[api/garmin/sync]", err);
    if (isRateLimitError(err)) {
      rateLimitedUntil = Date.now() + 60_000;
    }
    return NextResponse.json(
      {
        connected: false,
        mock: false,
        lastSync: null,
        records: [],
        error: formatGarminUserError(err),
      },
      { status: isRateLimitError(err) ? 429 : 502 },
    );
  }
}
