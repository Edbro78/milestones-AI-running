import { describe, expect, it } from "vitest";
import {
  CYCLE_OFFSET,
  INTERVAL_DAYS,
  addDays,
  blendedMilestoneSeconds,
  easyLongPaceS,
  evaluateLog,
  impliedMarathonSeconds,
  logFreshness,
  latestLog,
  lt2PaceS,
  marathonPaceS,
  marathonTimeFromLt2PaceS,
  nextDueIso,
  upsertMilestoneLog,
  type MilestoneLog,
} from "@/lib/milestones";

const GOAL_259 = 2 * 3600 + 59 * 60;
const HR_MAX = 194;

function lt2OnTarget(date: string): MilestoneLog {
  return {
    id: `lt2-${date}`,
    kind: "lt2",
    date,
    avgPaceS: lt2PaceS(GOAL_259),
    avgHr: Math.round(HR_MAX * 0.9),
    maxHr: Math.round(HR_MAX * 0.92),
    lactate: 4.0,
  };
}

function mpOnTarget(date: string): MilestoneLog {
  return {
    id: `mp-${date}`,
    kind: "mp",
    date,
    avgPaceS: marathonPaceS(GOAL_259),
    avgHr: Math.round(HR_MAX * 0.825),
    maxHr: Math.round(HR_MAX * 0.84),
    decouplingPct: 2.0,
  };
}

function longOnTarget(date: string): MilestoneLog {
  return {
    id: `long-${date}`,
    kind: "long",
    date,
    easyPaceS: easyLongPaceS(GOAL_259),
    mpPaceS: marathonPaceS(GOAL_259),
    avgHrPart1: Math.round(HR_MAX * 0.72),
    avgHrPart2: Math.round(HR_MAX * 0.82),
    maxHr: Math.round(HR_MAX * 0.84),
    decouplingPct: 3.5,
  };
}

describe("milestone paces", () => {
  it("matches the 2:59 table", () => {
    expect(marathonPaceS(GOAL_259)).toBe(4 * 60 + 15);
    expect(lt2PaceS(GOAL_259)).toBe(3 * 60 + 55);
    expect(easyLongPaceS(GOAL_259)).toBe(4 * 60 + 50);
  });

  it("matches the 2:30 and 4:30 table ends", () => {
    expect(lt2PaceS(2 * 3600 + 30 * 60)).toBe(3 * 60 + 15);
    expect(lt2PaceS(4 * 3600 + 30 * 60)).toBe(5 * 60 + 57);
  });
});

describe("nextDueIso", () => {
  it("is 21 days after the last log", () => {
    const due = nextDueIso(
      "lt2",
      [{ id: "1", kind: "lt2", date: "2026-08-01" }],
      "2026-09-27",
      new Date("2026-08-10T00:00:00"),
    );
    expect(due).toBe(addDays("2026-08-01", INTERVAL_DAYS));
  });

  it("staggers the first cycle from race day", () => {
    const from = new Date("2026-06-01T00:00:00");
    const race = "2026-09-27";
    expect(nextDueIso("lt2", [], race, from)).toBe(addDays(race, -90));
    expect(nextDueIso("mp", [], race, from)).toBe(
      addDays(race, -90 + CYCLE_OFFSET.mp),
    );
  });

  it("picks the latest log of that kind", () => {
    const last = latestLog(
      [
        { id: "a", kind: "lt2", date: "2026-07-01" },
        { id: "b", kind: "mp", date: "2026-08-01" },
        { id: "c", kind: "lt2", date: "2026-08-10" },
      ],
      "lt2",
    );
    expect(last?.id).toBe("c");
  });
});

describe("logFreshness", () => {
  const from = new Date("2026-08-30T12:00:00");

  it("is null when nothing is logged", () => {
    expect(logFreshness(undefined, from)).toBeNull();
  });

  it("is green when the test was logged within a month", () => {
    expect(logFreshness("2026-08-30", from)).toBe("green");
    expect(logFreshness("2026-07-31", from)).toBe("green");
  });

  it("is yellow more than one month after the log", () => {
    expect(logFreshness("2026-07-30", from)).toBe("yellow");
    expect(logFreshness("2026-07-01", from)).toBe("yellow");
  });

  it("is red more than two months after the log", () => {
    expect(logFreshness("2026-06-30", from)).toBe("red");
    expect(logFreshness("2026-05-01", from)).toBe("red");
  });
});

