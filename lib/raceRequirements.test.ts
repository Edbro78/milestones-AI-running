import { describe, expect, it } from "vitest";
import { raceRequirements, recommendedWeeklyKm, vdotFor, MARATHON_M } from "@/lib/raceRequirements";

const hms = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

describe("VDOT mot dokumentets maratontabell", () => {
  it("3:00:00 gir VDOT ≈ 53.5", () => {
    expect(vdotFor(MARATHON_M, hms(3, 0))).toBeCloseTo(53.5, 0);
  });

  it("3:00:00 krever ca. 10:52 på 3 km, 18:46 på 5 km og 38:59 på 10 km", () => {
    const r = raceRequirements(hms(3, 0));
    const [k3, k5, k10] = r.distances.map((d) => d.maxSeconds);
    expect(Math.abs(k3 - hms(0, 10, 53))).toBeLessThan(10);
    expect(Math.abs(k5 - hms(0, 18, 47))).toBeLessThan(10);
    expect(Math.abs(k10 - hms(0, 39, 3))).toBeLessThan(15);
  });

  it("3:30:00 krever ca. 21:57 på 5 km", () => {
    const k5 = raceRequirements(hms(3, 30)).distances[1].maxSeconds;
    expect(Math.abs(k5 - hms(0, 21, 57))).toBeLessThan(15);
  });
});

describe("recommendedWeeklyKm", () => {
  it("treffer tabellrader eksakt", () => {
    expect(recommendedWeeklyKm(hms(3, 0))).toEqual({ minKm: 75, maxKm: 105 });
    expect(recommendedWeeklyKm(hms(2, 30))).toEqual({ minKm: 110, maxKm: 145 });
  });

  it("interpolerer mellom rader", () => {
    // Midt mellom 2:50 (85–110) og 3:00 (75–105)
    expect(recommendedWeeklyKm(hms(2, 55))).toEqual({ minKm: 80, maxKm: 108 });
  });

  it("klemmer utenfor tabellen", () => {
    expect(recommendedWeeklyKm(hms(5, 0))).toEqual({ minKm: 30, maxKm: 45 });
    expect(recommendedWeeklyKm(hms(2, 5))).toEqual({ minKm: 140, maxKm: 190 });
  });
});
