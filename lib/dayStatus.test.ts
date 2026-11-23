import { describe, expect, it } from "vitest";
import { dayStatus } from "@/lib/dayStatus";
import { getMockRecords } from "@/lib/mockData";

const base = { ...getMockRecords(1)[0], date: "2026-11-23", category: "green" as const };
const run = { startTime: null, name: "Løp", distanceKm: 9.2, durationSec: 3058, avgHr: 151 };

describe("dayStatus", () => {
  it("viser morgenens nivå før dagens økt", () => {
    const s = dayStatus({ ...base, runs: [], distanceKm: 0 }, "2026-11-23");
    expect(s.workoutDone).toBe(false);
    expect(s.category).toBe("green");
  });

  it("går til rødt 3 etter at dagens løpetur er registrert", () => {
    const s = dayStatus({ ...base, runs: [run], distanceKm: 9.2 }, "2026-11-23");
    expect(s.workoutDone).toBe(true);
    expect(s.category).toBe("red3");
    expect(s.preWorkoutCategory).toBe("green");
  });

  it("påvirker ikke tidligere dager", () => {
    const s = dayStatus({ ...base, runs: [run], distanceKm: 9.2 }, "2026-11-24");
    expect(s.workoutDone).toBe(false);
    expect(s.category).toBe("green");
  });
});
