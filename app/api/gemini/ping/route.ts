import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { pingGemini } from "@/lib/ai";

export async function GET() {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const text = await pingGemini();
    return NextResponse.json({
      ok: true,
      model: "gemini-2.5-flash",
      message: text,
    });
  } catch (err) {
    console.error("[api/gemini/ping]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Gemini-feil",
      },
      { status: 502 },
    );
  }
}
