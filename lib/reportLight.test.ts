import { describe, expect, it } from "vitest";
import { getMockRecords } from "@/lib/mockData";
import { reportTrafficLight } from "@/lib/reportLight";
import type { DailyRecord } from "@/lib/types";

function withToday(
  records: DailyRecord[],
  patch: Partial<DailyRecord> & { metrics?: Partial<DailyRecord["metrics"]> },
): DailyRecord[] {
  const last = records[records.length - 1];
  return [
    ...records.slice(0, -1),
    {
      ...last,
      ...patch,
      metrics: { ...last.metrics, ...patch.metrics },
    },
  ];
}

describe("reportTrafficLight", () => {
  it("is yellow when latest day is around the 60-day median", () => {
    const records = getMockRecords(60);
    const v = reportTrafficLight(records);
    expect(["green", "yellow", "red"]).toContain(v.light);
    expect(v.headline.length).toBeGreaterThan(0);
  });

  it("is green when recovery signals are clearly above the median", () => {
    const base = getMockRecords(60);
    const v = reportTrafficLight(
      withToday(base, {
        hrvMs: 120,
        recoveryScore: 98,
        metrics: { body_battery: 98, sleep_score: 96 },
      }),
    );
    expect(v.light).toBe("green");
    expect(v.headline).toBe("Bedre enn normalt");
  });

  it("is red when recovery signals are clearly below the median", () => {
    const base = getMockRecords(60);
    const v = reportTrafficLight(
      withToday(base, {
        hrvMs: 12,
        recoveryScore: 18,
        metrics: { body_battery: 18, sleep_score: 32 },
      }),
    );
    expect(v.light).toBe("red");
    expect(v.headline).toBe("Tallene er svake");
  });
});
