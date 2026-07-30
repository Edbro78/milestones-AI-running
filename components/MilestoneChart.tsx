"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint, ProgressStatus } from "@/lib/progress";
import { formatEstimate, isTimeMetric } from "@/lib/time";

export function MilestoneChart({
  title,
  metric,
  points,
  status,
}: {
  title: string;
  metric: string;
  points: ChartPoint[];
  status: ProgressStatus;
}) {
  const timeMetric = isTimeMetric(metric);

  return (
    <div className="panel rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl">{title}</h3>
          <p className="text-sm text-[var(--ink-muted)]">Gjenværende dager til mål</p>
        </div>
        <p
          className={`text-sm font-semibold ${
            status.ahead ? "text-[var(--green)]" : "text-[var(--ink)]"
          }`}
        >
          {status.message}
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid stroke="rgba(20,32,26,0.08)" />
            <XAxis
              dataKey="daysRemaining"
              reversed
              tick={{ fontSize: 12 }}
              label={{ value: "Dager igjen", position: "insideBottom", offset: -2 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v: number) =>
                timeMetric ? formatEstimate(v, metric) : String(v)
              }
              width={70}
            />
            <Tooltip
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value);
                const label = name === "onTrack" ? "On-track" : "Estimat";
                return [Number.isFinite(n) ? formatEstimate(n, metric) : "—", label];
              }}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as ChartPoint | undefined;
                return p?.label
                  ? `${p.label} · ${label} dager igjen${p.testResult ? ` · Test: ${p.testResult}` : ""}`
                  : `${label} dager igjen`;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="onTrack"
              name="On-track"
              stroke="#8fbc2a"
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Estimat"
              stroke="#0f3d2e"
              strokeWidth={2.5}
              connectNulls
              dot={(props) => {
                const { cx, cy, payload } = props as {
                  cx?: number;
                  cy?: number;
                  payload?: ChartPoint;
                };
                if (cx == null || cy == null) return null;
                if (payload?.isTestRun) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#c4f04d"
                      stroke="#0f3d2e"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle cx={cx} cy={cy} r={3} fill="#0f3d2e" />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
