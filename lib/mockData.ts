import { mockDailyRecords } from "@/lib/garmin/mock";
import type { DailyRecord } from "@/lib/types";

export type Profile = {
  name: string;
  birthDate: string; // ISO
  weightKg: number;
  hrMax: number;
  hrThreshold: number;
  hrvBaseline: number | null;
  rhrBaseline: number | null;
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
    targetTimeS: 2 * 3600 + 59 * 60, // 2:59:00
    isMain: true,
  },
];

/** 28 dagers historikk fra mock-provideren (deterministisk). */
export function getMockRecords(days = 28): DailyRecord[] {
  return mockDailyRecords(days);
}
