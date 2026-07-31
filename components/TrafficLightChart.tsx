"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayMetrics, Trafikklys } from "@/lib/types";

const LEVEL: Record<Trafikklys, number> = {
  rødt: 1,
  gult: 2,
  grønt: 3,
};

const LABEL: Record<number, string> = {
  1: "Rødt",
  2: "Gult",
  3: "Grønt",
};

export function TrafficLightChart({ days }: { days: DayMetrics[] }) {
  const data = days.map((d) => ({
    date: d.date,
    level: LEVEL[d.trafikklys],
    label: d.trafikklys,
  }));

  return (
    <div className="panel rounded-2xl p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl">Trafikklys over tid</h3>
          <p className="text-sm text-[var(--ink-muted)]">1 = rødt · 2 = gult · 3 = grønt</p>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(20,32,26,0.08)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: string) => v.slice(5)}
              minTickGap={20}
            />
            <YAxis
              domain={[1, 3]}
              ticks={[1, 2, 3]}
              tick={{ fontSize: 12 }}
              width={52}
              tickFormatter={(v: number) => LABEL[v] || String(v)}
            />
            <Tooltip
              labelFormatter={(label) => String(label)}
              formatter={(value) => {
                const n = typeof value === "number" ? value : Number(value);
                return [LABEL[n] || String(value), "Trafikklys"];
              }}
            />
            <Line
              type="stepAfter"
              dataKey="level"
              stroke="#0f3d2e"
              strokeWidth={2.4}
              dot={{ r: 3, fill: "#0f3d2e" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
