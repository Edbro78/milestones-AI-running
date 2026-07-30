import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/milestones", label: "Mine mål" },
  { href: "/test-runs", label: "Testløp" },
  { href: "/settings", label: "Innstillinger" },
];

export function AppNav({ email }: { email?: string | null }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
      <Link href="/dashboard" className="group">
        <p className="font-display text-2xl text-[var(--brand)] transition-transform group-hover:-translate-y-0.5 md:text-3xl">
          Milestones
        </p>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">
          AI Running
        </p>
      </Link>
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
