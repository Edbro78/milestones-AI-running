"use client";

import { CATEGORIES } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import { CATEGORY_ORDER } from "@/lib/trafficLight";
import type { Category } from "@/lib/types";

export function CategoryDot({
  category,
  size = 12,
}: {
  category: Category;
  size?: number;
}) {
  const showLevel = size >= 14;
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: CATEGORIES[category].dot,
        flex: "none",
        color: "#fff",
        fontWeight: 800,
        fontSize: Math.round(size * 0.55),
        lineHeight: 1,
      }}
    >
      {showLevel ? CATEGORIES[category].level : null}
    </span>
  );
}

/** Skala 1–7 med dagens nivå uthevet. */
export function LevelScale({ active }: { active: Category }) {
  const keys = Object.keys(CATEGORIES) as Category[];
  return (
    <div className="flex gap-1" role="img" aria-label={`Nivå ${CATEGORIES[active].level} av 7: ${CATEGORIES[active].label}`}>
      {keys.map((k) => {
        const on = k === active;
        return (
          <span
            key={k}
            className="flex flex-1 items-center justify-center"
            style={{
              height: on ? 26 : 18,
              alignSelf: "flex-end",
              borderRadius: 6,
              background: CATEGORIES[k].dot,
              opacity: on ? 1 : 0.35,
              color: "#fff",
              fontWeight: 800,
              fontSize: on ? "0.8rem" : "0.62rem",
              boxShadow: on ? "0 0 0 2px var(--white), 0 0 0 3px " + CATEGORIES[k].dot : undefined,
            }}
          >
            {CATEGORIES[k].level}
          </span>
        );
      })}
    </div>
  );
}

export function CategoryPill({ category }: { category: Category }) {
  const c = CATEGORIES[category];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: "var(--radius-pill)",
        padding: "0.2rem 0.6rem",
        fontSize: "0.72rem",
        fontWeight: 600,
      }}
    >
      <CategoryDot category={category} size={8} />
      {c.label}
    </span>
  );
}

/** Hele trafiklysskalaen, med dagens nivå fremhevet. */
export function CategoryScaleLegend({
  active,
  heading,
}: {
  active?: Category;
  heading?: string;
}) {
  return (
    <div>
      {heading ? (
        <p
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "var(--sp-navy)",
            margin: "0 0 0.45rem",
            lineHeight: 1.3,
          }}
        >
          {heading}
        </p>
      ) : null}
      <p
        style={{
          fontSize: "0.62rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--gray-500)",
          margin: "0 0 0.35rem",
        }}
      >
        Skala · rødt til grønt
      </p>
      <div className="flex flex-col gap-1">
        {[...CATEGORY_ORDER].reverse().map((key) => {
          const c = CATEGORIES[key];
          const on = key === active;
          return (
            <div
              key={key}
              className="flex items-start gap-1.5"
              style={{
                borderRadius: "var(--radius-sm)",
                padding: "0.22rem 0.35rem",
                background: on ? c.bg : "transparent",
                border: on ? `1px solid ${c.border}` : "1px solid transparent",
                opacity: active && !on ? 0.55 : 1,
              }}
            >
              <CategoryDot category={key} size={8} />
              <div className="min-w-0">
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: on ? 700 : 600,
                    color: c.text,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {c.label}
                  {on ? " · denne dagen" : ""}
                </p>
                <p
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--gray-600)",
                    margin: "0.08rem 0 0",
                    lineHeight: 1.3,
                  }}
                >
                  {c.limit}. {c.advice}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Kort med tittel og valgfri handling. */
export function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`panel ${className}`}
      style={{ borderRadius: "var(--radius-lg)", padding: "1rem", ...style }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
        <h2
      className="text-[0.72rem] uppercase"
      style={{
        letterSpacing: "0.12em",
        color: "var(--gray-500)",
        fontWeight: 600,
        marginBottom: "0.5rem",
      }}
    >
      {children}
    </h2>
  );
}

/**
 * Enkel sparkline i SVG. Skalerer verdiene til boksen, med valgfri
 * terskellinje (f.eks. ACWR = 1,50) og markering av verdier over terskel.
 */
export function Sparkline({
  values,
  color,
  height = 48,
  threshold,
  thresholdColor = "var(--error-500)",
}: {
  values: number[];
  color: string;
  height?: number;
  threshold?: number;
  thresholdColor?: string;
}) {
  const width = 320;
  const pad = 4;
  if (values.length < 2) {
    return <div style={{ height }} />;
  }

  const all = threshold != null ? [...values, threshold] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;

  const x = (i: number) =>
    pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) =>
    height - pad - ((v - min) / range) * (height - pad * 2);

  const path = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const areaPath = `${pad},${height - pad} ${path} ${width - pad},${height - pad}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
      role="img"
    >
      <polyline points={areaPath} fill={color} opacity={0.08} stroke="none" />
      {threshold != null && (
        <line
          x1={pad}
          x2={width - pad}
          y1={y(threshold)}
          y2={y(threshold)}
          stroke={thresholdColor}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) =>
        threshold != null && v >= threshold ? (
          <circle key={i} cx={x(i)} cy={y(v)} r={2.6} fill={thresholdColor} />
        ) : null,
      )}
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r={3}
        fill={color}
      />
    </svg>
  );
}

/** Horisontal delskår-bar 0–100. */
export function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 75
      ? "var(--success-500)"
      : value >= 50
        ? "var(--warning-500)"
        : "var(--error-500)";
  return (
    <div
      style={{
        height: 6,
        background: "var(--gray-100)",
        borderRadius: "var(--radius-pill)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          background: color,
          borderRadius: "var(--radius-pill)",
          transition: "width 0.2s ease-out",
        }}
      />
    </div>
  );
}

export function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
    >
      <span style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, color: "var(--sp-navy)" }}>{value}</span>
    </div>
  );
}

/** Formaterer skår som heltall med norsk stil. */
export function scoreText(n: number) {
  return formatNumber(n, 0);
}

/**
 * Bunnark (overlay) som legger seg over telefonskjermen. Brukes til
 * sekundært innhold (øktforslag, chat, skjema, detaljer) slik at
 * hovedskjermene slipper å scrolle. Arket har egen indre scroll.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(16,24,40,0.45)" }}
      />
      <div
        style={{
          position: "relative",
          background: "var(--white)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "86%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-xl)",
          animation: "sheet-up 0.2s ease-out",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--sp-navy)" }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            style={{ color: "var(--gray-500)", padding: 4 }}
          >
            <i className="bx bx-x" aria-hidden="true" style={{ fontSize: "1.4rem" }} />
          </button>
        </div>
        <div
          style={{
            overflowY: "auto",
            padding: "1rem",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Liten nøkkeltall-boks. */
export function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="panel"
      style={{ borderRadius: "var(--radius-md)", padding: "0.55rem 0.6rem" }}
    >
      <p style={{ fontSize: "0.62rem", color: "var(--gray-500)" }}>{label}</p>
      <p
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: color ?? "var(--sp-navy)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
    </div>
  );
}
