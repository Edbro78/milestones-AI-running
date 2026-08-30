import { describe, expect, it } from "vitest";
import { extractBodyBatteryNow } from "@/lib/garmin/bodyBattery";

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
