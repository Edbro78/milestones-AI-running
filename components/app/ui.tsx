"use client";

import { CATEGORIES } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import type { Category } from "@/lib/types";

export function CategoryDot({
  category,
  size = 12,
}: {
  category: Category;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: CATEGORIES[category].dot,
        flex: "none",
      }}
    />
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
