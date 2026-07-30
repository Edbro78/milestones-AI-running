"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SettingsForm({
  weeklyStructure,
  maxHr,
}: {
  weeklyStructure: string;
  maxHr: number | null;
}) {
  const router = useRouter();
  const [structure, setStructure] = useState(weeklyStructure);
  const [hr, setHr] = useState(maxHr?.toString() || "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Ikke innlogget");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      weekly_structure: structure,
      max_hr: hr ? Number(hr) : null,
      updated_at: new Date().toISOString(),
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Lagret");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel rounded-2xl p-6">
      <h2 className="font-display text-2xl">Ukestruktur & maxpuls</h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Ukestrukturen sendes med i alle Gemini-anbefalinger.
      </p>
      <div className="mt-5">
        <label className="label">Ukestruktur</label>
        <textarea
          className="input min-h-36"
          value={structure}
          onChange={(e) => setStructure(e.target.value)}
          placeholder={`Langtur søndag. Terskeløkt tirsdag. Økt veldig tidlig torsdag.\nIntervaller (200/400m) lørdag.`}
        />
      </div>
      <div className="mt-4 max-w-xs">
        <label className="label">Maxpuls</label>
        <input
          className="input"
          type="number"
          value={hr}
          onChange={(e) => setHr(e.target.value)}
          placeholder="185"
        />
      </div>
      {message ? <p className="mt-3 text-sm text-[var(--ink-muted)]">{message}</p> : null}
      <button className="btn btn-primary mt-5" disabled={loading}>
        {loading ? "Lagrer…" : "Lagre"}
      </button>
    </form>
  );
}
