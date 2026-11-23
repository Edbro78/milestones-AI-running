/**
 * Grønn / gul / rød for dagens nøkkeltall. Grensene følger docs/Trafikklys.txt,
 * slått sammen til tre farger: grønn = taler for trening, gul = vær obs,
 * rød = taler for mindre trening.
 */
export type Tone = "green" | "yellow" | "red";

export const TONE_COLOR: Record<Tone, { dot: string; text: string; label: string }> = {
  green: { dot: "#12B76A", text: "#067647", label: "bra" },
  yellow: { dot: "#F79009", text: "#B54708", label: "obs" },
  red: { dot: "#F04438", text: "#B42318", label: "svakt" },
};

/** Body Battery: ≥70 grønn, 40–69 gul, under 40 rød. */
export function bodyBatteryTone(v: number | null | undefined): Tone | null {
  if (v == null) return null;
  return v >= 70 ? "green" : v >= 40 ? "yellow" : "red";
}

/** Søvnskår: ≥70 grønn, 50–69 gul, under 50 rød. */
export function sleepTone(v: number | null | undefined): Tone | null {
  if (v == null) return null;
  return v >= 70 ? "green" : v >= 50 ? "yellow" : "red";
}

/**
 * HRV mot eget normalnivå (z-skår): over midten av normalen = grønn,
 * inntil 1 SD under = gul, mer enn 1 SD under = rød.
 */
export function hrvTone(z: number | null | undefined): Tone | null {
  if (z == null || !Number.isFinite(z)) return null;
  return z >= 0 ? "green" : z >= -1 ? "yellow" : "red";
}

/** Garmin restitusjon / Training Readiness (0–100): ≥70 grønn, 40–69 gul, under 40 rød. */
export function recoveryTone(v: number | null | undefined): Tone | null {
  if (v == null) return null;
  return v >= 70 ? "green" : v >= 40 ? "yellow" : "red";
}

/** Skritt så langt i dag: under 12 000 grønn, 12 000–17 999 gul, 18 000+ rød. */
export function stepsTone(v: number | null | undefined): Tone | null {
  if (v == null) return null;
  return v < 12000 ? "green" : v < 18000 ? "yellow" : "red";
}
