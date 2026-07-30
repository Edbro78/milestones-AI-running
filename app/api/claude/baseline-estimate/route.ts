import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { askBaselineEstimate } from "@/lib/ai";
import { fetchRecentActivities, summarizeActivities } from "@/lib/garmin/client";
import { maxTargetDate, todayISO } from "@/lib/time";

export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const {
      title,
      target_metric,
      target_value,
      start_date = todayISO(),
      target_date,
    } = body as {
      title?: string;
      target_metric?: string;
      target_value?: string;
      start_date?: string;
      target_date?: string;
    };

    if (!title || !target_metric || !target_value || !target_date) {
      return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
    }

    if (target_date > maxTargetDate(start_date)) {
      return NextResponse.json(
        { error: "target_date kan ikke være mer enn 6 måneder etter start_date" },
        { status: 400 },
      );
    }

    const { count } = await supabase
      .from("milestones")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("status", "aktiv");

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Maks 3 aktive mål. Fullfør et mål først." },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("weekly_structure, max_hr")
      .eq("id", user!.id)
      .maybeSingle();

    let activitiesSummary = "Garmin-data utilgjengelig";
    try {
      const activities = await fetchRecentActivities(90);
      activitiesSummary = summarizeActivities(activities);
    } catch (err) {
      console.error("[baseline-estimate] Garmin failed", err);
      activitiesSummary = `Garmin-feil: ${err instanceof Error ? err.message : "ukjent"}`;
    }

    let baseline_estimate = "Ukjent baseline";
    let begrunnelse = "";
    try {
      const result = await askBaselineEstimate({
        maxHr: profile?.max_hr,
        weeklyStructure: profile?.weekly_structure || "",
        title,
        targetMetric: target_metric,
        targetValue: target_value,
        startDate: start_date,
        targetDate: target_date,
        activitiesSummary,
      });
      baseline_estimate = result.baseline_estimate;
      begrunnelse = result.begrunnelse;
    } catch (err) {
      console.error("[baseline-estimate] Gemini failed", err);
      baseline_estimate = target_value;
      begrunnelse =
        "Gemini-baseline feilet – brukte target_value midlertidig. Du kan kalibrere med testløp.";
    }

    const { data: milestone, error } = await supabase
      .from("milestones")
      .insert({
        user_id: user!.id,
        title,
        target_metric,
        target_value,
        start_date,
        target_date,
        baseline_estimate,
        status: "aktiv",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ milestone, begrunnelse });
  } catch (err) {
    console.error("[api/claude/baseline-estimate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
