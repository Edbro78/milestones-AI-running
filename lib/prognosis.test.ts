import { describe, expect, it } from "vitest";
import { MOCK_GOALS, getMockRecords } from "@/lib/mockData";
import {
  currentMarathonSeconds,
  marathonFormTrend,
  predictFinishSeconds,
  weekTowardGoal,
} from "@/lib/prognosis";

describe("weekTowardGoal", () => {
  const goal = MOCK_GOALS[0];

  it("returns a verdict with headline and km context", () => {
    const records = getMockRecords(28);
    const v = weekTowardGoal(records, goal, 78);
    expect(["closer", "further", "unchanged"]).toContain(v.direction);
    expect(v.headline.length).toBeGreaterThan(0);
    expect(v.detail).toMatch(/km/);
    expect(v.detail).toContain(goal.title);
  });

  it("marks closer when estimated time improves vs prior window", () => {
    const weak = getMockRecords(14).map((r, i) =>
      i < 7 ? { ...r, score: 50 } : { ...r, score: 90 },
    );
    const v = weekTowardGoal(weak, goal);
    expect(v.direction).toBe("closer");
    expect(v.headline).toBe("Nærmere målet");
  });
});

describe("currentMarathonSeconds", () => {
  it("is slower than target without form data (ca. 3:10 vs 2:59)", () => {
    const s = currentMarathonSeconds(2 * 3600 + 59 * 60, []);
    expect(s).toBeGreaterThan(2 * 3600 + 59 * 60);
    expect(s).toBeGreaterThanOrEqual(3 * 3600 + 9 * 60);
    expect(s).toBeLessThan(3 * 3600 + 12 * 60);
  });
});

describe("predictFinishSeconds", () => {
  it("returns a conservative estimate when there are no records", () => {
    expect(predictFinishSeconds(10800, [])).toBeGreaterThan(10800);
  });
});

describe("marathonFormTrend", () => {
  it("plans from today's estimate down to the goal at race day", () => {
    const records = getMockRecords(28);
    const goal = MOCK_GOALS[0];
    const from = new Date("2026-08-30T12:00:00");
    const t = marathonFormTrend(records, goal, from);
    expect(t.todayS).toBeGreaterThan(goal.targetTimeS);
    expect(t.plan[0].seconds).toBe(t.todayS);
    expect(t.plan[t.plan.length - 1].seconds).toBe(goal.targetTimeS);
    expect(t.daysLeft).toBeGreaterThan(0);
    expect(t.history.length).toBeGreaterThan(1);
  });
});
