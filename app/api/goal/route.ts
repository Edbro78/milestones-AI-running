import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import type { Goal } from "@/lib/mockData";

const MIN_S = 2 * 3600;
const MAX_S = 6 * 3600 + 30 * 60;

type GoalRow = {
  goal_title: string | null;
  goal_event_date: string | null;
  goal_target_s: number | null;
};

function rowToGoal(row: GoalRow | null): Goal | null {
  if (!row?.goal_event_date || !row.goal_target_s) return null;
  return {
    id: "goal-main",
    title: row.goal_title || "Maraton",
    eventDate: row.goal_event_date,
    targetTimeS: row.goal_target_s,
    isMain: true,
  };
}

/** Brukerens maratonmål (lagret i profilen). */
export async function GET() {
  const { supabase, user, errorResponse } = await requireUser();
  if (errorResponse || !user) return errorResponse!;

  const { data, error } = await supabase
    .from("profiles")
    .select("goal_title, goal_event_date, goal_target_s")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: rowToGoal(data as GoalRow | null) });
}

export async function PUT(request: Request) {
  const { supabase, user, errorResponse } = await requireUser();
  if (errorResponse || !user) return errorResponse!;

  let body: Partial<Goal>;
  try {
    body = (await request.json()) as Partial<Goal>;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }
  const date = typeof body.eventDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)
    ? body.eventDate
    : null;
  const seconds = Number(body.targetTimeS);
  if (!date || !Number.isFinite(seconds) || seconds < MIN_S || seconds > MAX_S) {
    return NextResponse.json({ error: "Ugyldig maratonmål" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        goal_title: (body.title ?? "").toString().trim().slice(0, 120) || "Maraton",
        goal_event_date: date,
        goal_target_s: Math.round(seconds),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("goal_title, goal_event_date, goal_target_s")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: rowToGoal(data as GoalRow) });
}
