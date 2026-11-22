"use client";

import { Card, SectionTitle } from "@/components/app/ui";
import { formatDuration, formatNumber, formatPace, recordDistanceKm } from "@/lib/format";
import type { Goal } from "@/lib/mockData";
import { raceRequirements } from "@/lib/raceRequirements";
import { SIGNAL_META, type SignalLight } from "@/lib/reportLight";
import type { DailyRecord } from "@/lib/types";

/** Snitt km per uke de siste 4 ukene (eller så mange dager vi har). */
function recentWeeklyKm(records: DailyRecord[]): number | null {
  const window = records.slice(-28);
  if (window.length < 7) return null;
  const km = window.reduce((s, r) => s + recordDistanceKm(r), 0);
  return (km / window.length) * 7;
}

function volumeLight(actual: number, minKm: number): SignalLight {
  if (actual >= minKm) return "green";
  if (actual >= minKm * 0.85) return "yellow";
  return "red";
}

/**
 * Milepæler fra docs/milepæler fra deep r.txt: tider på 3, 5 og 10 km og
 * ukevolum som må være på plass for at maratonmålet er realistisk.
 */
export function RaceRequirementsCard({
  goal,
  records,
}: {
  goal: Goal | null;
  records: DailyRecord[];
}) {
  if (!goal) {
    return (
      <Card style={{ padding: "0.75rem 0.85rem", flex: "none" }}>
        <SectionTitle>Krav for målet</SectionTitle>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--gray-500)" }}>
          Sett et maratonmål under «Mål og profil» for å se hvilke tider og hvilket ukevolum som kreves.
        </p>
      </Card>
    );
  }

  const req = raceRequirements(goal.targetTimeS);
  const actual = recentWeeklyKm(records);
  const light = actual != null ? volumeLight(actual, req.weeklyKm.minKm) : null;
  const tone = light ? SIGNAL_META[light] : null;

  return (
    <Card style={{ padding: "0.75rem 0.85rem", flex: "none" }}>
      <div className="flex items-baseline justify-between gap-2">
        <SectionTitle>Krav for {formatDuration(goal.targetTimeS)} på maraton</SectionTitle>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--gray-500)", whiteSpace: "nowrap" }}>
          VDOT {formatNumber(req.vdot, 1)}
        </span>
      </div>

      <p style={{ margin: "-0.15rem 0 0.45rem", fontSize: "0.74rem", color: "var(--gray-500)", lineHeight: 1.35 }}>
        Du bør klare disse tidene for at målet skal være realistisk.
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        {req.distances.map((d) => (
          <div
            key={d.key}
            className="flex flex-col items-center"
            style={{
              padding: "0.5rem 0.3rem",
              borderRadius: "var(--radius-md)",
              background: "var(--blue-50)",
              border: "1px solid var(--blue-200)",
            }}
          >
            <span style={{ fontSize: "0.66rem", fontWeight: 600, color: "var(--gray-600)" }}>{d.label}</span>
            <span style={{ fontSize: "1.02rem", fontWeight: 800, color: "var(--sp-navy)", marginTop: 2 }}>
              {formatDuration(d.maxSeconds)}
            </span>
            <span style={{ fontSize: "0.64rem", color: "var(--gray-500)" }}>
              {formatPace(d.maxSeconds / (d.distanceM / 1000))}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between gap-2"
        style={{
          marginTop: "0.6rem",
          padding: "0.55rem 0.65rem",
          borderRadius: "var(--radius-md)",
          background: tone?.bg ?? "var(--gray-100)",
          border: `1px solid ${tone?.border ?? "var(--border)"}`,
        }}
      >
        <div className="min-w-0">
          <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, color: "var(--gray-600)" }}>
            Anbefalt ukevolum
          </p>
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--sp-navy)" }}>
            {req.weeklyKm.minKm}–{req.weeklyKm.maxKm} km/uke
          </p>
        </div>
        {actual != null ? (
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "0.66rem", color: "var(--gray-600)" }}>Ditt snitt 4 uker</p>
            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: tone?.text }}>
              {formatNumber(actual, 0)} km
            </p>
          </div>
        ) : null}
      </div>

      <p style={{ margin: "0.45rem 0 0", fontSize: "0.68rem", color: "var(--gray-400)", lineHeight: 1.35 }}>
        Beregnet med Daniels&apos; VDOT og kravsmatrisen i milepæl-dokumentet. Volumet gjelder de siste 12–16 ukene før løpet.
      </p>
    </Card>
  );
}
