import { describe, it, expect } from "vitest";
import { missingPayrollEnvelopeV1, validateCase } from "../src/index";

describe("content validation", () => {
  it("first case passes all invariants", () => {
    const result = validateCase(missingPayrollEnvelopeV1);
    if (!result.ok) console.error(result.errors);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("meets authored question-family minimums", () => {
    const q = missingPayrollEnvelopeV1.questions;
    const count = (fam: string) => q.filter((x) => x.family === fam).length;
    expect(count("foundation")).toBeGreaterThanOrEqual(8);
    // "gap questions" per CONTENT_SYSTEM spans gaps + timeline + location.
    expect(count("gaps") + count("timeline") + count("location")).toBeGreaterThanOrEqual(12);
    expect(count("no_good_answer")).toBeGreaterThanOrEqual(8);
    expect(count("witness")).toBeGreaterThanOrEqual(6);
  });

  it("detects a broken case (duplicate id)", () => {
    const broken = {
      ...missingPayrollEnvelopeV1,
      questions: [...missingPayrollEnvelopeV1.questions, { ...missingPayrollEnvelopeV1.questions[0]! }],
    };
    expect(validateCase(broken).ok).toBe(false);
  });

  it("detects verdict band gaps", () => {
    const broken = {
      ...missingPayrollEnvelopeV1,
      verdictBands: missingPayrollEnvelopeV1.verdictBands.map((b, i) =>
        i === 0 ? { ...b, maxComposite: 30 } : b,
      ),
    };
    expect(validateCase(broken).ok).toBe(false);
  });
});
