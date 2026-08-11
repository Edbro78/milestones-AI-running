/**
 * Avledede felt som appen selv må regne ut — Garmin leverer dem ikke direkte.
 *   - hrv_z: HRV mot 90-dagers snitt og standardavvik
 *   - d_rhr: hvilepuls mot 60-dagers baseline
 *   - acwr:  7-dagers akutt belastning delt på 28-dagers kronisk
 */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * HRV som z-skår mot en 90-dagers baseline.
 * `history` er tidligere HRV-verdier (nyeste sist), maks 90 brukes.
 */
export function hrvZ(current: number, history: number[]): number {
  const window = history.slice(-90);
  const sd = stdDev(window);
  if (sd === 0) return 0;
  return (current - mean(window)) / sd;
}

/**
 * Avvik i hvilepuls (bpm) mot en 60-dagers baseline.
 * `history` er tidligere hvilepuls-verdier (nyeste sist), maks 60 brukes.
 */
export function deltaRhr(current: number, history: number[]): number {
  const window = history.slice(-60);
  if (window.length === 0) return 0;
  return Math.round(current - mean(window));
}

/**
 * ACWR: akutt (7-dagers snitt) delt på kronisk (28-dagers snitt) belastning.
 * `loads` er daglige treningsbelastninger (EPOC/training load), nyeste sist.
 * Inkluder dagens belastning som siste element.
 */
export function acwr(loads: number[]): number {
  const acute = mean(loads.slice(-7));
  const chronic = mean(loads.slice(-28));
  if (chronic === 0) return 0;
  return acute / chronic;
}
