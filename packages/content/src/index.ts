import type { WarehouseCaseDefinition } from "@al-riwayah/game-engine";
import { WAREHOUSE_CASE_ID, warehouseCaseMetadata, warehouseCaseV1 } from "./cases/warehouse.v1";

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
  validateCase,
  validateCaseOrThrow,
  validateWarehouseCase,
  validateWarehouseCaseOrThrow,
  type ValidationResult,
} from "./validate";

/** All shipped cases, keyed by stable id. */
export const CASES: Record<string, WarehouseCaseDefinition> = {
  [WAREHOUSE_CASE_ID]: warehouseCaseV1,
};

/** The single case available in the review build. */
export const DEFAULT_CASE_ID = WAREHOUSE_CASE_ID;

export function getCase(id: string): WarehouseCaseDefinition | undefined {
  return CASES[id];
}

/** Public, spoiler-free info for the marketing site / case library. */
export interface PublicCaseSummary {
  id: string;
  version: string;
  title: WarehouseCaseDefinition["title"];
  pitch: WarehouseCaseDefinition["pitch"];
  complexity: WarehouseCaseDefinition["complexity"];
  playerCounts: number[];
  durationMinutes: [number, number];
  status: "available" | "in_development";
}

export function publicCaseSummaries(): PublicCaseSummary[] {
  return [
    {
      id: warehouseCaseV1.id,
      version: warehouseCaseV1.version,
      title: warehouseCaseMetadata.title,
      pitch: warehouseCaseMetadata.pitch,
      complexity: warehouseCaseMetadata.complexity,
      playerCounts: [...warehouseCaseV1.supportedPlayerCounts],
      durationMinutes: [...warehouseCaseMetadata.durationMinutes],
      status: "available",
    },
  ];
}
