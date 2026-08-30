import type { DailyRecord } from "@/lib/types";

export type SignalLight = "green" | "yellow" | "red";

export type ReportLight = {
  light: SignalLight;
  headline: string;
  detail: string;
};

export const SIGNAL_META: Record<
  SignalLight,
  {
    label: string;
    headline: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
  }
> = {
  green: {
    label: "Grønt",
    headline: "Bedre enn normalt",
    bg: "#ECFDF3",
    border: "#A6F4C5",
    text: "#067647",
    dot: "#12B76A",
  },
  yellow: {
    label: "Gult",
    headline: "Tren som normalt",
    bg: "#FFFAEB",
    border: "#FEC84B",
    text: "#93370D",
    dot: "#F79009",
  },
  red: {
    label: "Rødt",
    headline: "Tallene er svake",
    bg: "#FEF3F2",
    border: "#FDA29B",
    text: "#B42318",
    dot: "#F04438",
  },
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function classify(today: number, baseline: number): SignalLight {
  const ratio = baseline === 0 ? 1 : today / baseline;
  if (today <= baseline * 0.82 || today <= baseline - 10) return "red";
  if (today >= baseline * 1.12 || today >= baseline + 8) return "green";
  return "yellow";
}

function latestUsableIndex(records: DailyRecord[]): number {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    const signals = [
      r.metrics.body_battery,
      r.metrics.sleep_score,
      r.hrvMs,
      r.recoveryScore,
    ].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    if (signals.length >= 2) return i;
  }
  return records.length - 1;
}

/** Trafikklys mot 60-dagers median: grønt = bedre enn normalt, gult = normalt, rødt = svakt. */
export function reportTrafficLight(records: DailyRecord[]): ReportLight {
  if (!records.length) {
    return {
      light: "yellow",
      headline: SIGNAL_META.yellow.headline,
      detail: "Ingen Garmin-data ennå. Synkroniser for å vurdere formen.",
    };
  }

  const idx = latestUsableIndex(records);
  const today = records[idx];
  const window = records.slice(Math.max(0, idx - 59), idx + 1);

  const bbHist = window
    .map((r) => r.metrics.body_battery)
    .filter((n): n is number => typeof n === "number");
  const sleepHist = window
    .map((r) => r.metrics.sleep_score)
    .filter((n): n is number => typeof n === "number");
  const hrvHist = window
    .map((r) => r.hrvMs)
    .filter((n): n is number => typeof n === "number");
  const recHist = window
    .map((r) => r.recoveryScore)
    .filter((n): n is number => typeof n === "number");

  const votes: SignalLight[] = [];
  const notes: string[] = [];

  const bbBase = median(bbHist);
  if (today.metrics.body_battery != null && bbBase != null) {
    const v = classify(today.metrics.body_battery, bbBase);
    votes.push(v);
    if (v !== "yellow") notes.push("body battery");
  }
  const sleepBase = median(sleepHist);
  if (today.metrics.sleep_score != null && sleepBase != null) {
    const v = classify(today.metrics.sleep_score, sleepBase);
    votes.push(v);
    if (v !== "yellow") notes.push("søvn");
  }
  const hrvBase = median(hrvHist);
  if (today.hrvMs != null && hrvBase != null) {
    const v = classify(today.hrvMs, hrvBase);
    votes.push(v);
    if (v !== "yellow") notes.push("HRV");
  }
  const recBase = median(recHist);
  if (today.recoveryScore != null && recBase != null) {
    const v = classify(today.recoveryScore, recBase);
    votes.push(v);
    if (v !== "yellow") notes.push("restitusjon");
  }

  const hardRed =
    (today.metrics.body_battery != null && today.metrics.body_battery < 30) ||
    (today.metrics.sleep_score != null && today.metrics.sleep_score < 50) ||
    (today.recoveryScore != null && today.recoveryScore < 30);

  const reds = votes.filter((v) => v === "red").length;
  const greens = votes.filter((v) => v === "green").length;

  let light: SignalLight = "yellow";
  if (hardRed || reds >= 2) light = "red";
  else if (greens >= 2 && reds === 0) light = "green";
  else if (reds === 1 && greens === 0) light = "red";
  else if (greens === 1 && reds === 0 && votes.length <= 2) light = "green";

  const named = notes.length ? notes.join(", ") : "målingene";
  const detail =
    light === "green"
      ? `${named.charAt(0).toUpperCase()}${named.slice(1)} ligger over ditt 60-dagers snitt. Du kan trene hardt.`
      : light === "red"
        ? `${named.charAt(0).toUpperCase()}${named.slice(1)} er svakere enn normalt. Ro ned i dag.`
        : "Tallene ligger rundt det som er vanlig for deg. Tren som planlagt.";

  return {
    light,
    headline: SIGNAL_META[light].headline,
    detail,
  };
}

export function lightForRecord(
  records: DailyRecord[],
  index: number,
): SignalLight {
  return reportTrafficLight(records.slice(0, index + 1)).light;
}
