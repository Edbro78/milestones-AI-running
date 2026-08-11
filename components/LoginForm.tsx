"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
        throw new Error(
          "Supabase er ikke konfigurert (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).",
        );
      }

      const supabase = createClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("invalid login")) {
            throw new Error(
              "Feil e-post/passord, eller konto finnes ikke. Prøv «Opprett konto» først.",
            );
          }
          throw error;
        }
        window.location.href = "/dashboard";
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.session) {
        window.location.href = "/dashboard";
        return;
      }

      setMessage(
        "Konto opprettet. Hvis e-postbekreftelse er på i Supabase, sjekk innboksen. Ellers kan du logge inn nå.",
      );
      setMode("login");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Innlogging feilet");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setMessage(null);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="panel mx-auto w-full max-w-md rounded-3xl p-6 sm:p-8"
    >
      <a
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--ink-muted)]"
      >
        <span aria-hidden="true">←</span> Tilbake
      </a>

      <h1 className="font-display text-4xl text-[var(--brand)]">Milestones</h1>
      <p className="mt-1 text-sm uppercase tracking-[0.2em] text-[var(--ink-muted)]">
        AI Running
      </p>
      <p className="mt-4 text-[var(--ink-muted)]">
        Personlig løpetrener med Garmin + Gemini.
      </p>

      <div
        role="tablist"
        aria-label="Velg innlogging eller registrering"
        className="mt-7 grid grid-cols-2 gap-1 rounded-full border border-[var(--line)] bg-white/50 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => switchMode("login")}
          className={`min-h-11 rounded-full text-sm font-semibold transition ${
            mode === "login"
              ? "bg-[var(--brand)] text-[#f4ffe8] shadow"
              : "text-[var(--ink-muted)]"
          }`}
        >
          Logg inn
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => switchMode("signup")}
          className={`min-h-11 rounded-full text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-[var(--brand)] text-[#f4ffe8] shadow"
              : "text-[var(--ink-muted)]"
          }`}
        >
          Opprett konto
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-post
          </label>
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
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
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-white/50 p-3 text-sm text-[var(--ink-muted)]">
          {message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
        {loading ? "Vent…" : mode === "login" ? "Logg inn" : "Opprett konto"}
      </button>
    </form>
  );
}
