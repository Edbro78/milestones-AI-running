"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { addMonthsISO, todayISO } from "@/lib/time";

export function CreateMilestoneForm({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const today = todayISO();
  const [title, setTitle] = useState("");
  const [targetMetric, setTargetMetric] = useState("maraton_tid");
  const [targetValue, setTargetValue] = useState("2:59:59");
  const [startDate, setStartDate] = useState(today);
  const [targetDate, setTargetDate] = useState(addMonthsISO(today, 6));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!canCreate) {
    return (
      <p className="panel rounded-2xl p-5 text-[var(--ink-muted)]">
        Du har allerede 3 aktive mål. Sett et til «fullført» for å legge til nytt.
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/claude/baseline-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          target_metric: targetMetric,
          target_value: targetValue,
          start_date: startDate,
          target_date: targetDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunne ikke opprette mål");
      setInfo(data.begrunnelse || "Mål opprettet");
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel rounded-2xl p-6">
      <h2 className="font-display text-2xl">Nytt mål</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Målbeskrivelse</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maraton sub 3:00:00" />
        </div>
        <div>
          <label className="label">Metrikk</label>
          <input className="input" required value={targetMetric} onChange={(e) => setTargetMetric(e.target.value)} />
        </div>
        <div>
          <label className="label">Målverdi</label>
          <input className="input" required value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
        </div>
        <div>
          <label className="label">Startdato</label>
          <input className="input" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Måldato (maks 6 mnd)</label>
          <input
            className="input"
            type="date"
            required
            value={targetDate}
            max={addMonthsISO(startDate, 6)}
            min={startDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--red)]">{error}</p> : null}
      {info ? <p className="mt-3 text-sm text-[var(--ink-muted)]">{info}</p> : null}
      <button className="btn btn-primary mt-5" disabled={loading}>
        {loading ? "Henter baseline fra Claude…" : "Opprett mål"}
      </button>
    </form>
  );
}
