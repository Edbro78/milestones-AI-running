import { describe, expect, it } from "vitest";
import { acwr, deltaRhr, hrvZ } from "@/lib/derive";

describe("hrvZ", () => {
  it("gir 0 når dagens verdi er lik snittet", () => {
    expect(hrvZ(25, [10, 20, 30, 40])).toBeCloseTo(0, 10);
  });
  it("gir 0 når baseline mangler variasjon", () => {
    expect(hrvZ(60, [60, 60, 60])).toBe(0);
  });
  it("er positiv over baseline, negativ under", () => {
    expect(hrvZ(50, [10, 20, 30, 40])).toBeGreaterThan(0);
    expect(hrvZ(5, [10, 20, 30, 40])).toBeLessThan(0);
  });
});

describe("deltaRhr", () => {
  it("regner avvik mot baseline-snitt", () => {
    expect(deltaRhr(52, [48, 50])).toBe(3);
    expect(deltaRhr(47, [48, 50])).toBe(-2);
  });
});

describe("acwr", () => {
  it("gir 1,0 ved jevn belastning", () => {
    expect(acwr(new Array(28).fill(100))).toBeCloseTo(1, 10);
  });
  it("gir 1,6 når akutt er dobbelt av kronisk snitt", () => {
    const loads = [...new Array(21).fill(100), ...new Array(7).fill(200)];
    expect(acwr(loads)).toBeCloseTo(1.6, 5);
  });
  it("gir 0 uten historikk", () => {
    expect(acwr([])).toBe(0);
  });
});