describe("evaluateLog", () => {
  it("passes an on-target LT2 log", () => {
    const v = evaluateLog(
      {
        id: "1",
        kind: "lt2",
        date: "2026-08-01",
        avgPaceS: lt2PaceS(GOAL_259),
        avgHr: 175,
        maxHr: 178,
      },
      {
        mpPaceS: marathonPaceS(GOAL_259),
        lt2PaceS: lt2PaceS(GOAL_259),
        easyPaceS: easyLongPaceS(GOAL_259),
        hrMax: 194,
      },
    );
    expect(v.passed).toBe(true);
  });
});

describe("implied marathon time", () => {
  it("roundtrips LT2 table paces to within a minute", () => {
    for (let t = 2 * 3600 + 30 * 60; t <= 4 * 3600 + 30 * 60; t += 300) {
      const back = marathonTimeFromLt2PaceS(lt2PaceS(t));
      expect(Math.abs(back - t)).toBeLessThan(90);
    }
  });

  it("maps on-target tests near the 2:59 goal", () => {
    const lt2 = impliedMarathonSeconds(lt2OnTarget("2026-08-01"), HR_MAX);
    const mp = impliedMarathonSeconds(mpOnTarget("2026-08-08"), HR_MAX);
    const long = impliedMarathonSeconds(longOnTarget("2026-08-15"), HR_MAX);
    expect(lt2).toBeGreaterThan(GOAL_259 - 90);
    expect(lt2).toBeLessThan(GOAL_259 + 90);
    expect(mp).toBeGreaterThan(GOAL_259 - 90);
    expect(mp).toBeLessThan(GOAL_259 + 90);
    expect(long).toBeGreaterThan(GOAL_259 - 90);
    expect(long).toBeLessThan(GOAL_259 + 90);
  });

  it("slows the estimate when LT2 pace is behind the table", () => {
    const slow = impliedMarathonSeconds(
      { ...lt2OnTarget("2026-08-01"), avgPaceS: lt2PaceS(3 * 3600 + 15 * 60) },
      HR_MAX,
    );
    const on = impliedMarathonSeconds(lt2OnTarget("2026-08-01"), HR_MAX);
    expect(slow).toBeGreaterThan(on! + 8 * 60);
  });

  it("slows MP when heart rate sits at LT2 intensity", () => {
    const easyHr = impliedMarathonSeconds(mpOnTarget("2026-08-08"), HR_MAX);
    const hardHr = impliedMarathonSeconds(
      {
        ...mpOnTarget("2026-08-08"),
        avgHr: Math.round(HR_MAX * 0.9),
        maxHr: Math.round(HR_MAX * 0.91),
      },
      HR_MAX,
    );
    expect(hardHr).toBeGreaterThan(easyHr! + 5 * 60);
  });

  it("slows the long test when decoupling is high", () => {
    const steady = impliedMarathonSeconds(longOnTarget("2026-08-15"), HR_MAX);
    const faded = impliedMarathonSeconds(
      { ...longOnTarget("2026-08-15"), decouplingPct: 9 },
      HR_MAX,
    );
    expect(faded).toBeGreaterThan(steady!);
  });
});

describe("blendedMilestoneSeconds", () => {
  it("weights newer logs more than older ones", () => {
    const logs: MilestoneLog[] = [
      { ...lt2OnTarget("2026-06-01"), avgPaceS: lt2PaceS(3 * 3600 + 20 * 60) },
      lt2OnTarget("2026-08-20"),
    ];
    const blend = blendedMilestoneSeconds(logs, HR_MAX, "2026-08-30");
    const recent = impliedMarathonSeconds(logs[1], HR_MAX)!;
    const old = impliedMarathonSeconds(logs[0], HR_MAX)!;
    expect(blend).not.toBeNull();
    expect(Math.abs(blend!.seconds - recent)).toBeLessThan(
      Math.abs(blend!.seconds - old),
    );
  });

  it("keeps a new date as a separate log", () => {
    const first = lt2OnTarget("2026-08-01");
    const second = lt2OnTarget("2026-08-22");
    const next = upsertMilestoneLog([first], second);
    expect(next).toHaveLength(2);
  });
});

