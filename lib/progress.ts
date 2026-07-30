import {
  daysBetween,
  estimateToNumber,
  formatEstimate,
  formatSeconds,
  isTimeMetric,
  todayISO,
} from "@/lib/time";
import type { Milestone, TestRun } from "@/lib/types";

export interface ChartPoint {
  daysRemaining: number;
  actual: number | null;
  onTrack: number | null;
  label: string;
  isTestRun?: boolean;
  testResult?: string;
}

export interface ProgressStatus {
  message: string;
  ahead: boolean;
  deltaLabel: string;
}

export function buildMilestoneChartData(
  milestone: Milestone,
  testRuns: TestRun[],
): { points: ChartPoint[]; status: ProgressStatus } {
  const today = todayISO();
  const totalDays = Math.max(1, daysBetween(milestone.start_date, milestone.target_date));
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(milestone.start_date, today)));
  const remaining = Math.max(0, daysBetween(today, milestone.target_date));

  const baseline = estimateToNumber(milestone.baseline_estimate, milestone.target_metric);
  const target = estimateToNumber(milestone.target_value, milestone.target_metric);

  const sortedRuns = [...testRuns].sort((a, b) => a.date.localeCompare(b.date));

  const points: ChartPoint[] = [];

  // On-track + actual series over remaining-day axis from start→today→target
  for (let day = 0; day <= totalDays; day++) {
    const daysRem = totalDays - day;
    // Only include points from "now" forward on X (shrinking remaining axis),
    // plus historical actuals mapped to remaining-at-that-date.
    const date = new Date(milestone.start_date + "T12:00:00");
    date.setDate(date.getDate() + day);
    const dateISO = date.toISOString().slice(0, 10);
    if (dateISO > today && day !== totalDays) continue;

    let onTrack: number | null = null;
    if (baseline != null && target != null) {
      const t = day / totalDays;
      onTrack = baseline + (target - baseline) * t;
    }

    let actual: number | null = null;
    if (day === 0 && baseline != null) actual = baseline;

    const run = sortedRuns.find((r) => r.date === dateISO);
    if (run?.claude_estimate_after) {
      actual = estimateToNumber(run.claude_estimate_after, milestone.target_metric);
    }

    // Skip empty historical days without data to keep chart clean,
    // but always keep start, latest estimate days, and today.
    const isToday = dateISO === today;
    const isStart = day === 0;
    if (!isStart && !isToday && !run && day !== totalDays) continue;

    points.push({
      daysRemaining: daysRem,
      actual,
      onTrack,
      label: dateISO,
      isTestRun: Boolean(run),
      testResult: run
        ? `${run.distance_km} km · ${formatSeconds(run.duration_seconds)}`
        : undefined,
    });
  }

  // Ensure today point exists
  if (!points.some((p) => p.label === today)) {
    const t = elapsed / totalDays;
    points.push({
      daysRemaining: remaining,
      actual: null,
      onTrack:
        baseline != null && target != null
          ? baseline + (target - baseline) * t
          : null,
      label: today,
    });
  }

  points.sort((a, b) => b.daysRemaining - a.daysRemaining);

  // Fill forward actual line
  let lastActual: number | null = baseline;
  for (const p of points) {
    if (p.actual != null) lastActual = p.actual;
    else if (p.label <= today) p.actual = lastActual;
  }

  const latestActual =
    [...points].reverse().find((p) => p.label <= today && p.actual != null)?.actual ??
    baseline;
  const onTrackToday =
    baseline != null && target != null
      ? baseline + (target - baseline) * (elapsed / totalDays)
      : null;

  const status = buildStatus(latestActual, onTrackToday, milestone.target_metric);
  return { points, status };
}

function buildStatus(
  latest: number | null | undefined,
  onTrack: number | null | undefined,
  metric: string,
): ProgressStatus {
  if (latest == null || onTrack == null) {
    return {
      message: "Ikke nok data til å beregne status ennå",
      ahead: false,
      deltaLabel: "—",
    };
  }

  const delta = latest - onTrack;
  // For times, lower is better (ahead if latest < onTrack)
  const lowerIsBetter = isTimeMetric(metric);
  const ahead = lowerIsBetter ? delta < 0 : delta > 0;
  const abs = Math.abs(delta);
  const deltaLabel = isTimeMetric(metric)
    ? formatSeconds(abs)
    : formatEstimate(abs, metric);

  return {
    ahead,
    deltaLabel,
    message: ahead
      ? `Du er ${deltaLabel} foran planen`
      : abs < 1
        ? "Du er på planen"
        : `Du ligger ${deltaLabel} bak planen`,
  };
}
