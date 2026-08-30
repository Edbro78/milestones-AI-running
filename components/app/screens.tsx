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
import { marathonFormTrend, weekTowardGoal } from "@/lib/prognosis";
import { computeSubscores } from "@/lib/trafficLight";
import type { Profile, Goal } from "@/lib/mockData";
import { ageFromBirthDate } from "@/lib/profileStorage";
import type { DailyRecord, MetricKey } from "@/lib/types";
import type { SheetApi, GarminStatus } from "@/components/app/AppShell";
import { GoalTrendChart } from "@/components/app/GoalTrendChart";
import {
  Card,
  CategoryDot,
  MiniStat,
  ScoreBar,
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

export function ReportScreen({
  records,
  goal,
  weeklyKm,
}: {
  records: DailyRecord[];
  goal?: Goal | null;
  weeklyKm?: number;
}) {
  const week = records.slice(-7);
  const weekKm = week.reduce((s, r) => s + recordDistanceKm(r), 0);
  const verdict = goal
    ? weekTowardGoal(records, goal, weeklyKm)
    : null;

  const verdictColor =
    verdict?.direction === "closer"
      ? "var(--success-700)"
      : verdict?.direction === "further"
        ? "var(--error-700)"
        : "var(--gray-700)";
  const verdictBg =
    verdict?.direction === "closer"
      ? "var(--success-bg)"
      : verdict?.direction === "further"
        ? "var(--error-bg)"
        : "var(--blue-50)";
  const verdictBorder =
    verdict?.direction === "closer"
      ? "var(--success-border)"
      : verdict?.direction === "further"
        ? "var(--error-border)"
        : "var(--blue-200)";

  return (
    <div className="flex h-full flex-col gap-2.5">
      <Card style={{ padding: "0.75rem" }}>
        <div className="flex items-baseline justify-between gap-2" style={{ marginBottom: "0.55rem" }}>
          <h2
            className="text-[0.72rem] uppercase"
            style={{
              letterSpacing: "0.12em",
              color: "var(--gray-500)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Volum og trafikklys
          </h2>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--sp-navy)" }}>
            {formatNumber(weekKm, 1)} km
            {weeklyKm ? (
              <span style={{ fontWeight: 500, color: "var(--gray-500)", fontSize: "0.75rem" }}>
                {" "}
                / {formatNumber(weeklyKm, 0)} km
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-1">
          {week.map((r) => {
            const c = CATEGORIES[r.category];
            const km = recordDistanceKm(r);
            return (
              <div
                key={r.date}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${formatDate(r.date)} · ${c.label} · ${formatNumber(km, 1)} km`}
              >
                <span style={{ fontSize: "0.58rem", color: "var(--gray-400)" }}>
                  {formatShortDay(r.date).split(" ")[0].replace(".", "")}
                </span>
                <CategoryDot category={r.category} size={14} />
                <span
                  style={{
                    fontSize: "0.68rem",
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
        <p
          style={{
            margin: "0.35rem 0 0",
            textAlign: "right",
            fontSize: "0.62rem",
            color: "var(--gray-400)",
          }}
        >
          km per dag
        </p>
      </Card>

      {verdict ? (
        <Card
          style={{
            padding: "0.85rem",
            flex: 1,
            minHeight: 0,
            background: verdictBg,
            borderColor: verdictBorder,
          }}
        >
          <p
            style={{
              fontSize: "0.62rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: verdictColor,
            }}
          >
            Mot {goal?.title}
          </p>
          <p
            style={{
              marginTop: "0.35rem",
              fontWeight: 700,
              fontSize: "1.15rem",
              color: verdictColor,
            }}
          >
            {verdict.headline}
          </p>
          <p
            style={{
              marginTop: "0.45rem",
              color: "var(--gray-700)",
              fontSize: "0.84rem",
              lineHeight: 1.45,
            }}
          >
            {verdict.detail}
          </p>
        </Card>
      ) : (
        <Card style={{ padding: "0.85rem", flex: 1 }}>
          <p style={{ color: "var(--gray-500)", fontSize: "0.88rem" }}>
            Sett et hovedmål for å se om uken tok deg nærmere eller lenger unna.
          </p>
        </Card>
      )}
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
}: {
  goals: Goal[];
  records: DailyRecord[];
  sheet: SheetApi;
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

  const trend = marathonFormTrend(records, goal);
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

/* ============================ Dagens økt ============================ */

export function TodayScreen({
  today,
  goals,
  sheet,
}: {
  today: DailyRecord;
  goals: Goal[];
  sheet: SheetApi;
}) {
  const c = CATEGORIES[today.category];
  const main = goals.find((g) => g.isMain);
  const subscores = computeSubscores(today.metrics);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: "var(--radius-lg)",
          padding: "0.85rem",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CategoryDot category={today.category} size={14} />
            <span style={{ color: c.text, fontWeight: 700, fontSize: "1.1rem" }}>
              {c.label}
            </span>
          </div>
          <div>
            <span style={{ color: c.text, fontWeight: 700, fontSize: "1.4rem" }}>
              {today.score}
            </span>
            <span style={{ color: c.text, opacity: 0.7, fontSize: "0.85rem" }}>
              /100
            </span>
          </div>
        </div>
        <p style={{ color: c.text, marginTop: "0.5rem", fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.35 }}>
          {c.advice}
        </p>
        <p style={{ color: c.text, opacity: 0.85, marginTop: "0.2rem", fontSize: "0.78rem" }}>
          Ramme: {c.limit}
          {main ? ` · ${daysUntil(main.eventDate)} d til ${main.title}` : ""}
        </p>
      </div>

      {today.triggers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {today.triggers.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-2"
              style={{
                background: CATEGORIES[t.forces].bg,
                border: `1px solid ${CATEGORIES[t.forces].border}`,
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 0.65rem",
              }}
            >
              <i className="bx bx-error-circle" aria-hidden="true" style={{ color: CATEGORIES[t.forces].text, marginTop: 1, fontSize: "0.95rem" }} />
              <span style={{ color: CATEGORIES[t.forces].text, fontSize: "0.78rem", lineHeight: 1.3 }}>
                {t.reason}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {METRIC_ORDER.map((key) => {
          const meta = METRIC_META[key];
          const subscore = subscores[key];
          return (
            <div
              key={key}
              className="panel"
              style={{ borderRadius: "var(--radius-md)", padding: "0.5rem 0.6rem" }}
            >
              <div className="flex items-baseline justify-between">
                <span style={{ fontSize: "0.66rem", color: "var(--gray-500)" }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: "0.58rem", color: "var(--gray-400)" }}>
                  {Math.round(subscore)}
                </span>
              </div>
              <p style={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1.15 }}>
                {metricValueText(key, today.metrics[key])}
                {meta.unit && (
                  <span style={{ fontSize: "0.62rem", color: "var(--gray-400)", fontWeight: 500, marginLeft: 3 }}>
                    {meta.unit}
                  </span>
                )}
              </p>
              <div style={{ marginTop: "0.3rem" }}>
                <ScoreBar value={subscore} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            sheet.openSheet("Øktforslag", <SessionSheet today={today} />)
          }
        >
          Foreslå økt
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            sheet.openSheet("Spør coachen", <ChatSheet today={today} />)
          }
        >
          Spør coachen
        </button>
      </div>
    </div>
  );
}

function SessionSheet({ today }: { today: DailyRecord }) {
  const c = CATEGORIES[today.category];
  const session = suggestSession(today);
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
          {c.label} · {c.limit}
        </span>
      </div>
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

function ChatSheet({ today }: { today: DailyRecord }) {
  type ChatMsg = { role: "user" | "coach"; content: string };
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  function send() {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "coach", content: coachReply(q, today) },
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

export function TrendsScreen({ records }: { records: DailyRecord[] }) {
  const window = records.slice(-28);
  const last = window[window.length - 1]?.metrics;

  const trends = [
    {
      title: "HRV z-skår",
      values: window.map((r) => r.metrics.hrv_z),
      color: "#0A5EDC",
      current: formatSigned(last?.hrv_z ?? 0, 2),
      overThreshold: false,
      note:
        (last?.hrv_z ?? 0) < -0.5
          ? "Under baseline — nervesystemet er belastet."
          : (last?.hrv_z ?? 0) > 0.5
            ? "Over baseline — god parasympatisk balanse."
            : "Nær baseline.",
    },
    {
      title: "ΔRHR (bpm)",
      values: window.map((r) => r.metrics.d_rhr),
      color: "#9747FF",
      current: formatSigned(last?.d_rhr ?? 0, 0),
      overThreshold: false,
      note:
        (last?.d_rhr ?? 0) >= 3
          ? "Forhøyet hvilepuls — ufullstendig restitusjon."
          : "Hvilepuls nær baseline.",
    },
    {
      title: "ACWR",
      values: window.map((r) => r.metrics.acwr),
      color: "#002359",
      threshold: 1.5,
      current: formatNumber(last?.acwr ?? 0, 2),
      overThreshold: (last?.acwr ?? 0) >= 1.5,
      note:
        (last?.acwr ?? 0) >= 1.5
          ? "Over 1,50 — høy skaderisiko, trapp ned."
          : (last?.acwr ?? 0) < 0.8
            ? "Under 0,80 — rom for å øke belastningen."
            : "I trygt vindu (0,80–1,50).",
    },
  ];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <p style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
        Siste {window.length} dager.
      </p>
      {trends.map((t) => (
        <Card key={t.title} style={{ padding: "0.75rem", flex: 1, minHeight: 0 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gray-600)" }}>
              {t.title}
            </span>
            <span
              style={{
                fontWeight: 700,
                color: t.overThreshold ? "var(--error-600)" : t.color,
              }}
            >
              {t.current}
            </span>
          </div>
          <Sparkline values={t.values} color={t.color} threshold={t.threshold} height={40} />
          <p style={{ fontSize: "0.76rem", color: "var(--gray-600)", marginTop: "0.35rem" }}>
            {t.note}
          </p>
        </Card>
      ))}
    </div>
  );
}

/* ============================ Historikk ============================ */

export function HistoryScreen({
  records,
  sheet,
}: {
  records: DailyRecord[];
  sheet: SheetApi;
}) {
  return (
    <div className="flex h-full flex-col gap-2.5">
      <p style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
        Siste {records.length} dager. Trykk på en dag for detaljer.
      </p>
      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 5,
          alignContent: "start",
        }}
      >
        {records.map((r) => {
          const c = CATEGORIES[r.category];
          const day = new Date(`${r.date}T00:00:00`).getDate();
          return (
            <button
              key={r.date}
              type="button"
              onClick={() => sheet.openSheet(formatDate(r.date), <HistoryDetail record={r} />)}
              className="flex flex-col items-center justify-center"
              style={{
                aspectRatio: "1",
                background: c.bg,
                border: `1px solid ${c.border}`,
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: "0.66rem", color: "var(--gray-500)" }}>
        {(["green", "yellow", "yellow_caution", "red2"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <CategoryDot category={k} size={7} /> {CATEGORIES[k].label}
          </span>
        ))}
      </div>
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
