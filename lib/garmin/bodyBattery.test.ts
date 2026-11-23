import { describe, expect, it } from "vitest";
import { bodyBatteryMorning, extractBodyBatteryNow } from "@/lib/garmin/bodyBattery";

describe("extractBodyBatteryNow", () => {
  it("uses the latest sample, not the morning peak", () => {
    expect(
      extractBodyBatteryNow({
        bodyBatteryHighestValue: 100,
        charged: 100,
        bodyBatteryValuesArray: [
          [1, 100],
          [2, 82],
          [3, 44],
        ],
      }),
    ).toBe(44);
  });

  it("prefers Garmin most-recent field over the series peak", () => {
    expect(
      extractBodyBatteryNow({
        bodyBatteryMostRecentValue: 44,
        bodyBatteryHighestValue: 100,
        bodyBatteryValuesArray: [[1, 100]],
      }),
    ).toBe(44);
  });

  it("ignores highest/charged when there is no current reading", () => {
    expect(
      extractBodyBatteryNow({
        bodyBatteryHighestValue: 100,
        charged: 100,
      }),
    ).toBeNull();
  });
});

describe("bodyBatteryMorning", () => {
  const row = {
    startTimestampGMT: "2026-11-21T23:00:00.0",
    startTimestampLocal: "2026-11-22T00:00:00.0",
    bodyBatteryValuesArray: [
      [Date.parse("2026-11-22T06:00:00Z"), 68],
      [Date.parse("2026-11-22T10:00:00Z"), 60],
      [Date.parse("2026-11-22T13:00:00Z"), 25],
      [Date.parse("2026-11-22T21:00:00Z"), 38],
    ],
  };

  it("bruker morgentoppen før økten, ikke nivået etter", () => {
    expect(bodyBatteryMorning(row, "2026-11-22", Date.parse("2026-11-22T11:14:00Z"))).toBe(68);
  });

  it("bruker morgentoppen før kl. 12 uten økt", () => {
    expect(bodyBatteryMorning(row, "2026-11-22", null)).toBe(68);
  });

  it("gir null når det ikke finnes målinger før økten (starten av dagen er ukjent)", () => {
    expect(bodyBatteryMorning(row, "2026-11-22", Date.parse("2026-11-22T04:00:00Z"))).toBeNull();
  });
});
