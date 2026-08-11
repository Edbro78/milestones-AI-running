import { cookies } from "next/headers";
import { ATHLETE_COOKIE, getAthlete, ATHLETES, type Athlete } from "@/lib/athletes";

/**
 * Returnerer valgt utøver. Én-bruker-app: faller tilbake til Edvard
 * (garminReady: true) når ingen cookie er satt.
 */
export async function getSelectedAthlete(): Promise<Athlete | null> {
  const jar = await cookies();
  const fromCookie = getAthlete(jar.get(ATHLETE_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  return ATHLETES.find((a) => a.id === "edvard") ?? null;
}
