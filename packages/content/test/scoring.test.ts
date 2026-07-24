import { describe, it, expect } from "vitest";
import { axisTotals, computeComposite, resolveBand, SCORE_AXES } from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE } from "../src/index";

describe("scoring (ENG-009, ENG-010)", () => {
  it("ENG-009: axis totals equal initial + sum of ledger entries", () => {
    const ledger = [
      { axis: "consistency" as const, delta: -16, reasonCode: "x", refs: [], release: "summary" as const },
      { axis: "consistency" as const, delta: -8, reasonCode: "y", refs: [], release: "summary" as const },
      { axis: "evasion" as const, delta: 10, reasonCode: "z", refs: [], release: "summary" as const },
    ];
    const totals = axisTotals(ledger, CASE);
    expect(totals.consistency).toBe(100 - 16 - 8);
    expect(totals.evasion).toBe(10);
    expect(totals.plausibility).toBe(100);
  });

  it("axes clamp to their valid range", () => {
    const ledger = [
      { axis: "consistency" as const, delta: -500, reasonCode: "x", refs: [], release: "summary" as const },
      { axis: "evasion" as const, delta: -50, reasonCode: "z", refs: [], release: "summary" as const },
    ];
    const totals = axisTotals(ledger, CASE);
    expect(totals.consistency).toBe(0);
    expect(totals.evasion).toBe(0);
  });

  it("ENG-010: every composite 0..100 maps to exactly one band", () => {
    for (let c = 0; c <= 100; c++) {
      const matches = CASE.verdictBands.filter(
        (b) => c >= b.minComposite && c <= b.maxComposite,
      );
      expect(matches).toHaveLength(1);
      expect(() => resolveBand(c, CASE)).not.toThrow();
    }
  });

  it("composite is monotonic in positive axes", () => {
    const low = computeComposite(
      { consistency: 40, plausibility: 40, stability: 40, evasion: 0 },
      CASE,
    );
    const high = computeComposite(
      { consistency: 100, plausibility: 100, stability: 100, evasion: 0 },
      CASE,
    );
    expect(high).toBeGreaterThan(low);
  });

  it("evasion reduces the composite", () => {
    const base = { consistency: 90, plausibility: 90, stability: 90, evasion: 0 };
    const evasive = { ...base, evasion: 40 };
    expect(computeComposite(evasive, CASE)).toBeLessThan(computeComposite(base, CASE));
  });

  it("initial config defines all four axes", () => {
    for (const axis of SCORE_AXES) {
      expect(typeof CASE.scoring.initial[axis]).toBe("number");
    }
  });
});
