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

export function MetricLineChart({
  title,
  unit,
  data,
  dataKey,
  color = "#0f3d2e",
}: {
  title: string;
  unit?: string;
  data: Array<Record<string, string | number | null>>;
  dataKey: string;
  color?: string;
}) {
  return (
    <div className="panel rounded-2xl p-5">
      <div className="mb-3 flex items-end justify-between gap-2">
        <h3 className="font-display text-2xl">{title}</h3>
        {unit ? <p className="text-sm text-[var(--ink-muted)]">{unit}</p> : null}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(20,32,26,0.08)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: string) => v.slice(5)}
              minTickGap={24}
            />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              labelFormatter={(label) => String(label)}
              formatter={(value) => [
                value == null ? "—" : `${value}${unit ? ` ${unit}` : ""}`,
                title,
              ]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.4}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
