import { describe, expect, it } from "vitest";
import {
  emptyWeekPlan,
  isInterval,
  parseWeekPlan,
  plannedForToday,
  plannedWeeklyKm,
  sessionSummary,
  todayWeekdayIndex,
} from "@/lib/weekPlan";

describe("weekPlan", () => {
  it("treats middels and hard as interval", () => {
    expect(isInterval("rolig")).toBe(false);
    expect(isInterval("middels")).toBe(true);
    expect(isInterval("hard")).toBe(true);
  });

  it("sums planned km for the week", () => {
    const plan = emptyWeekPlan();
    plan.tue = { distance: "kort", effort: "hard", km: 10 };
    plan.sun = { distance: "lang", effort: "rolig", km: 24 };
    expect(plannedWeeklyKm(plan)).toBe(34);
  });

  it("describes a session with interval when effort is not easy", () => {
    expect(
      sessionSummary({ distance: "lang", effort: "rolig", km: 24 }),
    ).toContain("rolig");
    expect(
      sessionSummary({ distance: "kort", effort: "middels", km: 10 }),
    ).toContain("intervall");
  });

  it("maps Sunday to index 6", () => {
    expect(todayWeekdayIndex(new Date("2026-08-30T12:00:00"))).toBe(6);
  });

  it("returns Tuesday plan on Tuesday", () => {
    const plan = emptyWeekPlan();
    plan.tue = { distance: "lang", effort: "hard", km: 22 };
    const tue = plannedForToday(plan, new Date("2026-09-01T12:00:00"));
    expect(tue?.km).toBe(22);
    expect(plannedForToday(plan, new Date("2026-09-02T12:00:00"))).toBeNull();
  });

  it("parses a stored week plan JSON", () => {
    const raw = JSON.stringify({
      tue: { distance: "kort", effort: "middels", km: 10 },
    });
    expect(parseWeekPlan(raw).tue).toEqual({
      distance: "kort",
      effort: "middels",
      km: 10,
    });
  });
});
