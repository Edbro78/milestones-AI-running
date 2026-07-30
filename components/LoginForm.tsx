"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Konto opprettet. Du kan logge inn med en gang hvis e-postbekreftelse er av.");
        setMode("login");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Innlogging feilet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel mx-auto w-full max-w-md rounded-2xl p-8">
      <h1 className="font-display text-4xl text-[var(--brand)]">Milestones</h1>
      <p className="mt-1 text-sm uppercase tracking-[0.2em] text-[var(--ink-muted)]">
        AI Running
      </p>
      <p className="mt-4 text-[var(--ink-muted)]">
        Personlig løpetrener med Garmin + Claude.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-post
          </label>
          <input
            id="email"
            className="input"
            type="email"
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

      {message ? <p className="mt-4 text-sm text-[var(--ink-muted)]">{message}</p> : null}

      <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
        {loading ? "Vent…" : mode === "login" ? "Logg inn" : "Opprett konto"}
      </button>

      <button
        type="button"
        className="mt-4 w-full text-sm text-[var(--ink-muted)] underline"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Ny her? Opprett konto" : "Har konto? Logg inn"}
      </button>
    </form>
  );
}
