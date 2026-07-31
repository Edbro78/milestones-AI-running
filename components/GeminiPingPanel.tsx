"use client";

import { useEffect, useState } from "react";

export function GeminiPingPanel() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runTest() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/gemini/ping");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Gemini-feil");
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runTest();
  }, []);

  return (
    <div className="panel rounded-2xl p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        Gemini API-test
      </p>
      <h2 className="font-display mt-2 text-3xl">Anbefalt trening i dag</h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Foreløpig vises kun en testrespons for å bekrefte at API-et fungerer. Full
        anbefaling kommer senere.
      </p>

      <div className="mt-6 rounded-xl border border-[var(--line)] bg-white/60 p-4">
        {loading ? (
          <p className="text-[var(--ink-muted)]">Kontakter Gemini…</p>
        ) : error ? (
          <p className="text-[var(--red)]">{error}</p>
        ) : (
          <p className="text-lg leading-relaxed">{message}</p>
        )}
      </div>

      <button type="button" className="btn btn-primary mt-5" onClick={runTest} disabled={loading}>
        {loading ? "Tester…" : "Kjør API-test på nytt"}
      </button>
    </div>
  );
}
