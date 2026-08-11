import { describe, expect, it } from "vitest";
import {
  categoryFromScore,
  computeSubscores,
  evaluate,
  isSaturated,
  WEIGHTS,
} from "@/lib/trafficLight";
import type { Metrics } from "@/lib/types";

/** Nøytralt god dag → skår 91 → grønt pluss. Basis for regeltester. */
const good: Metrics = {
  hrv_z: 0.5,
  d_rhr: 0,
  body_battery: 80,
  sleep_score: 85,
  acwr: 1.0,
  recovery_hours: 5,
  steps: 6000,
  stress: 15,
};

const withMetric = (patch: Partial<Metrics>): Metrics => ({ ...good, ...patch });

describe("vekter", () => {
  it("summerer til 1,0", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("computeSubscores", () => {
  it("klipper til 0–100", () => {
    const s = computeSubscores(
      withMetric({ hrv_z: 5, d_rhr: -20, steps: 0, stress: 0 }),
    );
    for (const v of Object.values(s)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("regner delskårer korrekt for en god dag", () => {
    const s = computeSubscores(good);
    expect(s.hrv_z).toBeCloseTo(83.333, 2);
    expect(s.d_rhr).toBe(75);
    expect(s.body_battery).toBe(100);
    expect(s.sleep_score).toBe(100);
    expect(s.acwr).toBe(100);
    expect(s.recovery_hours).toBe(90);
    expect(s.steps).toBe(100);
    expect(s.stress).toBe(100);
  });

  it("ACWR straffes over 1,15 og under 0,80", () => {
    expect(computeSubscores(withMetric({ acwr: 1.35 })).acwr).toBeCloseTo(50, 6);
    expect(computeSubscores(withMetric({ acwr: 0.7 })).acwr).toBeCloseTo(75, 6);
  });
});

describe("saturated (parasympatisk metning)", () => {
  it("gir +30 på HRV-delskår når betingelsene er møtt", () => {
    const m = withMetric({ d_rhr: -3, hrv_z: -0.6, sleep_score: 70 });
    expect(isSaturated(m)).toBe(true);
    const s = computeSubscores(m);
    // (−0.6 + 2)/3*100 = 46.67, + 30 = 76.67
    expect(s.hrv_z).toBeCloseTo(76.667, 2);
  });

  it("er false når søvn er for lav", () => {
    expect(
      isSaturated(withMetric({ d_rhr: -3, hrv_z: -0.6, sleep_score: 69 })),
    ).toBe(false);
  });
});

describe("categoryFromScore grenseverdier", () => {
  const cases: [number, string][] = [
    [88, "green_plus"],
    [87, "green"],
    [75, "green"],
    [74, "yellow"],
    [62, "yellow"],
    [61, "yellow_caution"],
    [50, "yellow_caution"],
    [49, "red1"],
    [35, "red1"],
    [34, "red2"],
    [20, "red2"],
    [19, "red3"],
    [0, "red3"],
  ];
  it.each(cases)("skår %i → %s", (score, expected) => {
    expect(categoryFromScore(score)).toBe(expected);
  });
});

describe("harde regler tvinger nedover", () => {
  it("ΔRHR ≥ 7 → rødt 3", () => {
    expect(evaluate(withMetric({ d_rhr: 7 })).category).toBe("red3");
  });
  it("HRV z ≤ −2,5 → rødt 3", () => {
    expect(evaluate(withMetric({ hrv_z: -2.5 })).category).toBe("red3");
  });
  it("søvnskår ≤ 40 → rødt 3", () => {
    expect(evaluate(withMetric({ sleep_score: 40 })).category).toBe("red3");
  });
  it("Body Battery < 25 → rødt 3", () => {
    expect(evaluate(withMetric({ body_battery: 24 })).category).toBe("red3");
  });
  it("restitusjon > 60 t → rødt 3", () => {
    expect(evaluate(withMetric({ recovery_hours: 61 })).category).toBe("red3");
  });

  it("ACWR ≥ 1,75 → rødt 3, ≥ 1,50 → rødt 2", () => {
    expect(evaluate(withMetric({ acwr: 1.75 })).category).toBe("red3");
    expect(evaluate(withMetric({ acwr: 1.5 })).category).toBe("red2");
    expect(evaluate(withMetric({ acwr: 1.49 })).category).not.toBe("red2");
  });

  it("skritt: 25k → rødt 3, 20k → rødt 2, 16k på grønn dag → gult forsiktig", () => {
    expect(evaluate(withMetric({ steps: 25000 })).category).toBe("red3");
    expect(evaluate(withMetric({ steps: 20000 })).category).toBe("red2");
    expect(evaluate(withMetric({ steps: 16000 })).category).toBe(
      "yellow_caution",
    );
  });

  it("lagrer lesbar begrunnelse per utløst regel", () => {
    const result = evaluate(withMetric({ d_rhr: 7 }));
    expect(result.triggers).toHaveLength(1);
    expect(result.triggers[0].field).toBe("d_rhr");
    expect(result.triggers[0].reason.length).toBeGreaterThan(10);
  });
});

describe("regler hever aldri kategorien", () => {
  it("en god dag uten regler forblir grønt pluss", () => {
    const result = evaluate(good);
    expect(result.category).toBe("green_plus");
    expect(result.triggers).toHaveLength(0);
  });

  it("velger alltid strengeste kategori ved flere regler", () => {
    const result = evaluate(withMetric({ acwr: 1.5, d_rhr: 7 }));
    expect(result.category).toBe("red3");
    expect(result.triggers.length).toBeGreaterThanOrEqual(2);
  });

  it("returnerer saturated-flagget", () => {
    const m = withMetric({ d_rhr: -3, hrv_z: -0.6, sleep_score: 70 });
    expect(evaluate(m).saturated).toBe(true);
  });
});
