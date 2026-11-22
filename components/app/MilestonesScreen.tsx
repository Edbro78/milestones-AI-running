"use client";

import { useEffect, useState } from "react";
import type { SheetApi } from "@/components/app/AppShell";
import { Card } from "@/components/app/ui";
import {
  formatDate,
  formatPace,
  parseTimeToSeconds,
} from "@/lib/format";
import type { Goal } from "@/lib/mockData";
import {
  MILESTONE_META,
  MILESTONE_ORDER,
  dueLabel,
  evaluateLog,
  hrAtPct,
  latestLog,
  loadMilestoneLogs,
  logFreshness,
  milestoneTargets,
  nextDueIso,
  saveMilestoneLogs,
  toIsoDate,
  upsertMilestoneLog,
  type LogFreshness,
  type MilestoneKind,
  type MilestoneLog,
  type MilestoneTargets,
} from "@/lib/milestones";
import { SIGNAL_META } from "@/lib/reportLight";
import { loadStoredGoal } from "@/lib/goalStorage";
import { RaceRequirementsCard } from "@/components/app/RaceRequirementsCard";
import type { DailyRecord } from "@/lib/types";

function parseNb(value: string): number | undefined {
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parsePace(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const s = parseTimeToSeconds(value);
  return s > 0 ? s : undefined;
}

const FRESHNESS_LABEL: Record<LogFreshness, string> = {
  green: "Logget",
  yellow: "Over 1 mnd",
  red: "Over 2 mnd",
};

export function MilestonesScreen({
  sheet,
  goal: goalProp,
  hrMax,
  logs: logsProp,
  onLogsChange,
  records = [],
}: {
  sheet: SheetApi;
  records?: DailyRecord[];
  goal?: Goal | null;
  hrMax?: number | null;
  logs?: MilestoneLog[];
  onLogsChange?: (logs: MilestoneLog[]) => void;
}) {
  const [goal, setGoal] = useState<Goal | null>(goalProp ?? null);
  const [localLogs, setLocalLogs] = useState<MilestoneLog[]>([]);
  const logs = logsProp ?? localLogs;

  useEffect(() => {
    setGoal(loadStoredGoal(goalProp ?? null));
    if (logsProp === undefined) setLocalLogs(loadMilestoneLogs());
  }, [goalProp, logsProp]);

  const targets = goal
    ? milestoneTargets(goal.targetTimeS, hrMax ?? null)
    : null;

  function saveLog(entry: MilestoneLog) {
    const next = upsertMilestoneLog(logs, entry);
    if (onLogsChange) onLogsChange(next);
    else {
      setLocalLogs(next);
      saveMilestoneLogs(next);
    }
    sheet.closeSheet();
  }

  function openKind(kind: MilestoneKind) {
    const meta = MILESTONE_META[kind];
    sheet.openSheet(
      meta.title,
      <MilestoneSheet
        kind={kind}
        targets={targets}
        logs={logs}
        onSave={saveLog}
      />,
    );
  }

  return (
    <div className="flex h-full flex-col gap-2.5" style={{ overflowY: "auto" }}>
      <RaceRequirementsCard goal={goal} records={records} />
      <p style={{ color: "var(--gray-500)", fontSize: "0.78rem", lineHeight: 1.35, margin: "0.3rem 0 0" }}>
        Dine testøkter: tre kalibreringsøkter. Hver logg justerer maratonestimatet på Mål.
        {goal
          ? ` Mål ${formatPace(milestoneTargets(goal.targetTimeS, null).mpPaceS)}.`
          : " Sett et maratonmål for eksakte fartsmerker."}
      </p>
      {MILESTONE_ORDER.map((kind) => {
        const meta = MILESTONE_META[kind];
        const last = latestLog(logs, kind);
        const due = nextDueIso(kind, logs, goal?.eventDate);
        const verdict = last && targets ? evaluateLog(last, targets) : null;
        const freshness = logFreshness(last?.date);
        const tone = freshness ? SIGNAL_META[freshness] : null;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => openKind(kind)}
            className="text-left"
            style={{ flex: "none" }}
          >
            <Card
              style={{
                padding: "0.7rem 0.8rem",
                height: "100%",
                background: tone?.bg,
                borderColor: tone?.border,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span style={{ fontWeight: 700, color: "var(--sp-navy)" }}>
                  {meta.title}
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: tone?.text ?? "var(--gray-500)",
                  }}
                >
                  {freshness ? FRESHNESS_LABEL[freshness] : "Ikke logget"}
                </span>
              </div>
              <p style={{ fontSize: "0.76rem", color: "var(--gray-600)", marginTop: 2 }}>
                {meta.short}
                {targets
                  ? kind === "lt2"
                    ? ` · ${formatPace(targets.lt2PaceS)} · 88–92 %`
                    : kind === "mp"
                      ? ` · ${formatPace(targets.mpPaceS)} · 80–85 %`
                      : ` · ${formatPace(targets.easyPaceS)} + ${formatPace(targets.mpPaceS)}`
                  : ""}
              </p>
              <p style={{ fontSize: "0.74rem", color: "var(--gray-500)", marginTop: 6 }}>
                {last
                  ? `Sist ${formatDate(last.date)}${verdict ? ` · ${verdict.summary}` : ""}`
                  : `Neste ${formatDate(due)} · ${dueLabel(due)}`}
              </p>
              {last ? (
                <p style={{ fontSize: "0.72rem", color: "var(--gray-400)", marginTop: 2 }}>
                  Neste {formatDate(due)}
                </p>
              ) : null}
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function MilestoneSheet({
  kind,
  targets,
  logs,
  onSave,
}: {
  kind: MilestoneKind;
  targets: MilestoneTargets | null;
  logs: MilestoneLog[];
  onSave: (entry: MilestoneLog) => void;
}) {
  const meta = MILESTONE_META[kind];
  const [date, setDate] = useState(toIsoDate());
  const [avgPace, setAvgPace] = useState("");
  const [easyPace, setEasyPace] = useState("");
  const [mpPace, setMpPace] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [hr1, setHr1] = useState("");
  const [hr2, setHr2] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!date) {
      setError("Velg dato for økten.");
      return;
    }
    const existing = logs.find((l) => l.kind === kind && l.date === date);
    const entry: MilestoneLog = {
      id: existing?.id ?? `${kind}-${date}`,
      kind,
      date,
    };
    if (kind === "long") {
      entry.easyPaceS = parsePace(easyPace);
      entry.mpPaceS = parsePace(mpPace);
      entry.avgHrPart1 = parseNb(hr1);
      entry.avgHrPart2 = parseNb(hr2);
      if (!entry.easyPaceS || !entry.mpPaceS || !entry.avgHrPart1 || !entry.avgHrPart2) {
        setError("Fyll inn fart og puls for begge deler.");
        return;
      }
    } else {
      entry.avgPaceS = parsePace(avgPace);
      entry.avgHr = parseNb(avgHr);
      if (!entry.avgPaceS || !entry.avgHr) {
        setError("Fyll inn snittfart og snittpuls.");
        return;
      }
    }
    entry.maxHr = parseNb(maxHr);
    onSave(entry);
  }

  return (
    <div className="flex flex-col gap-3">
      <p style={{ color: "var(--gray-600)", fontSize: "0.82rem", lineHeight: 1.4 }}>
        {meta.protocol}
      </p>
      {targets ? <TargetBlock kind={kind} targets={targets} /> : null}

      <label className="label" htmlFor={`${kind}-date`}>
        Dato
      </label>
      <input
        id={`${kind}-date`}
        className="input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {kind === "long" ? (
        <>
          <Field
            id={`${kind}-easy`}
            label={`Fart del 1 (mål ${targets ? formatPace(targets.easyPaceS) : "—"})`}
            value={easyPace}
            onChange={setEasyPace}
            placeholder="4:50"
          />
          <Field
            id={`${kind}-mp`}
            label={`Fart del 2 (mål ${targets ? formatPace(targets.mpPaceS) : "—"})`}
            value={mpPace}
            onChange={setMpPace}
            placeholder="4:15"
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              id={`${kind}-hr1`}
              label="Puls del 1"
              value={hr1}
              onChange={setHr1}
              placeholder="140"
            />
            <Field
              id={`${kind}-hr2`}
              label="Puls del 2"
              value={hr2}
              onChange={setHr2}
              placeholder="160"
            />
          </div>
        </>
      ) : (
        <>
          <Field
            id={`${kind}-pace`}
            label={`Snittfart (mål ${
              targets
                ? formatPace(kind === "lt2" ? targets.lt2PaceS : targets.mpPaceS)
                : "—"
            })`}
            value={avgPace}
            onChange={setAvgPace}
            placeholder={kind === "lt2" ? "3:55" : "4:15"}
          />
          <Field
            id={`${kind}-hr`}
            label="Snittpuls"
            value={avgHr}
            onChange={setAvgHr}
            placeholder="170"
          />
        </>
      )}

      <Field
        id={`${kind}-max`}
        label="Makspuls"
        value={maxHr}
        onChange={setMaxHr}
        placeholder="178"
      />

      {error ? (
        <p style={{ color: "var(--error-700)", fontSize: "0.8rem" }}>{error}</p>
      ) : null}
      <button type="button" className="btn btn-primary w-full" onClick={submit}>
        Lagre økt
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
      />
    </div>
  );
}

function TargetBlock({
  kind,
  targets,
}: {
  kind: MilestoneKind;
  targets: MilestoneTargets;
}) {
  const hr = targets.hrMax;
  const rows =
    kind === "lt2"
      ? [
          ["Fart", formatPace(targets.lt2PaceS)],
          ["Puls", "88–92 % av maks"],
          ["Maks mot slutt", "≤ 93 %"],
          ["Laktat", "4,0 ± 0,2"],
        ]
      : kind === "mp"
        ? [
            ["Fart", formatPace(targets.mpPaceS)],
            ["Puls", "80–85 % av maks"],
            ["Maks", "≤ 85 %"],
            ["Dekobling", "< 3,0 %"],
          ]
        : [
            ["Del 1", `${formatPace(targets.easyPaceS)} · < 75 %`],
            ["Del 2", `${formatPace(targets.mpPaceS)} · < 85 %`],
            ["Maks km 25–30", "< 87 %"],
            ["Dekobling", "< 5,0 %"],
          ];

  return (
    <div
      style={{
        background: "var(--canvas)",
        borderRadius: "var(--radius-md)",
        padding: "0.55rem 0.7rem",
      }}
    >
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between"
          style={{ fontSize: "0.78rem", padding: "0.18rem 0" }}
        >
          <span style={{ color: "var(--gray-500)" }}>{label}</span>
          <span style={{ fontWeight: 600 }}>
            {value}
            {hr && label === "Puls"
              ? ` (${hrAtPct(hr, kind === "lt2" ? 88 : 80)}–${hrAtPct(hr, kind === "lt2" ? 92 : 85)})`
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
