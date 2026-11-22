/**
 * Krav til underdistanser og ukevolum for et maratonmål.
 * Kilde: docs/milepæler fra deep r.txt (Jack Daniels' VDOT + kravsmatrise for helmaraton).
 */

export const MARATHON_M = 42195;

/** Andel av VO2maks som kan holdes i t minutter (Daniels). */
export function fractionOfVo2Max(minutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * minutes) +
    0.2989558 * Math.exp(-0.1932605 * minutes)
  );
}

/** Oksygenkrav (ml/kg/min) ved fart v i meter per minutt (Daniels). */
export function vo2AtSpeed(metersPerMin: number): number {
  return -4.6 + 0.182258 * metersPerMin + 0.000104 * metersPerMin ** 2;
}

/** VDOT for en prestasjon: distanse i meter, tid i sekunder. */
export function vdotFor(distanceM: number, seconds: number): number {
  const minutes = seconds / 60;
  return vo2AtSpeed(distanceM / minutes) / fractionOfVo2Max(minutes);
}

/** Ekvivalent tid (sekunder) på en distanse for gitt VDOT. Løses med halvering. */
export function timeForVdot(distanceM: number, vdot: number): number {
  let lo = 60; // VDOT synker når tiden øker
  let hi = 12 * 3600;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (vdotFor(distanceM, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Kravsmatrise for helmaraton fra dokumentet: måltid → anbefalt km/uke (min–maks). */
const MARATHON_VOLUME_TABLE: { timeS: number; minKm: number; maxKm: number }[] = [
  { timeS: 2 * 3600 + 10 * 60, minKm: 140, maxKm: 190 },
  { timeS: 2 * 3600 + 20 * 60, minKm: 125, maxKm: 165 },
  { timeS: 2 * 3600 + 30 * 60, minKm: 110, maxKm: 145 },
  { timeS: 2 * 3600 + 40 * 60, minKm: 95, maxKm: 125 },
  { timeS: 2 * 3600 + 50 * 60, minKm: 85, maxKm: 110 },
  { timeS: 3 * 3600, minKm: 75, maxKm: 105 },
  { timeS: 3 * 3600 + 15 * 60, minKm: 65, maxKm: 85 },
  { timeS: 3 * 3600 + 30 * 60, minKm: 55, maxKm: 75 },
  { timeS: 3 * 3600 + 45 * 60, minKm: 45, maxKm: 65 },
  { timeS: 4 * 3600, minKm: 40, maxKm: 55 },
  { timeS: 4 * 3600 + 15 * 60, minKm: 35, maxKm: 50 },
  { timeS: 4 * 3600 + 30 * 60, minKm: 30, maxKm: 45 },
];

/** Anbefalt ukevolum, lineært interpolert mellom radene i tabellen (klemt i endene). */
export function recommendedWeeklyKm(marathonS: number): { minKm: number; maxKm: number } {
  const t = MARATHON_VOLUME_TABLE;
  if (marathonS <= t[0].timeS) return { minKm: t[0].minKm, maxKm: t[0].maxKm };
  const last = t[t.length - 1];
  if (marathonS >= last.timeS) return { minKm: last.minKm, maxKm: last.maxKm };
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i];
    const b = t[i + 1];
    if (marathonS >= a.timeS && marathonS <= b.timeS) {
      const f = (marathonS - a.timeS) / (b.timeS - a.timeS);
      return {
        minKm: Math.round(a.minKm + (b.minKm - a.minKm) * f),
        maxKm: Math.round(a.maxKm + (b.maxKm - a.maxKm) * f),
      };
    }
  }
  return { minKm: last.minKm, maxKm: last.maxKm };
}

export type DistanceRequirement = {
  key: "3k" | "5k" | "10k";
  label: string;
  distanceM: number;
  /** Tid du må klare (sekunder) for at maratonmålet skal være realistisk. */
  maxSeconds: number;
};

export type RaceRequirements = {
  vdot: number;
  distances: DistanceRequirement[];
  weeklyKm: { minKm: number; maxKm: number };
};

export function raceRequirements(marathonS: number): RaceRequirements {
  const vdot = vdotFor(MARATHON_M, marathonS);
  const dist: [DistanceRequirement["key"], string, number][] = [
    ["3k", "3 km", 3000],
    ["5k", "5 km", 5000],
    ["10k", "10 km", 10000],
  ];
  return {
    vdot,
    distances: dist.map(([key, label, distanceM]) => ({
      key,
      label,
      distanceM,
      maxSeconds: timeForVdot(distanceM, vdot),
    })),
    weeklyKm: recommendedWeeklyKm(marathonS),
  };
}
