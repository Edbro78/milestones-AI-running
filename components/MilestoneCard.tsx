import Link from "next/link";
import type { Milestone } from "@/lib/types";

export function MilestoneCard({
  milestone,
  daysSinceTest,
}: {
  milestone: Milestone;
  daysSinceTest?: number | null;
}) {
  return (
    <div className="panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            {milestone.status}
          </p>
          <h3 className="font-display text-2xl">{milestone.title}</h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {milestone.target_metric}: {milestone.target_value} · frist {milestone.target_date}
          </p>
          {milestone.baseline_estimate ? (
            <p className="mt-2 text-sm">
              Baseline: <strong>{milestone.baseline_estimate}</strong>
            </p>
          ) : null}
        </div>
        <Link href="/test-runs" className="btn btn-ghost text-sm">
          Testløp
        </Link>
      </div>
      {daysSinceTest != null && daysSinceTest > 16 ? (
        <p className="mt-4 rounded-lg bg-[rgba(201,162,39,0.15)] px-3 py-2 text-sm font-medium text-[#7a6210]">
          Tid for testløp? Det er {daysSinceTest} dager siden forrige.
        </p>
      ) : null}
    </div>
  );
}
