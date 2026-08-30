"use client";

import { formatDuration } from "@/lib/format";
import type { MarathonFormTrend } from "@/lib/prognosis";

export function GoalTrendChart({
  trend,
  height = 168,
}: {
  trend: MarathonFormTrend;
  height?: number;
}) {
  const width = 320;
  const padL = 44;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const tMin = Math.min(0, ...trend.history.map((p) => p.t));
  const tMax = Math.max(trend.daysLeft, 1);
  const allS = [
    trend.targetS,
    trend.todayS,
    ...trend.history.map((p) => p.seconds),
    ...trend.plan.map((p) => p.seconds),
  ];
  const sMin = Math.min(...allS) - 30;
  const sMax = Math.max(...allS) + 30;
  const sRange = sMax - sMin || 1;
  const tRange = tMax - tMin || 1;

  const x = (t: number) => padL + ((t - tMin) / tRange) * innerW;
  const y = (s: number) => padT + ((sMax - s) / sRange) * innerH;

  const toPoints = (pts: { t: number; seconds: number }[]) =>
    pts.map((p) => `${x(p.t).toFixed(1)},${y(p.seconds).toFixed(1)}`).join(" ");

  const xToday = x(0);
  const xRace = x(tMax);
  const yGoal = y(trend.targetS);
  const yToday = y(trend.todayS);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height, display: "block" }}
      role="img"
      aria-label="Formtrend mot maraton"
    >
      <line
        x1={padL}
        x2={width - padR}
        y1={yGoal}
        y2={yGoal}
        stroke="var(--blue-main)"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.55}
      />
      <line
        x1={xToday}
        x2={xToday}
        y1={padT}
        y2={height - padB}
        stroke="var(--gray-300)"
        strokeWidth={1}
      />
      <polyline
        points={toPoints(trend.history)}
        fill="none"
        stroke="var(--sp-navy)"
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={toPoints(trend.plan)}
        fill="none"
        stroke="var(--blue-main)"
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="5 3.5"
      />
      <circle cx={xToday} cy={yToday} r={3.4} fill="var(--sp-navy)" />
      <circle cx={xRace} cy={y(trend.targetS)} r={3.4} fill="var(--blue-main)" />

      <text
        x={padL - 4}
        y={yToday + 3}
        textAnchor="end"
        fill="var(--sp-navy)"
        fontSize="8.5"
        fontWeight={600}
      >
        {formatDuration(trend.todayS)}
      </text>
      <text
        x={padL - 4}
        y={yGoal + 3}
        textAnchor="end"
        fill="var(--blue-main)"
        fontSize="8.5"
        fontWeight={600}
      >
        {formatDuration(trend.targetS)}
      </text>
      <text
        x={xToday}
        y={height - 6}
        textAnchor="middle"
        fill="var(--gray-500)"
        fontSize="8"
      >
        I dag
      </text>
      <text
        x={xRace}
        y={height - 6}
        textAnchor="end"
        fill="var(--gray-500)"
        fontSize="8"
      >
        Løpsdag
      </text>
    </svg>
  );
}
