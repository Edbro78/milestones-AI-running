import Link from "next/link";
import type { Athlete } from "@/lib/athletes";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/milestones", label: "Mine mål" },
  { href: "/trafikklys", label: "Trafikklys" },
  { href: "/anbefaling", label: "Anbefaling" },
  { href: "/settings", label: "Innstillinger" },
];

export function AppNav({
  email,
  athlete,
}: {
  email?: string | null;
  athlete?: Athlete | null;
}) {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
      <div className="flex flex-wrap items-end gap-4">
        <Link href="/velg" className="group">
          <p className="font-display text-2xl text-[var(--brand)] transition-transform group-hover:-translate-y-0.5 md:text-3xl">
            Milestones
          </p>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
            AI Running
          </p>
        </Link>
        {athlete ? (
          <Link
            href="/velg"
            className="mb-0.5 rounded-full border border-[var(--line)] bg-white/50 px-3 py-1 text-sm text-[var(--ink-muted)] transition hover:border-[var(--brand)] hover:text-[var(--ink)]"
            title="Bytt utøver"
          >
            {athlete.name}
          </Link>
        ) : null}
      </div>
      <nav className="flex flex-wrap items-center gap-1 md:gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3 py-1.5 text-sm text-[var(--ink-muted)] transition hover:bg-white/50 hover:text-[var(--ink)]"
          >
            {l.label}
          </Link>
        ))}
        {email ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-ghost ml-1 text-sm">
              Logg ut
            </button>
          </form>
        ) : null}
      </nav>
    </header>
  );
}
