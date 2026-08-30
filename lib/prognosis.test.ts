import { describe, expect, it } from "vitest";
import { MOCK_GOALS, getMockRecords } from "@/lib/mockData";
import {
  currentMarathonSeconds,
  dailyGoalEstimateSeconds,
  marathonFormTrend,
  predictFinishSeconds,
  rollingWeeklyKm,
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

describe("rollingWeeklyKm", () => {
  it("sums the last 7 days at the latest point", () => {
    const records = getMockRecords(14);
    const rolling = rollingWeeklyKm(records, 7);
    const last7 = records.slice(-7).reduce((s, r) => s + (r.distanceKm ?? 0), 0);
    expect(rolling[rolling.length - 1]).toBeCloseTo(last7, 5);
    expect(rolling.length).toBe(14);
  });
});

describe("dailyGoalEstimateSeconds", () => {
  it("returns one estimate per day", () => {
    const records = getMockRecords(10);
    const series = dailyGoalEstimateSeconds(records, MOCK_GOALS[0].targetTimeS);
    expect(series).toHaveLength(10);
    expect(series.every((s) => s > 0)).toBe(true);
  });
});

describe("milestone calibration of currentMarathonSeconds", () => {
  const goal = MOCK_GOALS[0].targetTimeS;
  const hrMax = 194;
  const mp = Math.round(goal / 42.195);

  it("does not change without logs", () => {
    const records = getMockRecords(14);
    expect(currentMarathonSeconds(goal, records, { logs: [], hrMax })).toBe(
      currentMarathonSeconds(goal, records),
    );
  });

  it("moves closer to the goal after on-target tests", () => {
    const records = getMockRecords(14);
    const base = currentMarathonSeconds(goal, records);
    const logs = [
      {
        id: "lt2",
        kind: "lt2" as const,
        date: "2026-08-20",
        avgPaceS: Math.round(mp - 20),
        avgHr: 175,
      },
      {
        id: "mp",
        kind: "mp" as const,
        date: "2026-08-27",
        avgPaceS: mp,
        avgHr: 160,
        decouplingPct: 2,
      },
      {
        id: "long",
        kind: "long" as const,
        date: "2026-08-30",
        easyPaceS: mp + 35,
        mpPaceS: mp,
        avgHrPart1: 140,
        avgHrPart2: 160,
        decouplingPct: 3,
      },
    ];
    const calibrated = currentMarathonSeconds(goal, records, {
      logs,
      hrMax,
      asOf: "2026-08-30",
    });
    expect(base).toBeGreaterThan(goal);
    expect(calibrated).toBeLessThan(base);
    expect(calibrated).toBeGreaterThan(goal - 60);
  });

  it("moves further from the goal after slow tests", () => {
    const records = getMockRecords(14);
    const base = currentMarathonSeconds(goal, records);
    const slowMp = mp + 25;
    const logs = [
      {
        id: "lt2",
        kind: "lt2" as const,
        date: "2026-08-20",
        avgPaceS: slowMp - 18,
        avgHr: 180,
      },
      {
        id: "mp",
        kind: "mp" as const,
        date: "2026-08-27",
        avgPaceS: slowMp,
        avgHr: 175,
        decouplingPct: 6,
      },
    ];
    const calibrated = currentMarathonSeconds(goal, records, {
      logs,
      hrMax,
      asOf: "2026-08-30",
    });
    expect(calibrated).toBeGreaterThan(base);
  });

  it("trusts three tests more than one", () => {
    const records = getMockRecords(14);
    const one = currentMarathonSeconds(goal, records, {
      logs: [
        {
          id: "lt2",
          kind: "lt2" as const,
          date: "2026-08-30",
          avgPaceS: Math.round(mp - 20),
          avgHr: 175,
        },
      ],
      hrMax,
      asOf: "2026-08-30",
    });
    const three = currentMarathonSeconds(goal, records, {
      logs: [
        {
          id: "lt2",
          kind: "lt2" as const,
          date: "2026-08-16",
          avgPaceS: Math.round(mp - 20),
          avgHr: 175,
        },
        {
          id: "mp",
          kind: "mp" as const,
          date: "2026-08-23",
          avgPaceS: mp,
          avgHr: 160,
          decouplingPct: 2,
        },
        {
          id: "long",
          kind: "long" as const,
          date: "2026-08-30",
          easyPaceS: mp + 35,
          mpPaceS: mp,
          avgHrPart1: 140,
          avgHrPart2: 160,
          decouplingPct: 3,
        },
      ],
      hrMax,
      asOf: "2026-08-30",
    });
    expect(Math.abs(three - goal)).toBeLessThan(Math.abs(one - goal));
  });
});

