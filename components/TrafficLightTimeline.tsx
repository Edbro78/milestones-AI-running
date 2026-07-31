"use client";

import { useEffect, useState } from "react";
import { TrafficLightChart } from "@/components/TrafficLightChart";
import type { DayMetrics } from "@/lib/types";

const COLORS = {
  grønt: "#1f8a4c",
  gult: "#c9a227",
  rødt: "#c23b3b",
} as const;

export function TrafficLightTimeline() {
  const [days, setDays] = useState<DayMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/garmin/history?days=60");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Kunne ikke hente data");
        if (!cancelled) setDays(data.days || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ukjent feil");
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
        <p className="text-[var(--ink-muted)]">Beregner trafikklys for siste 60 dager…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel rounded-2xl p-6">
        <p className="text-[var(--ink-muted)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel rounded-2xl p-5">
        <p className="text-sm text-[var(--ink-muted)]">
          Midlertidig beregning: gode Body Battery / sleep / HRV → grønt, lave verdier →
          rødt. Detaljerte regler kommer senere.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: COLORS.rødt }} /> 1 Rødt
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: COLORS.gult }} /> 2 Gult
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: COLORS.grønt }} /> 3 Grønt
          </span>
        </div>
      </div>

      <TrafficLightChart days={days} />

      <div className="panel rounded-2xl p-5">
        <h3 className="font-display mb-3 text-xl">Dag for dag</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {days.map((d) => (
            <div
              key={d.date}
              className="rounded-xl border border-[var(--line)] bg-white/50 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--ink-muted)]">{d.date.slice(5)}</p>
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ background: COLORS[d.trafikklys] }}
                  title={d.trafikklys}
                />
              </div>
              <p className="mt-2 text-sm font-semibold capitalize">{d.trafikklys}</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                BB {d.body_battery ?? "—"} · Sleep {d.sleep_score ?? "—"} · HRV {d.hrv ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
