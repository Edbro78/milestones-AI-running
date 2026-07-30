import Anthropic from "@anthropic-ai/sdk";
import {
  BASELINE_ESTIMATE_SCHEMA,
  CALIBRATE_SCHEMA,
  CLAUDE_MODEL,
  DAILY_RECOMMENDATION_SCHEMA,
  buildSystemPrompt,
} from "@/lib/prompts";
import type { DailyRecommendation } from "@/lib/types";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

export function parseClaudeJson<T>(text: string): T {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(withoutFences) as T;
}

async function completeJson(system: string, user: string): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });

  const block = message.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return block.text;
}

export async function askDailyRecommendation(input: {
  maxHr?: number | null;
  weeklyStructure: string;
  trafficLight: string;
  trafficReason: string;
  snapshot: unknown;
  milestones: unknown;
  historySummary: string;
}): Promise<DailyRecommendation> {
  const system = buildSystemPrompt(input.maxHr);
  const user = `Gi dagens treningsanbefaling som JSON med eksakt dette skjemaet:
${DAILY_RECOMMENDATION_SCHEMA}

Kontekst:
- Ukestruktur: ${input.weeklyStructure || "(ikke satt)"}
- Beregnet trafikklys: ${input.trafficLight} — ${input.trafficReason}
- Garmin-snapshot: ${JSON.stringify(input.snapshot)}
- Aktive mål: ${JSON.stringify(input.milestones)}
- Historikk (7–14 dager, oppsummert): ${input.historySummary}`;

  const text = await completeJson(system, user);
  return parseClaudeJson<DailyRecommendation>(text);
}

export async function askBaselineEstimate(input: {
  maxHr?: number | null;
  weeklyStructure: string;
  title: string;
  targetMetric: string;
  targetValue: string;
  startDate: string;
  targetDate: string;
  activitiesSummary: string;
}): Promise<{ baseline_estimate: string; begrunnelse: string }> {
  const system = buildSystemPrompt(input.maxHr);
  const user = `Sett et realistisk baseline_estimate for dette målet. Svar som JSON:
${BASELINE_ESTIMATE_SCHEMA}

Mål: ${input.title}
Metrikk: ${input.targetMetric}
Målverdi: ${input.targetValue}
Periode: ${input.startDate} → ${input.targetDate}
Ukestruktur: ${input.weeklyStructure || "(ikke satt)"}
Garmin-aktiviteter siste ~90 dager (oppsummert): ${input.activitiesSummary}`;

  const text = await completeJson(system, user);
  return parseClaudeJson(text);
}

export async function askCalibrate(input: {
  maxHr?: number | null;
  weeklyStructure: string;
  milestone: unknown;
  testRun: unknown;
  trainingSinceLast: string;
  previousEstimate?: string | null;
}): Promise<{ claude_estimate_after: string; begrunnelse: string }> {
  const system = buildSystemPrompt(input.maxHr);
  const user = `Kalibrer estimatet etter dette testløpet. Svar som JSON:
${CALIBRATE_SCHEMA}

Mål: ${JSON.stringify(input.milestone)}
Testløp: ${JSON.stringify(input.testRun)}
Forrige estimat: ${input.previousEstimate || "(ingen)"}
Ukestruktur: ${input.weeklyStructure || "(ikke satt)"}
Trening siden forrige testløp: ${input.trainingSinceLast}`;

  const text = await completeJson(system, user);
  return parseClaudeJson(text);
}
