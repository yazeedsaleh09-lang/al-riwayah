import { describe, expect, it } from "vitest";
import type { GameCase, ScoreAxis } from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE, validateCase, validateCaseOrThrow } from "../src";

function caseWith(overrides: Partial<GameCase>): GameCase {
  return { ...CASE, ...overrides };
}

describe("content validator error branches", () => {
  it("reports missing question copy, choices, normalized values, and duplicate choices", () => {
    const original = CASE.questions[0]!;
    const brokenQuestion = {
      ...original,
      prompt: { ar: "" },
      dynamicOptions: undefined,
      options: [
        { id: "duplicate", label: { ar: "" }, normalized: "" },
        { id: "duplicate", label: { ar: "ثانٍ" }, normalized: "second" },
      ],
    };
    const result = validateCase(
      caseWith({ questions: [brokenQuestion, ...CASE.questions.slice(1)] }),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("missing Arabic prompt"),
        expect.stringContaining("missing Arabic label"),
        expect.stringContaining("has no normalized value"),
        expect.stringContaining("Duplicate option id"),
      ]),
    );
  });

  it("reports all unsupported player counts", () => {
    const result = validateCase(caseWith({ playerCounts: [] }));
    for (const count of [4, 5, 6]) {
      expect(result.errors).toContain(`Case must support player count ${count}.`);
    }
  });

  it("reports malformed patch contracts and missing category coverage", () => {
    const malformed = {
      ...CASE.patches[0]!,
      commitments: [],
      resolvesCategories: [
        "NOT_A_CATEGORY" as (typeof CASE.patches)[number]["resolvesCategories"][number],
      ],
      followUpQuestionIds: ["q.missing"],
    };
    const noHooks = {
      ...CASE.patches[1]!,
      resolvesCategories: [],
      followUpQuestionIds: [],
    };
    const result = validateCase(caseWith({ patches: [malformed, noHooks] }));

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("creates no commitment"),
        expect.stringContaining("resolves category NOT_A_CATEGORY that no rule produces"),
        expect.stringContaining("unknown follow-up question q.missing"),
        expect.stringContaining("resolves no contradiction category"),
        expect.stringContaining("has no follow-up hooks"),
        expect.stringContaining("No patch resolves contradiction category"),
      ]),
    );
  });

  it("reports absent and malformed verdict-band coverage", () => {
    expect(validateCase(caseWith({ verdictBands: [] })).errors).toContain(
      "No verdict bands defined.",
    );

    const result = validateCase(
      caseWith({
        verdictBands: [
          {
            ...CASE.verdictBands[0]!,
            minComposite: 1,
            maxComposite: 0,
          },
          {
            ...CASE.verdictBands.at(-1)!,
            minComposite: 50,
            maxComposite: 99,
          },
        ],
      }),
    );
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Verdict bands must start at composite 0.",
        "Verdict bands must end at composite 100.",
        expect.stringContaining("inverted range"),
        expect.stringContaining("not contiguous"),
      ]),
    );
  });

  it("reports missing scoring axes and invalid composite weights", () => {
    const initial = { ...CASE.scoring.initial } as Partial<Record<ScoreAxis, number>>;
    delete initial.evasion;
    const result = validateCase(
      caseWith({
        scoring: {
          ...CASE.scoring,
          initial: initial as Record<ScoreAxis, number>,
          compositeWeights: {
            consistency: 0.5,
            plausibility: 0.5,
            stability: 0.5,
          },
        },
      }),
    );
    expect(result.errors).toContain("Scoring initial missing axis evasion.");
    expect(result.errors.some((error) => error.includes("must sum to 1"))).toBe(true);
  });

  it("reports mutually-exclusive evidence when fallback reuse exhausts the pool", () => {
    const evidence = CASE.privateEvidencePool.slice(0, 2).map((item, index) => ({
      ...item,
      id: `exclusive-${index}`,
      playerCounts: undefined,
    }));
    const result = validateCase(
      caseWith({
        privateEvidencePool: evidence,
        evidenceConstraints: {
          mutuallyExclusive: [evidence.map(({ id }) => id)],
        },
      }),
    );
    expect(
      result.errors.some((error) => error.includes("Mutually-exclusive group co-assigned")),
    ).toBe(true);
  });

  it("captures evidence-assignment exceptions and exposes throwing validation", () => {
    const evidencePool = new Proxy(CASE.privateEvidencePool, {
      get(target, property, receiver) {
        if (property === "filter") {
          return () => {
            throw new Error("synthetic assignment failure");
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const broken = caseWith({ privateEvidencePool: evidencePool });
    const result = validateCase(broken);
    expect(
      result.errors.filter((error) => error.includes("Evidence assignment threw")),
    ).toHaveLength(3);
    expect(() => validateCaseOrThrow(broken)).toThrow(`Case ${CASE.id} failed validation`);
  });

  it("does not throw for a valid authored case", () => {
    expect(() => validateCaseOrThrow(CASE)).not.toThrow();
  });
});
