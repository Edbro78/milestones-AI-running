"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export function LoginForm({ error }: { error?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    error ? "Innloggingen feilet. Prøv igjen." : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
        throw new Error("Supabase er ikke konfigurert (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("invalid login")) {
          throw new Error("Feil e-post eller passord.");
        }
        throw error;
      }
      // Dashboardet sender videre til Garmin-tilkobling hvis den mangler.
      window.location.href = "/dashboard";
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Innlogging feilet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="panel mx-auto w-full max-w-md p-6 sm:p-8"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium"
        style={{ color: "var(--gray-500)" }}
      >
        <span aria-hidden="true">←</span> Tilbake
      </Link>

      <h1 className="text-3xl" style={{ fontWeight: 500, color: "var(--sp-navy)" }}>
        Logg inn
      </h1>
      <p className="mt-1.5 text-[15px]" style={{ color: "var(--gray-500)" }}>
        Velkommen tilbake til Milestones.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="email">
            E-post
          </label>
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
            placeholder="navn@firma.no"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Passord
          </label>
          <input
            id="password"
            className="input"
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
      </div>

      {message ? (
        <p
          role="alert"
          className="mt-4 p-3 text-sm"
          style={{
            background: "var(--blue-50)",
            color: "var(--gray-700)",
            border: "1px solid var(--blue-200)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
        {loading ? "Vent…" : "Logg inn"}
      </button>
    </form>
  );
}
