"use client";

import { FormEvent, useState } from "react";

export function GarminConnectForm({ reconnect = false }: { reconnect?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/garmin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Kunne ikke koble til Garmin.");
      setPassword("");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke koble til Garmin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="garmin-email">
          Garmin-e-post
        </label>
        <input
          id="garmin-email"
          className="input"
          type="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </div>
      <div>
        <label className="label" htmlFor="garmin-password">
          Garmin-passord
        </label>
        <input
          id="garmin-password"
          className="input"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <p className="text-xs" style={{ color: "var(--gray-500)" }}>
        Passordet brukes én gang til å hente en tilgangsnøkkel fra Garmin, og lagres ikke.
      </p>
      {error ? (
        <p
          role="alert"
          className="p-3 text-sm"
          style={{
            background: "var(--blue-50)",
            color: "var(--gray-700)",
            border: "1px solid var(--blue-200)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Kobler til Garmin…" : reconnect ? "Koble til Garmin på nytt" : "Koble til Garmin"}
      </button>
    </form>
  );
}
