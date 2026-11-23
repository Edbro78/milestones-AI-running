import { describe, expect, it } from "vitest";
import { fillFromPrevious7 } from "@/lib/fillMissing";

describe("fillFromPrevious7", () => {
  it("fyller en manglende dag med snittet av de 7 foregående", () => {
    const { values, estimated } = fillFromPrevious7([80, 60, null, 70]);
    expect(values).toEqual([80, 60, 70, 70]);
    expect(estimated).toEqual([false, false, true, false]);
  });

  it("bruker bare ekte målinger i snittet, ikke andre estimater", () => {
    const { values } = fillFromPrevious7([90, null, null]);
    expect(values).toEqual([90, 90, 90]);
  });

  it("ser bare 7 dager tilbake", () => {
    const { values } = fillFromPrevious7([10, 20, 20, 20, 20, 20, 20, 20, null]);
    expect(values[8]).toBe(20);
  });

  it("lar en valgt dag (i dag) stå tom", () => {
    const { values } = fillFromPrevious7([5000, 6000, null], { skipIndex: 2 });
    expect(values[2]).toBeNull();
  });

  it("lar dagen stå tom når det ikke finnes data før", () => {
    expect(fillFromPrevious7([null, 50]).values[0]).toBeNull();
  });
});
