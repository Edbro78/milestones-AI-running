"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, METRIC_META, METRIC_ORDER } from "@/lib/categories";
import {
  coachReply,
  suggestSession,
  weeklyReport,
  type SessionSuggestion,
} from "@/lib/coach";
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
import {
  Card,
  CategoryDot,
  CategoryPill,
  ScoreBar,
  SectionTitle,
  Sparkline,
  StatRow,
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
    }, 900);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--blue-100)",
              color: "var(--blue-main)",
              fontWeight: 700,
              fontSize: "1.2rem",
            }}
          >
            {profile.name.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{profile.name}</p>
            <p style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
              {age} år · {formatNumber(profile.weeklyKm)} km/uke
            </p>
          </div>
        </div>
      </Card>

      <div>
        <SectionTitle>Fysiologi</SectionTitle>
        <Card style={{ padding: "0.25rem 1rem" }}>
          <StatRow label="Alder" value={`${age} år`} />
          <StatRow label="Vekt" value={`${formatNumber(profile.weightKg)} kg`} />
          <StatRow label="Makspuls" value={`${profile.hrMax} bpm`} />
          <StatRow label="Terskelpuls" value={`${profile.hrThreshold} bpm`} />
          <StatRow
            label="HVR-baseline"
            value={`${formatNumber(profile.hrvBaseline)} ms`}
          />
          <StatRow
            label="Hvilepuls-baseline"
            value={`${profile.rhrBaseline} bpm`}
          />
          <div style={{ padding: "0.5rem 0" }}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
                Ukentlig volum
              </span>
              <span style={{ fontWeight: 600 }}>
                {formatNumber(profile.weeklyKm)} km
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle>Garmin Connect</SectionTitle>
        <Card>
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
              <span style={{ fontWeight: 600 }}>Tilkoblet</span>
            </div>
            <span style={{ color: "var(--gray-500)", fontSize: "0.8rem" }}>
              {syncedAt
                ? `Sist synk ${new Date(syncedAt).toLocaleString("nb-NO", {
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
            className="btn btn-ghost mt-3 w-full"
            onClick={sync}
            disabled={syncing}
          >
            {syncing ? "Synkroniserer…" : "Synkroniser nå"}
          </button>
        </Card>
      </div>
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
    }, 700);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionTitle>Uken</SectionTitle>
        <Card>
          <div className="flex items-end gap-1" style={{ height: 56 }}>
            {week.map((r) => {
              const c = CATEGORIES[r.category];
              return (
                <div
                  key={r.date}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                  title={`${formatDate(r.date)} · ${c.label} · ${r.score}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(8, (r.score / 100) * 40)}px`,
                      background: c.dot,
                      borderRadius: 3,
                    }}
                  />
                  <span
                    style={{ fontSize: "0.6rem", color: "var(--gray-400)" }}
                  >
                    {formatShortDay(r.date).split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card style={{ padding: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--gray-500)" }}>
            Snittskår
          </p>
          <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{avgScore}</p>
        </Card>
        <Card style={{ padding: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--gray-500)" }}>HRV z</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {formatSigned(avgHrv, 2)}
          </p>
        </Card>
        <Card style={{ padding: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--gray-500)" }}>ACWR</p>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: lastAcwr >= 1.5 ? "var(--error-600)" : "var(--sp-navy)",
            }}
          >
            {formatNumber(lastAcwr, 2)}
          </p>
        </Card>
      </div>

      <div>
        <SectionTitle>Ukesoppsummering</SectionTitle>
        <Card>
          {report ? (
            <div className="flex flex-col gap-3">
              {report.split("\n\n").map((p, i) => (
                <p
                  key={i}
                  style={{
                    color: "var(--gray-700)",
                    fontSize: "0.92rem",
                    lineHeight: 1.5,
                  }}
                >
                  {p}
                </p>
              ))}
              <p style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>
                Generert lokalt (uten AI). Gemini kobles på senere.
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
              Ingen rapport generert for denne uken ennå.
            </p>
          )}
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
    </div>
  );
}

/* ============================ Mål ============================ */

export function GoalsScreen({
  goals: initialGoals,
  records,
}: {
  goals: Goal[];
  records: DailyRecord[];
}) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const main = goals.find((g) => g.isMain);
  const others = goals
    .filter((g) => !g.isMain)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  function resetForm() {
    setTitle("");
    setDate("");
    setTime("");
    setEditingId(null);
    setShowForm(false);
  }

  function saveGoal() {
    if (!title || !date) return;
    const targetTimeS = parseTimeToSeconds(time || "0");
    if (editingId) {
      setGoals((gs) =>
        gs.map((g) =>
          g.id === editingId
            ? { ...g, title, eventDate: date, targetTimeS }
            : g,
        ),
      );
    } else {
      setGoals((gs) => [
        ...gs,
        {
          id: `goal-${Date.now()}`,
          title,
          eventDate: date,
          targetTimeS,
          isMain: false,
        },
      ]);
    }
    resetForm();
  }

  function editGoal(g: Goal) {
    setEditingId(g.id);
    setTitle(g.title);
    setDate(g.eventDate);
    setTime(formatDuration(g.targetTimeS));
    setShowForm(true);
  }

  function deleteGoal(id: string) {
    setGoals((gs) => gs.filter((g) => g.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <div className="flex flex-col gap-4">
      {main && (
        <div>
          <SectionTitle>Hovedmål</SectionTitle>
          <MainGoalCard goal={main} records={records} onEdit={editGoal} />
        </div>
      )}

      <div>
        <SectionTitle>Andre mål</SectionTitle>
        <div className="flex flex-col gap-3">
          {others.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={editGoal}
              onDelete={deleteGoal}
            />
          ))}
          {others.length === 0 && (
            <Card>
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
                Ingen flere mål ennå.
              </p>
            </Card>
          )}
        </div>
      </div>

      {showForm ? (
        <Card>
          <SectionTitle>{editingId ? "Rediger mål" : "Nytt mål"}</SectionTitle>
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
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={saveGoal}
              >
                Lagre
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetForm}
              >
                Avbryt
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <button
          type="button"
          className="btn btn-ghost w-full"
          onClick={() => setShowForm(true)}
        >
          <i className="bx bx-plus" aria-hidden="true" /> Legg til mål
        </button>
      )}
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
  onEdit: (g: Goal) => void;
}) {
  const days = daysUntil(goal.eventDate);
  const predicted = predictFinishSeconds(goal.targetTimeS, records);
  const deviation = predicted - goal.targetTimeS;
  const ahead = deviation <= 0;

  return (
    <Card
      style={{
        background: "var(--sp-navy)",
        color: "#fff",
        border: "none",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontWeight: 700, fontSize: "1.15rem" }}>{goal.title}</p>
          <p style={{ color: "var(--blue-200)", fontSize: "0.85rem" }}>
            {formatDate(goal.eventDate)} · {days} dager igjen
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(goal)}
          aria-label="Rediger hovedmål"
          style={{ color: "var(--blue-200)", padding: 4 }}
        >
          <i className="bx bx-edit-alt" aria-hidden="true" />
        </button>
      </div>

      <div
        className="mt-4 flex items-center justify-between"
        style={{
          padding: "0.75rem",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div>
          <p style={{ fontSize: "0.7rem", color: "var(--blue-200)" }}>Måltid</p>
          <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {formatDuration(goal.targetTimeS)}
          </p>
        </div>
        <i
          className="bx bx-right-arrow-alt"
          aria-hidden="true"
          style={{ color: "var(--blue-200)" }}
        />
        <div>
          <p style={{ fontSize: "0.7rem", color: "var(--blue-200)" }}>
            Estimert nå
          </p>
          <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {formatDuration(predicted)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--blue-200)" }}>Avvik</p>
          <p
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: ahead ? "#6CE9A6" : "#FDA29B",
            }}
          >
            {ahead ? "−" : "+"}
            {formatDuration(Math.abs(deviation))}
          </p>
        </div>
      </div>
      <p
        style={{
          marginTop: "0.6rem",
          fontSize: "0.78rem",
          color: "var(--blue-200)",
        }}
      >
        {ahead
          ? "Prognosen ligger foran måltiden på gjeldende form."
          : "Prognosen ligger bak måltiden — formen må heves før løpet."}
      </p>
    </Card>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const days = daysUntil(goal.eventDate);
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontWeight: 600 }}>{goal.title}</p>
          <p style={{ color: "var(--gray-500)", fontSize: "0.82rem" }}>
            {formatDate(goal.eventDate)} · måltid {formatDuration(goal.targetTimeS)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: days < 0 ? "var(--gray-400)" : "var(--blue-main)",
            }}
          >
            {days < 0 ? "fullført" : `${days} d`}
          </span>
          <button
            type="button"
            onClick={() => onEdit(goal)}
            aria-label="Rediger"
            style={{ color: "var(--gray-400)", padding: 4 }}
          >
            <i className="bx bx-edit-alt" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal.id)}
            aria-label="Slett"
            style={{ color: "var(--gray-400)", padding: 4 }}
          >
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
}: {
  today: DailyRecord;
  goals: Goal[];
}) {
  const c = CATEGORIES[today.category];
  const main = goals.find((g) => g.isMain);
  const subscores = useMemo(() => computeSubscores(today.metrics), [today]);
  const [session, setSession] = useState<SessionSuggestion | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  type ChatMsg = { role: "user" | "coach"; content: string };
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  function proposeSession() {
    setLoadingSession(true);
    setTimeout(() => {
      setSession(suggestSession(today));
      setLoadingSession(false);
    }, 600);
  }

  function send() {
    const q = input.trim();
    if (!q) return;
    const reply = coachReply(q, today);
    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "coach", content: reply },
    ]);
    setInput("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: "var(--radius-lg)",
          padding: "1.25rem",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CategoryDot category={today.category} size={16} />
            <span style={{ color: c.text, fontWeight: 700, fontSize: "1.2rem" }}>
              {c.label}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{ color: c.text, fontWeight: 700, fontSize: "1.6rem" }}
            >
              {today.score}
            </span>
            <span style={{ color: c.text, opacity: 0.7 }}>/100</span>
          </div>
        </div>
        <p style={{ color: c.text, marginTop: "0.75rem", fontWeight: 600 }}>
          {c.advice}
        </p>
        <p
          style={{
            color: c.text,
            opacity: 0.85,
            marginTop: "0.35rem",
            fontSize: "0.85rem",
          }}
        >
          Ramme: {c.limit}
        </p>
        {main && (
          <p
            style={{
              color: c.text,
              opacity: 0.7,
              marginTop: "0.5rem",
              fontSize: "0.78rem",
            }}
          >
            {daysUntil(main.eventDate)} dager til {main.title} ·{" "}
            {formatDuration(main.targetTimeS)}
          </p>
        )}
      </div>

      {today.triggers.length > 0 && (
        <div>
          <SectionTitle>Utløste regler</SectionTitle>
          <div className="flex flex-col gap-2">
            {today.triggers.map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-2"
                style={{
                  background: CATEGORIES[t.forces].bg,
                  border: `1px solid ${CATEGORIES[t.forces].border}`,
                  borderRadius: "var(--radius-md)",
                  padding: "0.6rem 0.75rem",
                }}
              >
                <i
                  className="bx bx-error-circle"
                  aria-hidden="true"
                  style={{ color: CATEGORIES[t.forces].text, marginTop: 2 }}
                />
                <span
                  style={{
                    color: CATEGORIES[t.forces].text,
                    fontSize: "0.85rem",
                  }}
                >
                  {t.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle>Dagens målinger</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {METRIC_ORDER.map((key) => {
            const meta = METRIC_META[key];
            const subscore = subscores[key];
            return (
              <Card key={key} style={{ padding: "0.75rem" }}>
                <p style={{ fontSize: "0.72rem", color: "var(--gray-500)" }}>
                  {meta.label}
                </p>
                <p
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    marginTop: "0.15rem",
                  }}
                >
                  {metricValueText(key, today.metrics[key])}
                  {meta.unit && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--gray-400)",
                        fontWeight: 500,
                        marginLeft: 3,
                      }}
                    >
                      {meta.unit}
                    </span>
                  )}
                </p>
                <div style={{ marginTop: "0.5rem" }}>
                  <ScoreBar value={subscore} />
                </div>
                <p
                  style={{
                    fontSize: "0.66rem",
                    color: "var(--gray-400)",
                    marginTop: "0.3rem",
                  }}
                >
                  delskår {Math.round(subscore)}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle>Øktforslag</SectionTitle>
        <Card>
          {session ? (
            <div className="flex flex-col gap-3">
              <SessionPart label="Oppvarming" text={session.warmup} />
              <SessionPart label="Hoveddel" text={session.main} />
              <SessionPart label="Avslutning" text={session.cooldown} />
              <p style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>
                Innenfor ramme: {c.limit.toLowerCase()}.
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
              Be om et konkret øktforslag innenfor dagens ramme.
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary mt-3 w-full"
            onClick={proposeSession}
            disabled={loadingSession}
          >
            {loadingSession ? "Tenker…" : "Foreslå økt"}
          </button>
        </Card>
      </div>

      <div>
        <SectionTitle>Spør coachen</SectionTitle>
        <Card>
          <div className="flex flex-col gap-2" style={{ marginBottom: "0.75rem" }}>
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
                  background:
                    m.role === "user" ? "var(--blue-main)" : "var(--gray-100)",
                  color: m.role === "user" ? "#fff" : "var(--gray-800)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.88rem",
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={send}
              aria-label="Send"
            >
              <i className="bx bx-send" aria-hidden="true" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SessionPart({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--blue-main)",
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "0.9rem", color: "var(--gray-700)", marginTop: 2 }}>
        {text}
      </p>
    </div>
  );
}

/* ============================ Trender ============================ */

export function TrendsScreen({ records }: { records: DailyRecord[] }) {
  const window = records.slice(-28);
  const hrv = window.map((r) => r.metrics.hrv_z);
  const rhr = window.map((r) => r.metrics.d_rhr);
  const acwrSeries = window.map((r) => r.metrics.acwr);

  const last = window[window.length - 1]?.metrics;

  const trends = [
    {
      title: "HRV z-skår",
      values: hrv,
      color: "#0A5EDC",
      current: formatSigned(last?.hrv_z ?? 0, 2),
      note:
        (last?.hrv_z ?? 0) < -0.5
          ? "Under baseline — nervesystemet er belastet."
          : (last?.hrv_z ?? 0) > 0.5
            ? "Over baseline — god parasympatisk balanse."
            : "Nær baseline.",
    },
    {
      title: "ΔRHR (bpm)",
      values: rhr,
      color: "#9747FF",
      current: formatSigned(last?.d_rhr ?? 0, 0),
      note:
        (last?.d_rhr ?? 0) >= 3
          ? "Forhøyet hvilepuls — ufullstendig restitusjon."
          : "Hvilepuls nær baseline.",
    },
    {
      title: "ACWR",
      values: acwrSeries,
      color: "#002359",
      threshold: 1.5,
      current: formatNumber(last?.acwr ?? 0, 2),
      note:
        (last?.acwr ?? 0) >= 1.5
          ? "Over 1,50 — høy skaderisiko, trapp ned."
          : (last?.acwr ?? 0) < 0.8
            ? "Under 0,80 — rom for å øke belastningen."
            : "I trygt vindu (0,80–1,50).",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
        Siste {window.length} dager.
      </p>
      {trends.map((t) => (
        <div key={t.title}>
          <div className="flex items-center justify-between">
            <SectionTitle>{t.title}</SectionTitle>
            <span
              style={{
                fontWeight: 700,
                color:
                  t.threshold && (last?.acwr ?? 0) >= t.threshold
                    ? "var(--error-600)"
                    : t.color,
              }}
            >
              {t.current}
            </span>
          </div>
          <Card>
            <Sparkline
              values={t.values}
              color={t.color}
              threshold={t.threshold}
            />
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--gray-600)",
                marginTop: "0.5rem",
              }}
            >
              {t.note}
            </p>
          </Card>
        </div>
      ))}
    </div>
  );
}

/* ============================ Historikk ============================ */

export function HistoryScreen({ records }: { records: DailyRecord[] }) {
  const ordered = useMemo(() => [...records].reverse(), [records]);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {ordered.map((r) => {
        const c = CATEGORIES[r.category];
        const open = expanded === r.date;
        return (
          <Card key={r.date} style={{ padding: 0 }}>
            <button
              type="button"
              className="flex w-full items-center justify-between"
              style={{ padding: "0.85rem 1rem", textAlign: "left" }}
              onClick={() => setExpanded(open ? null : r.date)}
            >
              <div className="flex items-center gap-3">
                <CategoryDot category={r.category} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                    {formatShortDay(r.date)}
                  </p>
                  <p style={{ fontSize: "0.76rem", color: "var(--gray-500)" }}>
                    {r.completed ?? "ingen økt"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700, color: c.text }}>{r.score}</span>
                <i
                  className={open ? "bx bx-chevron-up" : "bx bx-chevron-down"}
                  aria-hidden="true"
                  style={{ color: "var(--gray-400)" }}
                />
              </div>
            </button>
            {open && (
              <div
                className="grid grid-cols-2 gap-x-4 gap-y-1"
                style={{
                  padding: "0 1rem 0.85rem",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.75rem",
                }}
              >
                {METRIC_ORDER.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between"
                    style={{ fontSize: "0.82rem" }}
                  >
                    <span style={{ color: "var(--gray-500)" }}>
                      {METRIC_META[key].label}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {metricValueText(key, r.metrics[key])}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
