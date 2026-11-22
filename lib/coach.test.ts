import { describe, expect, it } from "vitest";
import { getMockRecords } from "@/lib/mockData";
import { suggestSession, suggestSessionForLight } from "@/lib/coach";
import type { PlannedSession } from "@/lib/weekPlan";

const planned: PlannedSession = {
  distance: "lang",
  effort: "hard",
  km: 22,
};

describe("suggestSession with week plan", () => {
  it("uses the planned Tuesday interval when the light is green", () => {
    const today = { ...getMockRecords(1)[0], category: "green" as const, score: 80 };
    const s = suggestSession(today, planned);
    expect(s.main).toMatch(/22/);
    expect(s.main.toLowerCase()).toMatch(/intervall|1600/);
    expect(s.note).toMatch(/Planlagt/);
  });

  it("drops the interval when the light is red", () => {
    const today = { ...getMockRecords(1)[0], category: "red2" as const, score: 20 };
    const s = suggestSession(today, planned);
    expect(s.main.toLowerCase()).not.toMatch(/1600/);
    expect(s.note).toMatch(/ingen løping/i);
  });

  it("puts 80% max HR first and allows 87% on green threshold days", () => {
    const today = { ...getMockRecords(1)[0], category: "green" as const, score: 80 };
    const s = suggestSession(today, planned, 194);
    expect(s.emphasis).toMatch(/80 %/);
    expect(s.emphasis).toMatch(/87 %/);
    expect(s.emphasis).toMatch(/155 bpm/);
    expect(s.emphasis).toMatch(/169 bpm/);
    expect(s.main).toMatch(/80 % av makspuls/);
    expect(s.main).toMatch(/87 %/);
  });

  it("keeps threshold at 80% on yellow days", () => {
    const today = { ...getMockRecords(1)[0], category: "yellow" as const, score: 65 };
    const s = suggestSession(today, planned, 194);
    expect(s.emphasis).toMatch(/80 %/);
    expect(s.emphasis).not.toMatch(/pushe til 87/);
    expect(s.main).toMatch(/80 % av makspuls/);
    expect(s.main).not.toMatch(/87 %/);
  });
});

describe("suggestSessionForLight", () => {
  const today = getMockRecords(1)[0];

  it("grønt gir ambisiøs økt med terskel", () => {
    const { category, suggestion } = suggestSessionForLight(today, "green");
    expect(category).toBe("green_plus");
    expect(suggestion.main).toMatch(/terskel/i);
  });

  it("gult gir rolig tur uten intervaller", () => {
    const { category, suggestion } = suggestSessionForLight(today, "yellow");
    expect(category).toBe("yellow_caution");
    expect(suggestion.main).toMatch(/ingen intervaller/i);
  });

  it("rødt gir bare lett jogg", () => {
    const { category, suggestion } = suggestSessionForLight(today, "red");
    expect(category).toBe("red1");
    expect(suggestion.main).toMatch(/sone 1/i);
  });
});
