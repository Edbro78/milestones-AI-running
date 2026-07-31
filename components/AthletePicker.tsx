"use client";

import { useState } from "react";
import { ATHLETES, type Athlete } from "@/lib/athletes";

export function AthletePicker() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectAthlete(athlete: Athlete) {
    setLoadingId(athlete.id);
    setError(null);
    try {
      const res = await fetch("/api/athlete/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunne ikke velge utøver");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setLoadingId(null);
    }
  }

  return (
    <div className="athlete-picker">
      <header className="athlete-picker__brand home-rise">
        <p className="font-display text-5xl text-[var(--brand)] md:text-6xl">Milestones</p>
        <p className="mt-2 text-sm uppercase tracking-[0.28em] text-[var(--ink-muted)]">
          AI Running
        </p>
        <p className="mt-6 max-w-md text-lg text-[var(--ink-muted)]">
          Hvem skal vi følge i dag?
        </p>
      </header>

      <div className="athlete-picker__grid home-rise-delay">
        {ATHLETES.map((athlete, index) => (
          <button
            key={athlete.id}
            type="button"
            className={`athlete-tile athlete-tile--${athlete.id}`}
            style={{ animationDelay: `${0.18 + index * 0.1}s` }}
            onClick={() => selectAthlete(athlete)}
            disabled={loadingId != null}
          >
            <span className="athlete-tile__mark" aria-hidden>
              {athlete.shortName.slice(0, 1)}
            </span>
            <span className="athlete-tile__body">
              <span className="athlete-tile__name font-display">{athlete.name}</span>
              <span className="athlete-tile__blurb">{athlete.blurb}</span>
              {!athlete.garminReady ? (
                <span className="athlete-tile__badge">Snart klar</span>
              ) : null}
              <span className="athlete-tile__cta">
                {loadingId === athlete.id
                  ? "Åpner…"
                  : athlete.garminReady
                    ? "Åpne dashboard →"
                    : "Se profil →"}
              </span>
            </span>
          </button>
        ))}
      </div>

      {error ? <p className="mt-6 text-center text-sm text-[var(--red)]">{error}</p> : null}
    </div>
  );
}
