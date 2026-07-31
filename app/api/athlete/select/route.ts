import { NextResponse } from "next/server";
import { ATHLETE_COOKIE, isAthleteId } from "@/lib/athletes";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const body = (await request.json().catch(() => null)) as { athleteId?: string } | null;
  const athleteId = body?.athleteId;
  if (!athleteId || !isAthleteId(athleteId)) {
    return NextResponse.json({ error: "Ugyldig utøver" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, athleteId });
  res.cookies.set(ATHLETE_COOKIE, athleteId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
