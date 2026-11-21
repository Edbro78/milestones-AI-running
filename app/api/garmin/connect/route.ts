import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { connectGarminAccount } from "@/lib/garmin/client";

const MESSAGES = {
  invalid_credentials: "Feil e-post eller passord for Garmin Connect.",
  mfa: "Garmin-kontoen har totrinnsbekreftelse (MFA) på. Skru den av i Garmin Connect og prøv igjen.",
  rate_limited: "Garmin avviser for mange forsøk akkurat nå. Vent noen minutter og prøv igjen.",
  unknown: "Kunne ikke koble til Garmin. Prøv igjen om litt.",
} as const;

export async function POST(request: Request) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse || !user) return errorResponse!;

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }
  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: "Fyll inn e-post og passord." }, { status: 400 });
  }

  const result = await connectGarminAccount(user.id, email, password);
  if (!result.ok) {
    const status = result.reason === "invalid_credentials" ? 401 : result.reason === "rate_limited" ? 429 : 502;
    return NextResponse.json({ error: MESSAGES[result.reason] }, { status });
  }
  return NextResponse.json({ ok: true, displayName: result.displayName });
}
