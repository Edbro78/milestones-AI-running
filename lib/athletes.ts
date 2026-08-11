export type AthleteId = "edvard" | "bernt";

export type Athlete = {
  id: AthleteId;
  name: string;
  shortName: string;
  /** Garmin Connect wired for this athlete */
  garminReady: boolean;
  blurb: string;
  accent: string;
};

export const ATHLETES: Athlete[] = [
  {
    id: "edvard",
    name: "Edvard Brøther",
    shortName: "Edvard",
    garminReady: true,
    blurb: "Garmin aktiv · data siste 60 dager",
    accent: "#0f3d2e",
  },
  {
    id: "bernt",
    name: "Bernt Hodne",
    shortName: "Bernt",
    garminReady: false,
    blurb: "Garmin kommer snart",
    accent: "#3d5a4a",
  },
];

export const ATHLETE_COOKIE = "milestones_athlete";

export function getAthlete(id: string | null | undefined): Athlete | null {
  if (!id) return null;
  return ATHLETES.find((a) => a.id === id) ?? null;
}

export function isAthleteId(id: string): id is AthleteId {
  return id === "edvard" || id === "bernt";
}
