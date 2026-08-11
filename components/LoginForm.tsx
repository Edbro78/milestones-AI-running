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
              "Feil e-post eller passord, eller kontoen finnes ikke. Prøv «Opprett konto» først.",
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
        "Kontoen er opprettet. Er e-postbekreftelse på i Supabase, sjekk innboksen. Ellers kan du logge inn nå.",
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

  const tabBase =
    "h-10 rounded-md text-sm font-semibold transition";
  const tabActive = { background: "var(--white)", color: "var(--sp-navy)", boxShadow: "var(--shadow-sm)" };
  const tabIdle = { background: "transparent", color: "var(--gray-500)" };

  return (
    <form
      onSubmit={onSubmit}
      className="panel mx-auto w-full max-w-md p-6 sm:p-8"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <a
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium"
        style={{ color: "var(--gray-500)" }}
      >
        <span aria-hidden="true">←</span> Tilbake
      </a>

      <h1 className="text-3xl" style={{ fontWeight: 500, color: "var(--sp-navy)" }}>
        {mode === "login" ? "Logg inn" : "Opprett konto"}
      </h1>
      <p className="mt-1.5 text-[15px]" style={{ color: "var(--gray-500)" }}>
        {mode === "login"
          ? "Velkommen tilbake til Milestones."
          : "Kom i gang med din personlige løpetrener."}
      </p>

      <div
        role="tablist"
        aria-label="Velg innlogging eller registrering"
        className="mt-6 grid grid-cols-2 gap-1 p-1"
        style={{ background: "var(--gray-100)", borderRadius: "var(--radius-md)" }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => switchMode("login")}
          className={tabBase}
          style={mode === "login" ? tabActive : tabIdle}
        >
          Logg inn
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => switchMode("signup")}
          className={tabBase}
          style={mode === "signup" ? tabActive : tabIdle}
        >
          Opprett konto
        </button>
      </div>

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
      </div>

      {message ? (
        <p
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
        {loading ? "Vent…" : mode === "login" ? "Logg inn" : "Opprett konto"}
      </button>
    </form>
  );
}
