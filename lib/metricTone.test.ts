import { describe, expect, it } from "vitest";
import { bodyBatteryTone, hrvTone, recoveryTone, sleepTone, stepsTone } from "@/lib/metricTone";

describe("metricTone", () => {
  it("skritt: 0 er grønt, mange skritt er rødt", () => {
    expect(stepsTone(0)).toBe("green");
    expect(stepsTone(15000)).toBe("yellow");
    expect(stepsTone(20000)).toBe("red");
  });

  it("HRV under midten av normalen er ikke grønn", () => {
    expect(hrvTone(0.4)).toBe("green");
    expect(hrvTone(-0.3)).toBe("yellow");
    expect(hrvTone(-1.6)).toBe("red");
  });

  it("body battery, søvn og restitusjon", () => {
    expect(bodyBatteryTone(85)).toBe("green");
    expect(bodyBatteryTone(50)).toBe("yellow");
    expect(bodyBatteryTone(20)).toBe("red");
    expect(sleepTone(85)).toBe("green");
    expect(sleepTone(45)).toBe("red");
    expect(recoveryTone(68)).toBe("yellow");
  });

  it("manglende verdi gir ingen farge", () => {
    expect(bodyBatteryTone(null)).toBeNull();
    expect(hrvTone(undefined)).toBeNull();
  });
});
