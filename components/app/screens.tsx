"use client";

import { useState } from "react";
import { CATEGORIES, METRIC_META, METRIC_ORDER } from "@/lib/categories";
import { coachReply, suggestSession, weeklyReport } from "@/lib/coach";
import {
  daysUntil,
  formatDate,
  formatDuration,
  formatNumber,
  formatShortDay,
  formatSigned,
  parseTimeToSeconds,
} from "@/lib/format";
import { predictFinishSeconds } from "@/lib/prognosis";
import { computeSubscores } from "@/lib/trafficLight";
import type { Profile, Goal } from "@/lib/mockData";
import type { DailyRecord, MetricKey } from "@/lib/types";
import type { SheetApi } from "@/components/app/AppShell";
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
  lastSync,
}: {
  profile: Profile;
  lastSync: string | null;
}) {
  const age =
    new Date().getFullYear() - new Date(profile.birthDate).getFullYear();
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(lastSync);

  function sync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncedAt(new Date().toISOString());
      setSyncing(false);
    }, 800);
  }

  const rows: [string, string][] = [
    ["Alder", `${age} år`],
    ["Vekt", `${formatNumber(profile.weightKg)} kg`],
    ["Makspuls", `${profile.hrMax} bpm`],
    ["Terskelpuls", `${profile.hrThreshold} bpm`],
    ["HRV-baseline", `${formatNumber(profile.hrvBaseline)} ms`],
    ["Hvilepuls-baseline", `${profile.rhrBaseline} bpm`],
    ["Ukentlig volum", `${formatNumber(profile.weeklyKm)} km`],
  ];

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
            {profile.name.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1.05rem" }}>{profile.name}</p>
            <p style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
              {age} år · {formatNumber(profile.weeklyKm)} km/uke
            </p>
          </div>
        </div>
      </Card>

      <Card style={{ padding: "0.25rem 0.85rem" }}>
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className="flex items-center justify-between"
            style={{
              padding: "0.45rem 0",
              borderBottom:
                i < rows.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ color: "var(--gray-600)", fontSize: "0.85rem" }}>
              {label}
            </span>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{value}</span>
          </div>
        ))}
      </Card>

      <Card style={{ padding: "0.75rem" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--success-500)",
                display: "inline-block",
              }}
            />
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Garmin tilkoblet
            </span>
          </div>
          <span style={{ color: "var(--gray-500)", fontSize: "0.72rem" }}>
            {syncedAt
              ? `Synk ${new Date(syncedAt).toLocaleString("nb-NO", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Ikke synkronisert"}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost mt-2.5 w-full"
          onClick={sync}
          disabled={syncing}
        >
          {syncing ? "Synkroniserer…" : "Synkroniser"}
        </button>
      </Card>
    </div>
  );
}

/* ============================ Rapport ============================ */

export function ReportScreen({ records }: { records: DailyRecord[] }) {
  const week = records.slice(-7);
  const avgScore = week.length
    ? Math.round(week.reduce((s, r) => s + r.score, 0) / week.length)
    : 0;
  const avgHrv = week.length
    ? week.reduce((s, r) => s + r.metrics.hrv_z, 0) / week.length
    : 0;
  const lastAcwr = week.length ? week[week.length - 1].metrics.acwr : 0;

  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function generate() {
    setLoading(true);
    setTimeout(() => {
      setReport(weeklyReport(records));
      setLoading(false);
    }, 600);
  }

  return (
    <div className="flex h-full flex-col gap-2.5">
      <Card style={{ padding: "0.75rem" }}>
        <SectionTitle>Sju dager</SectionTitle>
        <div className="flex items-end gap-1" style={{ height: 44 }}>
          {week.map((r) => {
            const c = CATEGORIES[r.category];
            return (
              <div
                key={r.date}
                className="flex flex-1 flex-col items-center justify-end gap-1"
                title={`${formatDate(r.date)} · ${c.label} · ${r.score}`}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(6, (r.score / 100) * 32)}px`,
                    background: c.dot,
                    borderRadius: 3,
                  }}
                />
                <span style={{ fontSize: "0.58rem", color: "var(--gray-400)" }}>
                  {formatShortDay(r.date).split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Snittskår" value={avgScore} />
        <MiniStat label="HRV z" value={formatSigned(avgHrv, 2)} />
        <MiniStat
          label="ACWR"
          value={formatNumber(lastAcwr, 2)}
          color={lastAcwr >= 1.5 ? "var(--error-600)" : undefined}
        />
      </div>

      <Card style={{ padding: "0.85rem", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <SectionTitle>Ukesoppsummering</SectionTitle>
        <div style={{ overflow: "hidden" }}>
          {report ? (
            <div className="flex flex-col gap-2">
              {report.split("\n\n").map((p, i) => (
                <p
                  key={i}
                  style={{
                    color: "var(--gray-700)",
                    fontSize: "0.84rem",
                    lineHeight: 1.45,
                  }}
                >
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--gray-500)", fontSize: "0.88rem" }}>
              Ingen rapport generert for denne uken ennå. Genereres lokalt inntil
              Gemini kobles på.
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-primary mt-3 w-full"
          onClick={generate}
          disabled={loading}
        >
          {loading ? "Genererer…" : "Generer ukesrapport"}
        </button>
      </Card>
    </div>
  );
}

/* ============================ Mål ============================ */

export function GoalsScreen({
  goals: initialGoals,
  records,
  sheet,
}: {
  goals: Goal[];
  records: DailyRecord[];
  sheet: SheetApi;
}) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);

  const main = goals.find((g) => g.isMain);
  const others = goals
    .filter((g) => !g.isMain)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  function saveGoal(data: {
    id?: string;
    title: string;
    eventDate: string;
    targetTimeS: number;
  }) {
    if (data.id) {
      setGoals((gs) =>
        gs.map((g) =>
          g.id === data.id
            ? { ...g, title: data.title, eventDate: data.eventDate, targetTimeS: data.targetTimeS }
            : g,
        ),
      );
    } else {
      setGoals((gs) => [
        ...gs,
        {
          id: `goal-${Date.now()}`,
          title: data.title,
          eventDate: data.eventDate,
          targetTimeS: data.targetTimeS,
          isMain: false,
        },
      ]);
    }
    sheet.closeSheet();
  }

  function openForm(goal?: Goal) {
    sheet.openSheet(
      goal ? "Rediger mål" : "Nytt mål",
      <GoalForm goal={goal} onSave={saveGoal} />,
    );
  }

  function deleteGoal(id: string) {
    setGoals((gs) => gs.filter((g) => g.id !== id));
  }

  return (
    <div className="flex h-full flex-col gap-2.5">
      {main && <MainGoalCard goal={main} records={records} onEdit={() => openForm(main)} />}

      <SectionTitle>Andre mål</SectionTitle>
      <div className="flex flex-col gap-2">
        {others.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onEdit={() => openForm(g)}
            onDelete={() => deleteGoal(g.id)}
          />
        ))}
        {others.length === 0 && (
          <Card style={{ padding: "0.75rem" }}>
            <p style={{ color: "var(--gray-500)", fontSize: "0.88rem" }}>
              Ingen flere mål ennå.
            </p>
          </Card>
        )}
      </div>

      <button
        type="button"
        className="btn btn-ghost mt-auto w-full"
        onClick={() => openForm()}
      >
        <i className="bx bx-plus" aria-hidden="true" /> Legg til mål
      </button>
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
  const [time, setTime] = useState(goal ? formatDuration(goal.targetTimeS) : "");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="g-title">
          Tittel
        </label>
        <input
          id="g-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="F.eks. Oslo maraton"
        />
      </div>
      <div>
        <label className="label" htmlFor="g-date">
          Dato
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
          onChange={(e) => setTime(e.target.value)}
          placeholder="3:00:00"
          inputMode="numeric"
        />
      </div>
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={!title || !date}
        onClick={() =>
          onSave({
            id: goal?.id,
            title,
            eventDate: date,
            targetTimeS: parseTimeToSeconds(time || "0"),
          })
        }
      >
        Lagre
      </button>
    </div>
  );
}

function MainGoalCard({
  goal,
  records,
  onEdit,
}: {
  goal: Goal;
  records: DailyRecord[];
  onEdit: () => void;
}) {
  const days = daysUntil(goal.eventDate);
  const predicted = predictFinishSeconds(goal.targetTimeS, records);
  const deviation = predicted - goal.targetTimeS;
  const ahead = deviation <= 0;

  return (
    <div
      className="panel"
      style={{
        background: "var(--sp-navy)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-lg)",
        padding: "0.9rem",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "var(--blue-200)", textTransform: "uppercase" }}>
            Hovedmål
          </p>
          <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{goal.title}</p>
          <p style={{ color: "var(--blue-200)", fontSize: "0.8rem" }}>
            {formatDate(goal.eventDate)} · {days} dager igjen
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Rediger hovedmål"
          style={{ color: "var(--blue-200)", padding: 4 }}
        >
          <i className="bx bx-edit-alt" aria-hidden="true" />
        </button>
      </div>

      <div
        className="mt-3 flex items-center justify-between"
        style={{
          padding: "0.6rem 0.7rem",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div>
          <p style={{ fontSize: "0.62rem", color: "var(--blue-200)" }}>Måltid</p>
          <p style={{ fontWeight: 700, fontSize: "1rem" }}>
            {formatDuration(goal.targetTimeS)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: "0.62rem", color: "var(--blue-200)" }}>Estimert nå</p>
          <p style={{ fontWeight: 700, fontSize: "1rem" }}>
            {formatDuration(predicted)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "0.62rem", color: "var(--blue-200)" }}>Avvik</p>
          <p
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: ahead ? "#6CE9A6" : "#FDA29B",
            }}
          >
            {ahead ? "−" : "+"}
            {formatDuration(Math.abs(deviation))}
          </p>
        </div>
      </div>
      <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--blue-200)" }}>
        {ahead
          ? "Prognosen ligger foran måltiden på gjeldende form."
          : "Prognosen ligger bak måltiden — formen må heves."}
      </p>
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const days = daysUntil(goal.eventDate);
  return (
    <Card style={{ padding: "0.65rem 0.75rem" }}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontWeight: 600, fontSize: "0.92rem" }}>{goal.title}</p>
          <p style={{ color: "var(--gray-500)", fontSize: "0.78rem" }}>
            {formatDate(goal.eventDate)} · {formatDuration(goal.targetTimeS)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span
            style={{
              fontSize: "0.76rem",
              fontWeight: 600,
              color: days < 0 ? "var(--gray-400)" : "var(--blue-main)",
            }}
          >
            {days < 0 ? "fullført" : `${days} d`}
          </span>
          <button type="button" onClick={onEdit} aria-label="Rediger" style={{ color: "var(--gray-400)", padding: 4 }}>
            <i className="bx bx-edit-alt" aria-hidden="true" />
          </button>
          <button type="button" onClick={onDelete} aria-label="Slett" style={{ color: "var(--gray-400)", padding: 4 }}>
            <i className="bx bx-trash" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
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
