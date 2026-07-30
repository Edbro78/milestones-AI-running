"use client";

import { useEffect, useState } from "react";
import { TrafficLightBadge } from "@/components/TrafficLightBadge";
import type { DailyCheckin, DailyRecommendation, TrafficLightResult } from "@/lib/types";

export function DailyRecommendationPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [traffic, setTraffic] = useState<TrafficLightResult | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/claude/daily-recommendation", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Kunne ikke hente anbefaling");
        if (cancelled) return;
        setCheckin(data.checkin);
        setTraffic(data.traffic ?? null);
        setCached(Boolean(data.cached));
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
        <p className="text-[var(--ink-muted)]">Henter Garmin + Gemini-anbefaling…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel rounded-2xl border-[rgba(194,59,59,0.35)] p-6">
        <h2 className="font-display text-2xl">Anbefaling utilgjengelig</h2>
        <p className="mt-2 text-[var(--ink-muted)]">{error}</p>
      </div>
    );
  }

  const rec = checkin?.claude_recommendation as DailyRecommendation | null;
  const light = (rec?.trafikklys || checkin?.trafikklys || "gult") as
    | "grønt"
    | "gult"
    | "rødt";

  return (
    <div className="space-y-4">
      <TrafficLightBadge
        trafikklys={light}
        begrunnelse={rec?.begrunnelse || traffic?.begrunnelse}
        triggers={traffic?.triggers}
      />

      <div className="panel rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
              Dagens anbefaling {cached ? "(cachet)" : ""}
            </p>
            <h2 className="font-display text-3xl capitalize">
              {rec?.okt_type || "—"}
            </h2>
          </div>
          <div className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[#f4ffe8]">
            {rec?.anbefalt_varighet_min ?? "—"} min
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          Intensitet: {rec?.anbefalt_intensitet || "—"}
        </p>
        <p className="mt-4 text-lg leading-relaxed">{rec?.kommentar || "Ingen kommentar"}</p>
      </div>
    </div>
  );
}
