"use client";

import type { Trafikklys } from "@/lib/types";

const COLORS: Record<Trafikklys, { bg: string; ring: string; label: string }> = {
  grønt: { bg: "#1f8a4c", ring: "rgba(31,138,76,0.25)", label: "Grønt" },
  gult: { bg: "#c9a227", ring: "rgba(201,162,39,0.25)", label: "Gult" },
  rødt: { bg: "#c23b3b", ring: "rgba(194,59,59,0.25)", label: "Rødt" },
};

export function TrafficLightBadge({
  trafikklys,
  begrunnelse,
  triggers,
}: {
  trafikklys: Trafikklys;
  begrunnelse?: string;
  triggers?: string[];
}) {
  const c = COLORS[trafikklys];

  return (
    <div className="panel rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: c.ring }}
          aria-hidden
        >
          <span
            className="h-8 w-8 rounded-full shadow-inner"
            style={{ background: c.bg }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-muted)]">
            Dagens trafikklys
          </p>
          <h2 className="font-display text-3xl text-[var(--ink)]">{c.label}</h2>
          {begrunnelse ? (
            <p className="mt-1 text-[var(--ink-muted)]">{begrunnelse}</p>
          ) : null}
        </div>
      </div>
      {triggers && triggers.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t border-[var(--line)] pt-3 text-sm text-[var(--ink-muted)]">
          {triggers.map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
