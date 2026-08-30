import { describe, expect, it } from "vitest";
import { mergeRecords, nextFetchFrom } from "@/lib/garmin/syncCache";
import { getMockRecords } from "@/lib/mockData";

describe("nextFetchFrom", () => {
  it("asks for a full window when nothing is cached", () => {
    expect(nextFetchFrom([], "2026-08-30")).toBeNull();
  });

  it("only refreshes today when the last 60 days are present", () => {
    const records = getMockRecords(60);
    const today = records[records.length - 1].date;
    expect(nextFetchFrom(records, today)).toBe(today);
  });

  it("starts at the first missing day in the window", () => {
    const records = getMockRecords(60).slice(0, -2);
    const today = getMockRecords(60).at(-1)!.date;
    const expected = getMockRecords(60).at(-2)!.date;
    expect(nextFetchFrom(records, today)).toBe(expected);
  });
});

describe("mergeRecords", () => {
  it("lets incoming days replace the same date", () => {
    const [a, b] = getMockRecords(2);
    const updated = { ...b, distanceKm: 12.3 };
    const merged = mergeRecords([a, b], [updated], 60);
    expect(merged).toHaveLength(2);
    expect(merged[1].distanceKm).toBe(12.3);
    expect(merged[0].date).toBe(a.date);
  });
});
