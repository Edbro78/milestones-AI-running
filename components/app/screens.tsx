"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, METRIC_META, METRIC_ORDER } from "@/lib/categories";
import { coachReply, suggestSession } from "@/lib/coach";
import {
  daysUntil,
  formatDate,
  formatDuration,
  formatNumber,
  formatShortDay,
  formatSigned,
  parseTimeToSeconds,
  recordDistanceKm,
} from "@/lib/format";
import {
  dailyGoalEstimateSeconds,
  marathonFormTrend,
  rollingWeeklyKm,
} from "@/lib/prognosis";
import {
  reportTrafficLight,
  SIGNAL_META,
} from "@/lib/reportLight";
import type { Profile, Goal } from "@/lib/mockData";
import {
  DISTANCE_DEFAULT_KM,
  DISTANCE_LABEL,
  EFFORT_LABEL,
  WEEKDAYS,
  isInterval,
  hasPlannedSessions,
  loadWeekPlan,
  plannedForToday,
  plannedWeeklyKm,
  saveWeekPlan,
  sessionSummary,
  todayWeekdayIndex,
  type DistanceKind,
  type EffortKind,
  type PlannedSession,
  type WeekdayKey,
} from "@/lib/weekPlan";
import { ageFromBirthDate } from "@/lib/profileStorage";
import { CATEGORY_ORDER } from "@/lib/trafficLight";
import type { DailyRecord, MetricKey } from "@/lib/types";
import type { MilestoneLog } from "@/lib/milestones";
import type { SheetApi, GarminStatus } from "@/components/app/AppShell";
import { GoalTrendChart } from "@/components/app/GoalTrendChart";
import {
  Card,
  CategoryDot,
  CategoryScaleLegend,
  MiniStat,
  SectionTitle,
  Sparkline,
} from "@/components/app/ui";

function metricValueText(key: MetricKey, value: number): string {
  const meta = METRIC_META[key];
  if (key === "d_rhr") return formatSigned(value, 0);
  if (key === "hrv_z") return formatSigned(value, 2);
  return formatNumber(value, meta.decimals);
}

/* ============================ Profil ============================ */

