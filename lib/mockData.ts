import { mockDailyRecords } from "@/lib/garmin/mock";
import type { DailyRecord } from "@/lib/types";

export type Profile = {
  name: string;
  birthDate: string; // ISO
  weightKg: number;
  hrMax: number;
  hrThreshold: number;
  hrvBaseline: number;
  rhrBaseline: number;
  weeklyKm: number;
};

export type Goal = {
  id: string;
  title: string;
  eventDate: string; // ISO
  targetTimeS: number;
  isMain: boolean;
};

export const MOCK_PROFILE: Profile = {
  name: "Edvard",
  birthDate: "1997-04-12",
  weightKg: 72,
  hrMax: 194,
  hrThreshold: 176,
  hrvBaseline: 62,
  rhrBaseline: 48,
  weeklyKm: 78,
};

export const MOCK_GOALS: Goal[] = [
  {
    id: "goal-warszawa",
    title: "Maraton i Warszawa",
    eventDate: "2026-09-27",
    targetTimeS: 3 * 3600, // sub 3:00:00
    isMain: true,
  },
  {
    id: "goal-halv",
    title: "Sentrumsløpet halvmaraton",
    eventDate: "2026-08-30",
    targetTimeS: 82 * 60 + 30, // 1:22:30
    isMain: false,
  },
  {
    id: "goal-10k",
    title: "10 km testløp bane",
    eventDate: "2026-08-19",
    targetTimeS: 36 * 60 + 40, // 36:40
    isMain: false,
  },
];

/** 28 dagers historikk fra mock-provideren (deterministisk). */
export function getMockRecords(days = 28): DailyRecord[] {
  return mockDailyRecords(days);
}
