/**
 * Canonical 19-phase sequence (PROJECT_SPEC.md). The engine is authoritative
 * over phase order; clients only render the current phase.
 */

export const PHASE_SEQUENCE = [
  "LOBBY",
  "CASE_BRIEF",
  "PRIVATE_EVIDENCE",
  "PLAN_REASON",
  "PLAN_LOCATIONS",
  "PLAN_ROLES",
  "PLAN_REVIEW",
  "INTERROGATION_FOUNDATION",
  "INTERROGATION_GAPS",
  "INTERROGATION_NO_GOOD_ANSWER",
  "CONTRADICTION_REVEAL_1",
  "PATCH_1",
  "SURPRISE_EVIDENCE",
  "INTERROGATION_FOLLOWUP",
  "CONTRADICTION_REVEAL_2",
  "PATCH_2",
  "FINAL_QUESTION",
  "VERDICT",
  "RESULTS",
] as const;

export type PhaseId = (typeof PHASE_SEQUENCE)[number];

const INDEX = new Map<PhaseId, number>(PHASE_SEQUENCE.map((p, i) => [p, i]));

export function isPhaseId(value: unknown): value is PhaseId {
  return typeof value === "string" && INDEX.has(value as PhaseId);
}

export function phaseIndex(phase: PhaseId): number {
  return INDEX.get(phase)!;
}

/** The phase that legally follows `phase`, or null at RESULTS. */
export function nextPhase(phase: PhaseId): PhaseId | null {
  const i = phaseIndex(phase);
  return i + 1 < PHASE_SEQUENCE.length ? PHASE_SEQUENCE[i + 1]! : null;
}

/** Phase families used for interaction/UX and validation. */
export const PLANNING_PHASES: readonly PhaseId[] = [
  "PLAN_REASON",
  "PLAN_LOCATIONS",
  "PLAN_ROLES",
  "PLAN_REVIEW",
];

export const INTERROGATION_PHASES: readonly PhaseId[] = [
  "INTERROGATION_FOUNDATION",
  "INTERROGATION_GAPS",
  "INTERROGATION_NO_GOOD_ANSWER",
  "INTERROGATION_FOLLOWUP",
  "FINAL_QUESTION",
];

export const REVEAL_PHASES: readonly PhaseId[] = [
  "CONTRADICTION_REVEAL_1",
  "CONTRADICTION_REVEAL_2",
];

export const PATCH_PHASES: readonly PhaseId[] = ["PATCH_1", "PATCH_2"];

export function isInterrogationPhase(phase: PhaseId): boolean {
  return INTERROGATION_PHASES.includes(phase);
}

/**
 * Default server-authoritative phase durations in seconds (GAME_DESIGN phase
 * table). LOBBY/RESULTS have no timer. Interrogation windows use a mid value
 * from the 12–18s range; the final question is a tight 8s.
 */
export const DEFAULT_PHASE_DURATIONS_S: Record<PhaseId, number | null> = {
  LOBBY: null,
  CASE_BRIEF: 30,
  PRIVATE_EVIDENCE: 35,
  PLAN_REASON: 20,
  PLAN_LOCATIONS: 30,
  PLAN_ROLES: 25,
  PLAN_REVIEW: 20,
  INTERROGATION_FOUNDATION: 16,
  INTERROGATION_GAPS: 16,
  INTERROGATION_NO_GOOD_ANSWER: 15,
  CONTRADICTION_REVEAL_1: 25,
  PATCH_1: 25,
  SURPRISE_EVIDENCE: 20,
  INTERROGATION_FOLLOWUP: 16,
  CONTRADICTION_REVEAL_2: 25,
  PATCH_2: 20,
  FINAL_QUESTION: 8,
  VERDICT: 20,
  RESULTS: null,
};

/** Extended-planning multiplier applied to planning phase timers when enabled. */
export const EXTENDED_PLANNING_MULTIPLIER = 1.5;
