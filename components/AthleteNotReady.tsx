import Link from "next/link";
import type { Athlete } from "@/lib/athletes";

export function AthleteNotReady({ athlete }: { athlete: Athlete }) {
  return (
    <div className="panel rounded-2xl p-8">
      <h2 className="font-display text-3xl">{athlete.name}</h2>
      <p className="mt-3 max-w-xl text-[var(--ink-muted)]">
        Garmin er ikke koblet for denne utøveren ennå. Velg Edvard Brøther for å se
        live data, eller kom tilbake når Bernt er satt opp.
      </p>
      <Link href="/velg" className="btn btn-primary mt-6">
        Bytt utøver
      </Link>
    </div>
  );
}
