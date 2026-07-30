import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { askDailyRecommendation } from "@/lib/ai";
import { fetchDailySnapshot } from "@/lib/garmin/client";
import { computeTrafficLight } from "@/lib/traffic-light";
import { todayISO } from "@/lib/time";
import type { DailyRecommendation, GarminSnapshot } from "@/lib/types";

export async function POST() {
  const { supabase, user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const date = todayISO();

  try {
    const { data: existing } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user!.id)
      .eq("date", date)
      .maybeSingle();

    if (existing?.claude_recommendation) {
      return NextResponse.json({
        checkin: existing,
        cached: true,
      });
    }

    let snapshot: GarminSnapshot;
    try {
      snapshot = await fetchDailySnapshot(date);
    } catch (err) {
      console.error("[daily-recommendation] Garmin failed, using empty snapshot", err);
      snapshot = {
        date,
        notes: [err instanceof Error ? err.message : "Garmin utilgjengelig"],
      };
    }

    const traffic = computeTrafficLight(snapshot);

    const { data: profile } = await supabase
      .from("profiles")
      .select("weekly_structure, max_hr")
      .eq("id", user!.id)
      .maybeSingle();

    const { data: milestones } = await supabase
      .from("milestones")
      .select("id, title, target_metric, target_value, target_date, baseline_estimate, status")
      .eq("user_id", user!.id)
      .eq("status", "aktiv");

    const { data: recentCheckins } = await supabase
      .from("daily_checkins")
      .select("date, trafikklys, claude_recommendation")
      .eq("user_id", user!.id)
      .order("date", { ascending: false })
      .limit(14);

    const historySummary =
      recentCheckins
        ?.map((c) => {
          const rec = c.claude_recommendation as DailyRecommendation | null;
          return `${c.date}: ${c.trafikklys}${rec ? ` → ${rec.okt_type} ${rec.anbefalt_varighet_min} min` : ""}`;
        })
        .join("\n") || "Ingen historikk";

    let recommendation: DailyRecommendation;
    try {
      recommendation = await askDailyRecommendation({
        maxHr: profile?.max_hr,
        weeklyStructure: profile?.weekly_structure || "",
        trafficLight: traffic.trafikklys,
        trafficReason: traffic.begrunnelse,
        snapshot,
        milestones: milestones || [],
        historySummary,
      });
    } catch (err) {
      console.error("[daily-recommendation] Gemini/parse failed", err);
      recommendation = {
        trafikklys: traffic.trafikklys,
        begrunnelse: traffic.begrunnelse,
        okt_type: traffic.trafikklys === "rødt" ? "hvile" : "rolig",
        anbefalt_varighet_min: traffic.trafikklys === "rødt" ? 0 : 45,
        anbefalt_intensitet: "Se sonesystem – Gemini-svar kunne ikke parses",
        kommentar:
          "Kunne ikke hente AI-anbefaling akkurat nå. Bruk trafikklyset og ukestrukturen som veiledning.",
      };
    }

    const payload = {
      user_id: user!.id,
      date,
      garmin_snapshot: snapshot,
      trafikklys: recommendation.trafikklys || traffic.trafikklys,
      claude_recommendation: recommendation,
    };

    const { data: checkin, error } = await supabase
      .from("daily_checkins")
      .upsert(payload, { onConflict: "user_id,date" })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      checkin,
      traffic,
      cached: false,
    });
  } catch (err) {
    console.error("[api/claude/daily-recommendation]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
