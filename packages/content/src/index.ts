import type { GameCase } from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 } from "./cases/missing-payroll-envelope.v1";

export { missingPayrollEnvelopeV1 } from "./cases/missing-payroll-envelope.v1";
export { validateCase, validateCaseOrThrow, type ValidationResult } from "./validate";

/** All shipped cases, keyed by stable id. */
export const CASES: Record<string, GameCase> = {
  [missingPayrollEnvelopeV1.id]: missingPayrollEnvelopeV1,
};

/** The single case available in the review build. */
export const DEFAULT_CASE_ID = missingPayrollEnvelopeV1.id;

export function getCase(id: string): GameCase | undefined {
  return CASES[id];
}

/** Public, spoiler-free info for the marketing site / case library. */
export interface PublicCaseSummary {
  id: string;
  version: string;
  title: GameCase["title"];
  pitch: GameCase["pitch"];
  complexity: GameCase["complexity"];
  playerCounts: number[];
  durationMinutes: [number, number];
  status: "available" | "in_development";
}

export function publicCaseSummaries(): PublicCaseSummary[] {
  return Object.values(CASES).map((c) => ({
    id: c.id,
    version: c.version,
    title: c.title,
    pitch: c.pitch,
    complexity: c.complexity,
    playerCounts: c.playerCounts,
    durationMinutes: c.durationMinutes,
    status: "available",
  }));
}
