import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { askCalibrate } from "@/lib/claude";
import { fetchRecentActivities, summarizeActivities } from "@/lib/garmin/client";
import { daysBetween, todayISO } from "@/lib/time";

export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const {
      milestone_id,
      date = todayISO(),
      distance_km,
      duration_seconds,
      avg_hr,
    } = body as {
      milestone_id?: string;
      date?: string;
      distance_km?: number;
      duration_seconds?: number;
      avg_hr?: number | null;
    };

    if (!milestone_id || distance_km == null || duration_seconds == null) {
      return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
    }

    const { data: milestone, error: mErr } = await supabase
      .from("milestones")
      .select("*")
      .eq("id", milestone_id)
      .eq("user_id", user!.id)
      .single();

    if (mErr || !milestone) {
      return NextResponse.json({ error: "Mål ikke funnet" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("weekly_structure, max_hr")
      .eq("id", user!.id)
      .maybeSingle();

    const { data: lastRun } = await supabase
      .from("test_runs")
      .select("*")
      .eq("milestone_id", milestone_id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    let trainingSinceLast = "Ingen Garmin-data";
    try {
      const activities = await fetchRecentActivities(30);
      const since = lastRun?.date || milestone.start_date;
      const filtered = activities.filter((a) => a.date >= since);
      trainingSinceLast = summarizeActivities(filtered);
    } catch (err) {
      trainingSinceLast = `Garmin-feil: ${err instanceof Error ? err.message : "ukjent"}`;
    }

    const testPayload = {
      date,
      distance_km,
      duration_seconds,
      avg_hr: avg_hr ?? null,
    };

    let claude_estimate_after = milestone.baseline_estimate || milestone.target_value;
    let begrunnelse = "";
    try {
      const result = await askCalibrate({
        maxHr: profile?.max_hr,
        weeklyStructure: profile?.weekly_structure || "",
        milestone,
        testRun: testPayload,
        trainingSinceLast,
        previousEstimate: lastRun?.claude_estimate_after || milestone.baseline_estimate,
      });
      claude_estimate_after = result.claude_estimate_after;
      begrunnelse = result.begrunnelse;
    } catch (err) {
      console.error("[calibrate] Claude failed", err);
      begrunnelse =
        "Claude-kalibrering feilet. Estimatet er uendret; testløpet er lagret.";
    }

    const { data: testRun, error } = await supabase
      .from("test_runs")
      .insert({
        milestone_id,
        ...testPayload,
        claude_estimate_after,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const daysSince = lastRun ? daysBetween(lastRun.date, date) : null;

    return NextResponse.json({ testRun, begrunnelse, daysSince });
  } catch (err) {
    console.error("[api/claude/calibrate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
