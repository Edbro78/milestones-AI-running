import { cookies } from "next/headers";
import { ATHLETE_COOKIE, getAthlete, type Athlete } from "@/lib/athletes";

export async function getSelectedAthlete(): Promise<Athlete | null> {
  const jar = await cookies();
  return getAthlete(jar.get(ATHLETE_COOKIE)?.value);
}
