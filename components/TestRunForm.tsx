"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Milestone } from "@/lib/types";
import { todayISO } from "@/lib/time";

function parseDurationInput(h: string, m: string, s: string): number {
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

export function TestRunForm({ milestones }: { milestones: Milestone[] }) {
  const router = useRouter();
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [distance, setDistance] = useState("10");
  const [h, setH] = useState("0");
  const [m, setM] = useState("45");
  const [s, setS] = useState("0");
  const [avgHr, setAvgHr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!milestones.length) {
    return (
      <p className="panel rounded-2xl p-5 text-[var(--ink-muted)]">
        Du trenger minst ett aktivt mål før du kan registrere testløp.
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/claude/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: milestoneId,
          date,
          distance_km: Number(distance),
          duration_seconds: parseDurationInput(h, m, s),
          avg_hr: avgHr ? Number(avgHr) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kalibrering feilet");
      setInfo(
        `Nytt estimat: ${data.testRun?.claude_estimate_after || "—"}. ${data.begrunnelse || ""}`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil");
    } finally {
      setLoading(false);
    }
  }

  async function completeMilestone(id: string) {
    const supabase = createClient();
    await supabase.from("milestones").update({ status: "fullført" }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="panel rounded-2xl p-6">
        <h2 className="font-display text-2xl">Registrer testløp</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Aktivt mål</label>
            <select
              className="input"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
            >
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dato</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Distanse (km)</label>
            <input className="input" type="number" step="0.01" required value={distance} onChange={(e) => setDistance(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Tid (t : m : s)</label>
            <div className="grid grid-cols-3 gap-2">
              <input className="input" value={h} onChange={(e) => setH(e.target.value)} placeholder="t" />
              <input className="input" value={m} onChange={(e) => setM(e.target.value)} placeholder="m" />
              <input className="input" value={s} onChange={(e) => setS(e.target.value)} placeholder="s" />
            </div>
          </div>
          <div>
            <label className="label">Snittpuls (valgfritt)</label>
            <input className="input" type="number" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--red)]">{error}</p> : null}
        {info ? <p className="mt-3 text-sm text-[var(--ink-muted)]">{info}</p> : null}
        <button className="btn btn-primary mt-5" disabled={loading}>
          {loading ? "Kalibrerer med Gemini…" : "Lagre og kalibrer"}
        </button>
      </form>

      <div className="panel rounded-2xl p-5">
        <h3 className="font-display text-xl">Fullfør mål</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {milestones.map((m) => (
            <button
              key={m.id}
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => completeMilestone(m.id)}
            >
              Fullfør: {m.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
