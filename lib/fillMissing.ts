/**
 * Dager uten Garmin-data (klokka av, ikke synket) får snittet av de 7
 * foregående dagene med data, i stedet for faste plassholdere.
 */
export function fillFromPrevious7(
  values: (number | null)[],
  options: { skipIndex?: number } = {},
): { values: (number | null)[]; estimated: boolean[] } {
  const out = [...values];
  const estimated = values.map(() => false);
  for (let i = 0; i < out.length; i++) {
    if (out[i] != null || i === options.skipIndex) continue;
    const prev = values
      .slice(Math.max(0, i - 7), i)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (!prev.length) continue;
    out[i] = Math.round(prev.reduce((a, b) => a + b, 0) / prev.length);
    estimated[i] = true;
  }
  return { values: out, estimated };
}
