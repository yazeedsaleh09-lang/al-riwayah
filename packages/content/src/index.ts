import {
  BANK_AL_SAHA_CASE_ID,
  bankAlSahaV1,
  type BankAlSahaCaseDefinition,
} from "./cases/bank-al-saha.v1";

/** Legacy export retained for old-match replay compatibility; it is not shipped. */
export { missingPayrollEnvelopeV1 } from "./cases/missing-payroll-envelope.v1";
export {
  WAREHOUSE_CASE_ID,
  warehouseCaseCopy,
  warehouseCaseMetadata,
  warehouseCaseV1,
  type WarehouseCaseContentDefinition,
  type WarehouseContentPatch,
  type WarehouseContentQuestion,
} from "./cases/warehouse.v1";
export {
  BANK_AL_SAHA_CASE_ID,
  BANK_LINKED_CANONICAL_SELECTION,
  BANK_LINKED_OPTION_COMPATIBILITY,
  BANK_STORY_OPTION_FITS,
  BANK_EVIDENCE_OPTION_FITS_BY_PACKET,
  BANK_SCORING_CANONICAL_SELECTION,
  bankAlSahaV1,
  type ArabicCopy,
  type BankAlSahaCaseDefinition,
  type BankContentQuestion,
  type BankEvidenceRequest,
  type BankPlayerCount,
  type BankQuestionChecks,
  type BankQuestionSet,
  type BankRepairBranch,
  type BankRepairId,
  type BankTruthPacket,
  type BankTruthPacketId,
} from "./cases/bank-al-saha.v1";
export {
  validateCase,
  validateCaseOrThrow,
  validateWarehouseCase,
  validateWarehouseCaseOrThrow,
  type ValidationResult,
} from "./validate";
export { validateBankAlSahaCase, validateBankAlSahaCaseOrThrow } from "./validate-bank-al-saha";

/** All shipped cases, keyed by stable id. */
export const CASES: Record<string, BankAlSahaCaseDefinition> = {
  [BANK_AL_SAHA_CASE_ID]: bankAlSahaV1,
};

/** The single case available in the review build. */
export const DEFAULT_CASE_ID = BANK_AL_SAHA_CASE_ID;

export function getCase(id: string): BankAlSahaCaseDefinition | undefined {
  return CASES[id];
}

/** Public, spoiler-free info for the marketing site / case library. */
export interface PublicCaseSummary {
  id: string;
  version: string;
  title: BankAlSahaCaseDefinition["title"];
  pitch: BankAlSahaCaseDefinition["pitch"];
  complexity: BankAlSahaCaseDefinition["complexity"];
  playerCounts: number[];
  durationMinutes: [number, number];
  status: "available" | "in_development";
}

export function publicCaseSummaries(): PublicCaseSummary[] {
  return [
    {
      id: bankAlSahaV1.id,
      version: bankAlSahaV1.version,
      title: bankAlSahaV1.title,
      pitch: bankAlSahaV1.pitch,
      complexity: bankAlSahaV1.complexity,
      playerCounts: [...bankAlSahaV1.supportedPlayerCounts],
      durationMinutes: [...bankAlSahaV1.durationMinutes],
      status: "available",
    },
  ];
}
