import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { syncGarminRecords } from "@/lib/garmin/live";
import { GarminReconnectRequiredError } from "@/lib/garmin/client";
import { formatGarminUserError, isRateLimitError } from "@/lib/garmin/errors";
import { getMockRecords } from "@/lib/mockData";

export const maxDuration = 120;

/** Garmin-sperre (429) per bruker. */
const rateLimitedUntil = new Map<string, number>();

/**
 * Synkroniserer Garmin og returnerer evaluerte dagsrader.
 * Mock brukes kun når GARMIN_MOCK=true — aldri som falsk «tilkoblet»-status.
 */
export async function GET(request: Request) {
  const { user, supabase, errorResponse } = await requireUser();
  if (errorResponse || !user) return errorResponse!;

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

  if (Date.now() < (rateLimitedUntil.get(user.id) ?? 0)) {
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
    const result = await syncGarminRecords(user.id, days, since);

    if (result.hrvBaseline != null || result.rhrBaseline != null) {
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
    if (err instanceof GarminReconnectRequiredError) {
      // Tokens virker ikke lenger: brukeren må koble til Garmin på nytt.
      return NextResponse.json(
        { connected: false, mock: false, lastSync: null, records: [], reconnect: true, error: err.message },
        { status: 409 },
      );
    }
    console.error("[api/garmin/sync]", err);
    if (isRateLimitError(err)) {
      rateLimitedUntil.set(user.id, Date.now() + 60_000);
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
