"use client";

import { useEffect, useState } from "react";
import { MetricLineChart } from "@/components/MetricLineChart";
import type { DayMetrics } from "@/lib/types";

export function ThirtyDayDashboard() {
  const [days, setDays] = useState<DayMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/garmin/history?days=60");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Kunne ikke hente Garmin-data");
        if (!cancelled) setDays(data.days || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ukjent feil");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="panel rounded-2xl p-6 animate-pulse">
        <p className="text-[var(--ink-muted)]">
          Henter siste 60 dager fra Garmin (kan ta litt tid)…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel rounded-2xl p-6">
        <h2 className="font-display text-2xl">Kunne ikke hente data</h2>
        <p className="mt-2 text-[var(--ink-muted)]">{error}</p>
      </div>
    );
  }

  const chartData = days.map((d) => ({
    date: d.date,
    body_battery: d.body_battery,
    sleep_score: d.sleep_score,
    hrv: d.hrv,
    distance_km: d.distance_km,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MetricLineChart
        title="Body Battery"
        unit="0–100"
        data={chartData}
        dataKey="body_battery"
        color="#0f3d2e"
      />
      <MetricLineChart
        title="Sleep score"
        unit="0–100"
        data={chartData}
        dataKey="sleep_score"
        color="#8fbc2a"
      />
      <MetricLineChart
        title="HRV"
        unit="ms"
        data={chartData}
        dataKey="hrv"
        color="#2f6f5e"
      />
      <MetricLineChart
        title="Km løpt per dag"
        unit="km"
        data={chartData}
        dataKey="distance_km"
        color="#c9a227"
      />
    </div>
  );
}