export function ProfileScreen({
  profile,
  onSaveProfile,
  garmin,
  onSync,
  sheet,
}: {
  profile: Profile;
  onSaveProfile: (profile: Profile) => void;
  garmin: GarminStatus;
  onSync: () => Promise<void>;
  sheet: SheetApi;
}) {
  const age = ageFromBirthDate(profile.birthDate);

  const statusLabel = garmin.loading
    ? "Synkroniserer…"
    : garmin.connected
      ? "Garmin tilkoblet"
      : garmin.mock
        ? "Demodata (ikke live)"
        : "Ikke tilkoblet";

  const statusColor = garmin.connected
    ? "var(--success-500)"
    : garmin.mock
      ? "var(--warning-500)"
      : "var(--error-500)";

  const userRows: { label: string; value: string }[] = [
    { label: "Alder", value: age ? `${age} år` : "—" },
    { label: "Fødselsdato", value: profile.birthDate ? formatDate(profile.birthDate) : "—" },
    { label: "Vekt", value: `${formatNumber(profile.weightKg)} kg` },
    { label: "Makspuls", value: `${profile.hrMax} bpm` },
    { label: "Terskelpuls", value: `${profile.hrThreshold} bpm` },
    {
      label: "Ønsket ukentlig volum",
      value: `${formatNumber(profile.weeklyKm)} km`,
    },
  ];

  const garminRows: { label: string; value: string }[] = [
    {
      label: "HRV-baseline",
      value:
        profile.hrvBaseline != null ? `${formatNumber(profile.hrvBaseline)} ms` : "—",
    },
    {
      label: "Hvilepuls-baseline",
      value: profile.rhrBaseline != null ? `${profile.rhrBaseline} bpm` : "—",
    },
  ];

  function openEditor() {
    sheet.openSheet(
      "Rediger profil",
      <ProfileForm
        initial={profile}
        onSave={(next) => {
          onSaveProfile(next);
          sheet.closeSheet();
        }}
      />,
    );
  }

  return (
    <div className="flex h-full flex-col gap-2.5">
      <Card style={{ padding: "0.75rem" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--blue-100)",
              color: "var(--blue-main)",
              fontWeight: 700,
              fontSize: "1.1rem",
            }}
          >
            {(profile.name || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontWeight: 700, fontSize: "1.05rem" }}>{profile.name}</p>
            <p style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
              {age} år · {formatNumber(profile.weeklyKm)} km/uke
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={openEditor}
            style={{ padding: "0.45rem 0.7rem", minHeight: 40 }}
          >
            Rediger
          </button>
        </div>
      </Card>

      <Card style={{ padding: "0.65rem 0.85rem", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <SectionTitle>Dine opplysninger</SectionTitle>
        <ProfileFieldRows rows={userRows} />
      </Card>

      <Card style={{ padding: "0.65rem 0.85rem" }}>
        <SectionTitle>Fra Garmin</SectionTitle>
        <ProfileFieldRows rows={garminRows} />
        <div
          className="flex items-center justify-between gap-2"
          style={{
            marginTop: "0.45rem",
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
                flex: "none",
              }}
            />
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {statusLabel}
            </span>
          </div>
          <span
            style={{
              color: "var(--gray-500)",
              fontSize: "0.72rem",
              whiteSpace: "nowrap",
            }}
          >
            {garmin.lastSync
              ? `Synk ${new Date(garmin.lastSync).toLocaleString("nb-NO", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Ikke synkronisert"}
          </span>
        </div>
        {garmin.error ? (
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.78rem",
              color: "var(--error-700)",
              lineHeight: 1.35,
              overflowWrap: "anywhere",
              maxHeight: "4.2em",
              overflow: "hidden",
            }}
          >
            {garmin.error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-primary mt-2.5 w-full"
          onClick={() => void onSync()}
          disabled={garmin.loading}
        >
          {garmin.loading
            ? "Synkroniserer…"
            : garmin.connected
              ? "Synkroniser"
              : "Koble til / synkroniser"}
        </button>
      </Card>
    </div>
  );
}

function ProfileFieldRows({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className="flex items-center justify-between"
          style={{
            padding: "0.32rem 0",
            borderBottom:
              i < rows.length - 1 ? "1px solid var(--border)" : "none",
          }}
        >
          <span style={{ color: "var(--gray-600)", fontSize: "0.85rem" }}>
            {row.label}
          </span>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{row.value}</span>
        </div>
      ))}
    </>
  );
}

function ProfileForm({
  initial,
  onSave,
}: {
  initial: Profile;
  onSave: (profile: Profile) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [weightKg, setWeightKg] = useState(String(initial.weightKg));
  const [hrMax, setHrMax] = useState(String(initial.hrMax));
  const [hrThreshold, setHrThreshold] = useState(String(initial.hrThreshold));
  const [weeklyKm, setWeeklyKm] = useState(String(initial.weeklyKm));

  function num(value: string, fallback: number) {
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }

  function save() {
    onSave({
      name: name.trim() || initial.name,
      birthDate: birthDate || initial.birthDate,
      weightKg: num(weightKg, initial.weightKg),
      hrMax: Math.round(num(hrMax, initial.hrMax)),
      hrThreshold: Math.round(num(hrThreshold, initial.hrThreshold)),
      hrvBaseline: initial.hrvBaseline,
      rhrBaseline: initial.rhrBaseline,
      weeklyKm: num(weeklyKm, initial.weeklyKm),
      weeklyStructure: initial.weeklyStructure,
    });
  }

  const fields: {
    id: string;
    label: string;
    value: string;
    set: (v: string) => void;
    type?: string;
    hint?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    step?: string;
  }[] = [
    { id: "name", label: "Navn", value: name, set: setName, type: "text" },
    {
      id: "birth",
      label: "Fødselsdato",
      value: birthDate,
      set: setBirthDate,
      type: "date",
      hint: "Alder beregnes automatisk",
    },
    {
      id: "weight",
      label: "Vekt (kg)",
      value: weightKg,
      set: setWeightKg,
      inputMode: "decimal",
      step: "0.1",
    },
    {
      id: "hrmax",
      label: "Makspuls (bpm)",
      value: hrMax,
      set: setHrMax,
      inputMode: "numeric",
    },
    {
      id: "thr",
      label: "Terskelpuls (bpm)",
      value: hrThreshold,
      set: setHrThreshold,
      inputMode: "numeric",
    },
    {
      id: "km",
      label: "Ønsket ukentlig volum (km)",
      value: weeklyKm,
      set: setWeeklyKm,
      inputMode: "decimal",
      step: "0.1",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <div key={f.id}>
          <label className="label" htmlFor={`p-${f.id}`}>
            {f.label}
          </label>
          <input
            id={`p-${f.id}`}
            className="input"
            type={f.type ?? "text"}
            inputMode={f.inputMode}
            step={f.step}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
          />
          {f.hint ? (
            <p className="mt-1" style={{ color: "var(--gray-500)", fontSize: "0.75rem" }}>
              {f.hint}
            </p>
          ) : null}
        </div>
      ))}
      <button type="button" className="btn btn-primary w-full" onClick={save}>
        Lagre
      </button>
    </div>
  );
}

/* ============================ Rapport ============================ */

function dash(value: number | null | undefined, decimals = 0, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, decimals)}${suffix}`;
}

export function ReportScreen({
  records,
  weeklyKm,
  lastSync,
  sheet,
  onOpenHistory,
  hrMax = null,
}: {
  records: DailyRecord[];
  goal?: Goal | null;
  weeklyKm?: number;
  lastSync?: string | null;
  sheet: SheetApi;
  onOpenHistory?: () => void;
  hrMax?: number | null;
}) {
  const [weekHover, setWeekHover] = useState<DailyRecord | null>(null);
  const week = records.slice(-7);
  const weekKm = week.reduce((s, r) => s + recordDistanceKm(r), 0);
  const latest = records[records.length - 1];
  const light = reportTrafficLight(records);
  const meta = SIGNAL_META[light.light];
  const rows: { label: string; value: string }[] = latest
    ? [
        { label: "Body battery", value: dash(latest.metrics.body_battery) },
        { label: "HRV", value: dash(latest.hrvMs, 0, " ms") },
        { label: "Søvnskår", value: dash(latest.metrics.sleep_score) },
        { label: "Km løpt", value: dash(recordDistanceKm(latest), 1, " km") },
        { label: "Restitusjon", value: dash(latest.recoveryScore) },
        { label: "Etasjer", value: dash(latest.floors, 0) },
        { label: "Skritt", value: dash(latest.metrics.steps) },
      ]
    : [];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <Card
        style={{
          padding: "0.8rem 0.85rem",
          background: meta.bg,
          borderColor: meta.border,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: meta.dot,
              flex: "none",
            }}
          />
          <div className="min-w-0">
            <p
              style={{
                fontSize: "0.62rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: meta.text,
                margin: 0,
              }}
            >
              Trafikklys · {records.length} dager
            </p>
            <p
              style={{
                margin: "0.15rem 0 0",
                fontWeight: 700,
                fontSize: "1.15rem",
                color: meta.text,
              }}
            >
              {light.headline}
            </p>
          </div>
        </div>
        <p
          style={{
            margin: "0.45rem 0 0",
            color: "var(--gray-700)",
            fontSize: "0.8rem",
            lineHeight: 1.4,
          }}
        >
          {light.detail}
        </p>
      </Card>

      <Card style={{ padding: "0.65rem 0.85rem", flex: 1, minHeight: 0 }}>
        <SectionTitle>
          {lastSync
            ? `Ved synk ${new Date(lastSync).toLocaleString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Ved siste synk"}
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: "0.85rem",
          }}
        >
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center justify-between"
              style={{
                padding: "0.28rem 0",
                borderBottom: i < rows.length - 2 ? "1px solid var(--border)" : "none",
                gridColumn: row.label === "Skritt" ? "1 / -1" : undefined,
              }}
            >
              <span style={{ color: "var(--gray-600)", fontSize: "0.8rem" }}>
                {row.label}
              </span>
              <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: "0.65rem 0.75rem", position: "relative" }}>
        <div className="flex items-baseline justify-between gap-2" style={{ marginBottom: "0.4rem" }}>
          <SectionTitle>Siste 7 dager</SectionTitle>
          <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--sp-navy)", margin: 0 }}>
            {formatNumber(weekKm, 1)} km
            {weeklyKm ? (
              <span style={{ fontWeight: 500, color: "var(--gray-500)", fontSize: "0.72rem" }}>
                {" "}
                / {formatNumber(weeklyKm, 0)}
              </span>
            ) : null}
          </p>
        </div>
        <div
          className="flex gap-1"
          onMouseLeave={() => setWeekHover(null)}
        >
          {week.map((r) => {
            const km = recordDistanceKm(r);
            const c = CATEGORIES[r.category];
            return (
              <div
                key={r.date}
                className="flex flex-1 flex-col items-center gap-1"
                style={{ cursor: "default", position: "relative" }}
                onMouseEnter={() => setWeekHover(r)}
                onFocus={() => setWeekHover(r)}
                onBlur={() => setWeekHover(null)}
                tabIndex={0}
                aria-label={`${formatDate(r.date)} · ${c.label} · ${formatNumber(km, 1)} km`}
              >
                <span style={{ fontSize: "0.58rem", color: "var(--gray-400)" }}>
                  {formatShortDay(r.date).split(" ")[0].replace(".", "")}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: c.dot,
                    boxShadow: weekHover?.date === r.date ? `0 0 0 3px ${c.border}` : undefined,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.66rem",
                    fontWeight: 600,
                    color: "var(--sp-navy)",
                    lineHeight: 1.1,
                  }}
                >
                  {km > 0 ? formatNumber(km, 1) : "–"}
                </span>
              </div>
            );
          })}
        </div>
        {weekHover ? (
          <div
            role="tooltip"
            style={{
              position: "absolute",
              left: 8,
              right: 8,
              bottom: "calc(100% - 4px)",
              zIndex: 20,
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-sm)",
              padding: "0.55rem 0.55rem 0.45rem",
              maxHeight: 280,
              overflowY: "auto",
              pointerEvents: "none",
            }}
          >
            <CategoryScaleLegend
              active={weekHover.category}
              heading={`${formatDate(weekHover.date)} · ${CATEGORIES[weekHover.category].label} · skår ${weekHover.score}`}
            />
          </div>
        ) : null}
      </Card>

      <div className="mt-auto flex flex-col gap-2">
        {latest ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                sheet.openSheet("Øktforslag", <SessionSheet today={latest} hrMax={hrMax} />)
              }
            >
              Foreslå økt
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                sheet.openSheet("Spør coachen", <ChatSheet today={latest} hrMax={hrMax} />)
              }
            >
              Spør coachen
            </button>
          </div>
        ) : null}
        {onOpenHistory ? (
          <button type="button" className="btn btn-ghost" onClick={onOpenHistory}>
            Historikk
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ============================ Mål ============================ */

const GOAL_STORAGE_KEY = "milestones_marathon_goal_v1";
const MARATHON_MIN_S = 2 * 3600;
const MARATHON_MAX_S = 6 * 3600 + 30 * 60;

function loadStoredGoal(fallback: Goal | null): Goal | null {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(GOAL_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Goal;
    if (!parsed?.eventDate || !parsed.targetTimeS) return fallback;
    return { ...parsed, isMain: true };
  } catch {
    return fallback;
  }
}

export function GoalsScreen({
  goals: initialGoals,
  records,
  sheet,
  logs = [],
  hrMax = null,
}: {
  goals: Goal[];
  records: DailyRecord[];
  sheet: SheetApi;
  logs?: MilestoneLog[];
  hrMax?: number | null;
}) {
  const initial = initialGoals.find((g) => g.isMain) ?? initialGoals[0] ?? null;
  const [goal, setGoal] = useState<Goal | null>(initial);

  useEffect(() => {
    setGoal(loadStoredGoal(initial));
  }, [initial]);

  function saveGoal(data: {
    id?: string;
    title: string;
    eventDate: string;
    targetTimeS: number;
  }) {
    const next: Goal = {
      id: data.id ?? goal?.id ?? `goal-${Date.now()}`,
      title: data.title,
      eventDate: data.eventDate,
      targetTimeS: data.targetTimeS,
      isMain: true,
    };
    setGoal(next);
    try {
      window.localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    sheet.closeSheet();
  }

  function openForm() {
    sheet.openSheet(
      goal ? "Rediger maraton" : "Maratonmål",
      <GoalForm goal={goal ?? undefined} onSave={saveGoal} />,
    );
  }

  if (!goal) {
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        <p style={{ color: "var(--gray-500)", fontSize: "0.9rem", textAlign: "center" }}>
          Sett ett maraton som mål. Diagrammet viser om formen er på merket frem mot løpsdagen.
        </p>
        <button type="button" className="btn btn-primary w-full" onClick={openForm}>
          Legg inn maraton
        </button>
      </div>
    );
  }

  const trend = marathonFormTrend(records, goal, new Date(), { logs, hrMax });
  const days = daysUntil(goal.eventDate);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div
        className="panel"
        style={{
          background: "var(--sp-navy)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-lg)",
          padding: "0.85rem",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              style={{
                fontSize: "0.62rem",
                letterSpacing: "0.1em",
                color: "var(--blue-200)",
                textTransform: "uppercase",
              }}
            >
              Maraton
            </p>
            <p style={{ fontWeight: 700, fontSize: "1.08rem" }}>{goal.title}</p>
            <p style={{ color: "var(--blue-200)", fontSize: "0.78rem" }}>
              {formatDate(goal.eventDate)}
              {days >= 0 ? ` · ${days} dager igjen` : " · gjennomført"}
            </p>
          </div>
          <button
            type="button"
            onClick={openForm}
            aria-label="Rediger maraton"
            style={{ color: "var(--blue-200)", padding: 4 }}
          >
            <i className="bx bx-edit-alt" aria-hidden="true" />
          </button>
        </div>
        <div
          className="mt-3 grid grid-cols-2 gap-2"
          style={{
            padding: "0.55rem 0.65rem",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div>
            <p style={{ fontSize: "0.62rem", color: "var(--blue-200)" }}>I dag</p>
            <p style={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {formatDuration(trend.todayS)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.62rem", color: "var(--blue-200)" }}>Mål</p>
            <p style={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {formatDuration(goal.targetTimeS)}
            </p>
          </div>
        </div>
      </div>

      <Card style={{ padding: "0.65rem 0.7rem 0.5rem", flex: 1, minHeight: 0 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "0.35rem" }}>
          <p
            className="text-[0.72rem] uppercase"
            style={{ letterSpacing: "0.12em", color: "var(--gray-500)", fontWeight: 600 }}
          >
            Form mot løpsdagen
          </p>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: trend.onTrack ? "var(--success-700)" : "var(--error-700)",
            }}
          >
            {trend.onTrack ? "På merket" : "Bak merket"}
          </span>
        </div>
        <GoalTrendChart trend={trend} height={158} />
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1" style={{ fontSize: "0.68rem", color: "var(--gray-500)" }}>
          <span className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 2, background: "var(--sp-navy)", display: "inline-block" }} />
            Form til nå
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              style={{
                width: 10,
                height: 0,
                borderTop: "2px dashed var(--blue-main)",
                display: "inline-block",
              }}
            />
            Om du gjør alt
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              style={{
                width: 10,
                height: 0,
                borderTop: "1.5px dashed var(--blue-main)",
                display: "inline-block",
                opacity: 0.6,
              }}
            />
            Måltid
          </span>
        </div>
        <p style={{ marginTop: "0.45rem", fontSize: "0.78rem", color: "var(--gray-600)", lineHeight: 1.4 }}>
          {trend.onTrack
            ? `Dagens potensial er ${formatDuration(trend.todayS)}. Gjør du det du skal de neste ${trend.daysLeft} dagene, går estimatet gradvis mot ${formatDuration(goal.targetTimeS)}.`
            : `Dagens potensial er ${formatDuration(trend.todayS)}, bak det merket krever (${formatDuration(trend.requiredTodayS)}). Kurven viser veien mot ${formatDuration(goal.targetTimeS)} hvis du gjør alt du skal.`}
          {logs.length
            ? ` Testdata fra milepælene kalibrerer tallet etter hver økt.`
            : ` Logg LT2, MP og 30 km under Milestones for å kalibrere estimatet.`}
        </p>
      </Card>
    </div>
  );
}

function GoalForm({
  goal,
  onSave,
}: {
  goal?: Goal;
  onSave: (data: {
    id?: string;
    title: string;
    eventDate: string;
    targetTimeS: number;
  }) => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [date, setDate] = useState(goal?.eventDate ?? "");
  const [time, setTime] = useState(goal ? formatDuration(goal.targetTimeS) : "2:59:00");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const seconds = parseTimeToSeconds(time || "0");
    if (seconds < MARATHON_MIN_S || seconds > MARATHON_MAX_S) {
      setError("Målet må være et maraton mellom 2:00:00 og 6:30:00.");
      return;
    }
    onSave({
      id: goal?.id,
      title: title.trim() || "Maraton",
      eventDate: date,
      targetTimeS: seconds,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p style={{ color: "var(--gray-500)", fontSize: "0.82rem", lineHeight: 1.4 }}>
        Ett mål, og det må være et maraton.
      </p>
      <div>
        <label className="label" htmlFor="g-title">
          Løp
        </label>
        <input
          id="g-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="F.eks. Warszawa maraton"
        />
      </div>
      <div>
        <label className="label" htmlFor="g-date">
          Løpsdag
        </label>
        <input
          id="g-date"
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="g-time">
          Måltid (t:mm:ss)
        </label>
        <input
          id="g-time"
          className="input"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            setError(null);
          }}
          placeholder="2:59:00"
          inputMode="numeric"
        />
      </div>
      {error ? (
        <p style={{ color: "var(--error-700)", fontSize: "0.8rem" }}>{error}</p>
      ) : null}
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={!date}
        onClick={submit}
      >
        Lagre maraton
      </button>
    </div>
  );
}

/* ============================ Ukeplan ============================ */

export function WeekScreen({
  sheet,
  profile,
  onSaveProfile,
}: {
  sheet: SheetApi;
  profile: Profile;
  onSaveProfile: (profile: Profile) => void;
}) {
  const [plan, setPlan] = useState(() =>
    hasPlannedSessions(profile.weeklyStructure)
      ? profile.weeklyStructure
      : loadWeekPlan(),
  );
  const todayIdx = todayWeekdayIndex();

  useEffect(() => {
    if (hasPlannedSessions(profile.weeklyStructure)) {
      setPlan(profile.weeklyStructure);
    }
  }, [profile.weeklyStructure]);

  function updateDay(key: WeekdayKey, session: PlannedSession | null) {
    const next = { ...plan, [key]: session };
    setPlan(next);
    saveWeekPlan(next);
    onSaveProfile({ ...profile, weeklyStructure: next });
    sheet.closeSheet();
  }

  function openDay(day: (typeof WEEKDAYS)[number]) {
    sheet.openSheet(
      day.label,
      <WeekDayForm
        initial={plan[day.key]}
        onSave={(session) => updateDay(day.key, session)}
        onClear={() => updateDay(day.key, null)}
      />,
    );
  }

  const totalKm = plannedWeeklyKm(plan);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <Card style={{ padding: "0.7rem 0.85rem" }}>
        <p
          style={{
            fontSize: "0.62rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--gray-500)",
            margin: 0,
          }}
        >
          Fast uke · man–søn
        </p>
        <p style={{ margin: "0.2rem 0 0", fontWeight: 700, fontSize: "1.05rem" }}>
          {formatNumber(totalKm, 0)} km planlagt
          {profile.weeklyKm ? (
            <span style={{ fontWeight: 500, color: "var(--gray-500)", fontSize: "0.78rem" }}>
              {" "}
              / {formatNumber(profile.weeklyKm, 0)} km ønsket
            </span>
          ) : null}
        </p>
      </Card>

      <Card style={{ padding: "0.2rem 0.35rem", flex: 1, minHeight: 0 }}>
        {WEEKDAYS.map((day, i) => {
          const session = plan[day.key];
          const isToday = i === todayIdx;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => openDay(day)}
              className="flex w-full items-center gap-2.5"
              style={{
                padding: "0.55rem 0.5rem",
                borderBottom: i < WEEKDAYS.length - 1 ? "1px solid var(--border)" : "none",
                background: isToday ? "var(--blue-50)" : "transparent",
                borderRadius: isToday ? "var(--radius-md)" : 0,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 36,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: isToday ? "var(--blue-main)" : "var(--gray-600)",
                  flex: "none",
                }}
              >
                {day.short}
              </span>
              <span className="min-w-0 flex-1">
                {session ? (
                  <>
                    <span
                      style={{
                        display: "block",
                        fontWeight: 600,
                        fontSize: "0.86rem",
                        color: "var(--sp-navy)",
                      }}
                    >
                      {sessionSummary(session)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                      {formatNumber(session.km, 1)} km
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: "0.86rem", color: "var(--gray-400)" }}>
                    Hvile · trykk for å legge inn
                  </span>
                )}
              </span>
              <i
                className="bx bx-chevron-right"
                aria-hidden="true"
                style={{ color: "var(--gray-400)", fontSize: "1.2rem" }}
              />
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function WeekDayForm({
  initial,
  onSave,
  onClear,
}: {
  initial: PlannedSession | null;
  onSave: (session: PlannedSession) => void;
  onClear: () => void;
}) {
  const [distance, setDistance] = useState<DistanceKind>(initial?.distance ?? "middels");
  const [effort, setEffort] = useState<EffortKind>(initial?.effort ?? "rolig");
  const [km, setKm] = useState(String(initial?.km ?? DISTANCE_DEFAULT_KM.middels));

  function pickDistance(next: DistanceKind) {
    setDistance(next);
    setKm(String(DISTANCE_DEFAULT_KM[next]));
  }

  function num(value: string) {
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : DISTANCE_DEFAULT_KM[distance];
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-500)", marginBottom: 6 }}>
          Distanse
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["kort", "middels", "lang"] as DistanceKind[]).map((key) => (
            <button
              key={key}
              type="button"
              className={distance === key ? "btn btn-primary" : "btn btn-ghost"}
              style={{ minHeight: 40, fontSize: "0.78rem", padding: "0.35rem 0.4rem" }}
              onClick={() => pickDistance(key)}
            >
              {DISTANCE_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-500)", marginBottom: 6 }}>
          Intensitet
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["rolig", "middels", "hard"] as EffortKind[]).map((key) => (
            <button
              key={key}
              type="button"
              className={effort === key ? "btn btn-primary" : "btn btn-ghost"}
              style={{ minHeight: 40, fontSize: "0.78rem", padding: "0.35rem 0.4rem" }}
              onClick={() => setEffort(key)}
            >
              {EFFORT_LABEL[key]}
            </button>
          ))}
        </div>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "var(--gray-500)", lineHeight: 1.35 }}>
          {isInterval(effort)
            ? "Middels og hard = terskel/intervall. Hold mest 80 % av makspuls; på grønne dager inntil 87 % og litt over."
            : "Rolig = jevn tur uten intervall."}
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--gray-500)" }}>
          Ønsket km
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          className="input"
        />
      </label>

      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() =>
          onSave({ distance, effort, km: num(km) })
        }
      >
        Lagre økt
      </button>
      {initial ? (
        <button type="button" className="btn btn-ghost w-full" onClick={onClear}>
          Fjern økt (hvile)
        </button>
      ) : null}
    </div>
  );
}

function SessionSheet({
  today,
  hrMax = null,
}: {
  today: DailyRecord;
  hrMax?: number | null;
}) {
  const c = CATEGORIES[today.category];
  const planned = plannedForToday(loadWeekPlan());
  const session = suggestSession(today, planned, hrMax);
  const parts: [string, string][] = [
    ["Oppvarming", session.warmup],
    ["Hoveddel", session.main],
    ["Avslutning", session.cooldown],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: "var(--radius-md)",
          padding: "0.6rem 0.75rem",
        }}
      >
        <span style={{ color: c.text, fontWeight: 600, fontSize: "0.85rem" }}>
          {session.title ?? c.label} · {c.limit}
        </span>
        {session.note ? (
          <p style={{ color: c.text, fontSize: "0.78rem", lineHeight: 1.35, margin: "0.35rem 0 0" }}>
            {session.note}
          </p>
        ) : null}
      </div>
      {session.emphasis ? (
        <div
          style={{
            background: "var(--blue-50)",
            border: "1px solid var(--blue-main)",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem 0.75rem",
          }}
        >
          <p
            style={{
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--blue-main)",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Terskelpuls
          </p>
          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--sp-navy)",
              fontWeight: 600,
              margin: "0.3rem 0 0",
              lineHeight: 1.4,
            }}
          >
            {session.emphasis}
          </p>
        </div>
      ) : null}
      {parts.map(([label, text]) => (
        <div key={label}>
          <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--blue-main)", fontWeight: 600 }}>
            {label}
          </p>
          <p style={{ fontSize: "0.9rem", color: "var(--gray-700)", marginTop: 2, lineHeight: 1.4 }}>
            {text}
          </p>
        </div>
      ))}
      <p style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>
        Generert lokalt innenfor dagens ramme. Gemini kobles på senere.
      </p>
    </div>
  );
}

function ChatSheet({
  today,
  hrMax = null,
}: {
  today: DailyRecord;
  hrMax?: number | null;
}) {
  type ChatMsg = { role: "user" | "coach"; content: string };
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  function send() {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      {
        role: "coach",
        content: coachReply(q, today, plannedForToday(loadWeekPlan()), hrMax),
      },
    ]);
    setInput("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2" style={{ minHeight: 120 }}>
        {messages.length === 0 && (
          <p style={{ color: "var(--gray-400)", fontSize: "0.85rem" }}>
            Still et spørsmål om dagens økt.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.role === "user" ? "var(--blue-main)" : "var(--gray-100)",
              color: m.role === "user" ? "#fff" : "var(--gray-800)",
              borderRadius: "var(--radius-md)",
              padding: "0.45rem 0.7rem",
              fontSize: "0.86rem",
              lineHeight: 1.35,
            }}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Kan jeg kjøre intervaller i dag?"
        />
        <button type="button" className="btn btn-primary" onClick={send} aria-label="Send">
          <i className="bx bx-send" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ============================ Trender ============================ */

export function TrendsScreen({
  records,
  goal: goalProp,
  weeklyKm,
  logs = [],
  hrMax = null,
}: {
  records: DailyRecord[];
  goal?: Goal | null;
  weeklyKm?: number;
  logs?: MilestoneLog[];
  hrMax?: number | null;
}) {
  const [goal, setGoal] = useState<Goal | null>(goalProp ?? null);
  useEffect(() => {
    setGoal(loadStoredGoal(goalProp ?? null));
  }, [goalProp]);

  const window = records.slice(-28);
  const volume = rollingWeeklyKm(window, 7);
  const latestVolume = volume[volume.length - 1] ?? 0;
  const prevVolume = volume.length > 7 ? volume[volume.length - 8] : volume[0];
  const volumeUp = latestVolume >= (prevVolume ?? 0);

  const target = goal?.targetTimeS ?? 0;
  const estimates = target
    ? dailyGoalEstimateSeconds(window, target, { logs, hrMax })
    : [];
  const latestEst = estimates[estimates.length - 1];
  const prevEst =
    estimates.length > 1 ? estimates[estimates.length - 2] : latestEst;
  const towardGoal =
    latestEst != null && prevEst != null ? latestEst < prevEst - 5 : null;
  const awayFromGoal =
    latestEst != null && prevEst != null ? latestEst > prevEst + 5 : null;
  const formTowardGoal = estimates.map((s) => -s);

  const sleep = window.map((r) => r.metrics.sleep_score);
  const latestSleep = sleep[sleep.length - 1];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <Card style={{ padding: "0.7rem 0.8rem", flex: 1, minHeight: 0 }}>
        <div className="flex items-baseline justify-between">
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-600)" }}>
            Ukesvolum · 7 dager
          </span>
          <span style={{ fontWeight: 700, color: "var(--sp-navy)" }}>
            {formatNumber(latestVolume, 1)} km
          </span>
        </div>
        <Sparkline values={volume} color="#002359" height={44} />
        <p style={{ fontSize: "0.76rem", color: "var(--gray-600)", marginTop: "0.3rem" }}>
          Glidende ukesvolum siste 7 dager
          {weeklyKm
            ? ` · ønsket ${formatNumber(weeklyKm, 0)} km/uke`
            : ""}
          {volume.length > 1
            ? volumeUp
              ? " · volumet stiger."
              : " · volumet synker."
            : "."}
        </p>
      </Card>

      <Card style={{ padding: "0.7rem 0.8rem", flex: 1, minHeight: 0 }}>
        <div className="flex items-baseline justify-between">
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-600)" }}>
            Mot målet · dag for dag
          </span>
          <span
            style={{
              fontWeight: 700,
              color:
                towardGoal
                  ? "var(--success-700)"
                  : awayFromGoal
                    ? "var(--error-700)"
                    : "var(--gray-700)",
            }}
          >
            {towardGoal
              ? "Oppadgående"
              : awayFromGoal
                ? "Nedadgående"
                : goal
                  ? "Stabil"
                  : "—"}
          </span>
        </div>
        {formTowardGoal.length >= 2 ? (
          <Sparkline values={formTowardGoal} color="#0A5EDC" height={44} />
        ) : (
          <p style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginTop: "0.5rem" }}>
            Sett et maratonmål for å se trenden.
          </p>
        )}
        <p style={{ fontSize: "0.76rem", color: "var(--gray-600)", marginTop: "0.3rem" }}>
          {latestEst != null && goal
            ? `I dag ${formatDuration(latestEst)} mot ${formatDuration(goal.targetTimeS)}. Oppadgående linje = nærmere målet.`
            : "Kurven viser estimert sluttid per dag."}
        </p>
      </Card>

      <Card style={{ padding: "0.7rem 0.8rem", flex: 1, minHeight: 0 }}>
        <div className="flex items-baseline justify-between">
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-600)" }}>
            Søvnskår · dag for dag
          </span>
          <span style={{ fontWeight: 700, color: "#9747FF" }}>
            {latestSleep != null ? formatNumber(latestSleep, 0) : "—"}
          </span>
        </div>
        <Sparkline values={sleep} color="#9747FF" threshold={70} height={44} />
        <p style={{ fontSize: "0.76rem", color: "var(--gray-600)", marginTop: "0.3rem" }}>
          {(latestSleep ?? 0) >= 80
            ? "Sterk natt — over 80."
            : (latestSleep ?? 0) >= 70
              ? "Grei natt — rundt 70."
              : "Svak natt — under 70."}
        </p>
      </Card>
    </div>
  );
}

/* ============================ Historikk ============================ */

export function HistoryScreen({
  records,
  sheet,
  onBack,
}: {
  records: DailyRecord[];
  sheet: SheetApi;
  onBack?: () => void;
}) {
  const [hovered, setHovered] = useState<DailyRecord | null>(null);

  return (
    <div className="flex h-full flex-col gap-2.5" style={{ position: "relative" }}>
      {onBack ? (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onBack}
          style={{ alignSelf: "flex-start", minHeight: 36, padding: "0 0.7rem" }}
        >
          Tilbake
        </button>
      ) : null}
      <p style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
        Siste {records.length} dager. Hold over en dag for skalaen, trykk for detaljer.
      </p>
      <div
        className="grid flex-1"
        onMouseLeave={() => setHovered(null)}
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 5,
          alignContent: "start",
        }}
      >
        {records.map((r) => {
          const c = CATEGORIES[r.category];
          const day = new Date(`${r.date}T00:00:00`).getDate();
          const on = hovered?.date === r.date;
          return (
            <button
              key={r.date}
              type="button"
              onClick={() => sheet.openSheet(formatDate(r.date), <HistoryDetail record={r} />)}
              onMouseEnter={() => setHovered(r)}
              onFocus={() => setHovered(r)}
              onBlur={() => setHovered(null)}
              className="flex flex-col items-center justify-center"
              aria-label={`${formatDate(r.date)} · ${c.label} · skår ${r.score}`}
              style={{
                aspectRatio: "1",
                background: c.bg,
                border: on ? `2px solid ${c.text}` : `1px solid ${c.border}`,
                borderRadius: "var(--radius-sm)",
                color: c.text,
              }}
            >
              <span style={{ fontSize: "0.56rem", opacity: 0.8 }}>{day}.</span>
              <span style={{ fontSize: "0.92rem", fontWeight: 700, lineHeight: 1 }}>
                {r.score}
              </span>
            </button>
          );
        })}
      </div>
      {hovered ? (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            background: "var(--white)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)",
            padding: "0.65rem 0.7rem",
            maxHeight: "58%",
            overflowY: "auto",
            pointerEvents: "none",
          }}
        >
          <CategoryScaleLegend
            active={hovered.category}
            heading={`${formatDate(hovered.date)} · ${CATEGORIES[hovered.category].label} · skår ${hovered.score}`}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1" style={{ fontSize: "0.66rem", color: "var(--gray-500)" }}>
          {CATEGORY_ORDER.map((k) => (
            <span key={k} className="flex items-center gap-1">
              <CategoryDot category={k} size={7} /> {CATEGORIES[k].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryDetail({ record }: { record: DailyRecord }) {
  const c = CATEGORIES[record.category];
  return (
    <div className="flex flex-col gap-3">
      <div
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: "var(--radius-md)",
          padding: "0.7rem 0.8rem",
        }}
      >
        <div className="flex items-center justify-between">
          <span style={{ color: c.text, fontWeight: 700 }}>{c.label}</span>
          <span style={{ color: c.text, fontWeight: 700 }}>{record.score}/100</span>
        </div>
        <p style={{ color: c.text, fontSize: "0.8rem", marginTop: 2 }}>
          {record.completed ?? "Ingen økt gjennomført"}
        </p>
      </div>
      <div className="flex flex-col">
        {METRIC_ORDER.map((key, i) => (
          <div
            key={key}
            className="flex items-center justify-between"
            style={{
              padding: "0.45rem 0",
              borderBottom:
                i < METRIC_ORDER.length - 1 ? "1px solid var(--border)" : "none",
              fontSize: "0.86rem",
            }}
          >
            <span style={{ color: "var(--gray-600)" }}>{METRIC_META[key].label}</span>
            <span style={{ fontWeight: 600 }}>
              {metricValueText(key, record.metrics[key])}
              {METRIC_META[key].unit ? ` ${METRIC_META[key].unit}` : ""}
            </span>
          </div>
        ))}
      </div>
      {record.triggers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {record.triggers.map((t, i) => (
            <p key={i} style={{ fontSize: "0.76rem", color: CATEGORIES[t.forces].text }}>
              {t.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
