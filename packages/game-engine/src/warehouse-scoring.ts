import {
  WAREHOUSE_CHAPTERS,
  type WarehouseCommitment,
  type WarehouseComparisonEvaluation,
  type WarehouseEvidenceEvaluation,
  type WarehouseScoreResult,
} from "./warehouse-types";

const COMPATIBILITY_VALUE = {
  MATCH: 1,
  COMPATIBLE_VARIANCE: 0.85,
  GAP: 0.65,
  DIRECT_CONTRADICTION: 0.2,
} as const;

const EVIDENCE_FIT_VALUE = {
  DIRECTLY_EXPLAINED: 1,
  COHERENT_PATCH: 0.85,
  POSSIBLE_COMPLEX_PATCH: 0.65,
  LEAVES_GAP: 0.4,
  UNEXPLAINED_OR_CONFLICT: 0.1,
} as const;

const COMMITMENT_VALUE = {
  satisfied: 1,
  partial: 0.5,
  broken: 0.1,
} as const;

export interface CalculateWarehouseScoreInput {
  comparisons: readonly WarehouseComparisonEvaluation[];
  documentedComparisonSkips: readonly string[];
  evidenceEvaluations: readonly WarehouseEvidenceEvaluation[];
  commitments: readonly WarehouseCommitment[];
  unnecessaryComplexityPenalty: number;
  chaptersResolved: readonly string[];
}

const INCOMPLETE_SCORE: WarehouseScoreResult = {
  status: "incomplete",
  diagnosticCode: "FAIR_SCORE_UNAVAILABLE",
  message: "تعذر حساب نتيجة عادلة لهذه الجولة.",
};

export function calculateWarehouseScore(
  input: CalculateWarehouseScoreInput,
): WarehouseScoreResult {
  const hasEveryChapter = WAREHOUSE_CHAPTERS.every((chapter) =>
    input.chaptersResolved.includes(chapter),
  );
  const hasEveryEvidence = WAREHOUSE_CHAPTERS.every(
    (chapter) =>
      input.evidenceEvaluations.filter((evaluation) => evaluation.chapter === chapter).length === 1,
  );
  const hasComparisons =
    input.comparisons.length > 0 || input.documentedComparisonSkips.length > 0;
  const commitmentsComplete = input.commitments.every(
    (commitment) => commitment.status !== "pending",
  );
  if (!hasEveryChapter || !hasEveryEvidence || !hasComparisons || !commitmentsComplete) {
    return INCOMPLETE_SCORE;
  }

  const comparisonWeight = input.comparisons.reduce(
    (total, comparison) => total + comparison.weight,
    0,
  );
  if (input.comparisons.length > 0 && comparisonWeight <= 0) return INCOMPLETE_SCORE;
  const consistency =
    input.comparisons.length === 0
      ? 100
      : Math.round(
          (100 *
            input.comparisons.reduce(
              (total, comparison) =>
                total + COMPATIBILITY_VALUE[comparison.compatibility] * comparison.weight,
              0,
            )) /
            comparisonWeight,
        );

  const evidenceFit =
    (100 *
      input.evidenceEvaluations.reduce(
        (total, evaluation) => total + EVIDENCE_FIT_VALUE[evaluation.fit],
        0,
      )) /
    input.evidenceEvaluations.length;
  const plausibility = Math.max(
    0,
    Math.min(100, Math.round(evidenceFit - input.unnecessaryComplexityPenalty)),
  );

  const testedCommitments = input.commitments.filter(
    (commitment): commitment is WarehouseCommitment & {
      status: keyof typeof COMMITMENT_VALUE;
    } => commitment.status in COMMITMENT_VALUE,
  );
  const stability =
    testedCommitments.length === 0
      ? 100
      : Math.round(
          (100 *
            testedCommitments.reduce(
              (total, commitment) => total + COMMITMENT_VALUE[commitment.status],
              0,
            )) /
            testedCommitments.length,
        );

  return {
    status: "complete",
    consistency,
    plausibility,
    stability,
    overall: Math.round(consistency * 0.4 + plausibility * 0.35 + stability * 0.25),
  };
}
