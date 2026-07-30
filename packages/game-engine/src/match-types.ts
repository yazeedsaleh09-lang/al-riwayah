/**
 * Authoritative match state. This lives on the server only and is NEVER
 * serialized to clients directly (ARCHITECTURE.md). Clients receive redacted
 * projections built in views.ts.
 */
import type { PhaseId } from "./phases";
import type {
  AnswerOption,
  AnswerRecord,
  Commitment,
  DetectedContradiction,
  QuestionFamily,
  ScoreAxis,
} from "./case-types";
import type { LocalizedText } from "./i18n";

export interface PlayerState {
  id: string;
  name: string;
  joinOrder: number;
  connected: boolean;
  ready: boolean;
  isHost: boolean;
}

export interface AssignedQuestion {
  instanceId: string;
  questionId: string;
  tag: string;
  family: QuestionFamily;
  prompt: LocalizedText;
  options: AnswerOption[];
}

export interface StoryProposal {
  value: string;
  byPlayer: string;
}

export interface ScoreLedgerEntry {
  axis: ScoreAxis;
  delta: number;
  reasonCode: string;
  refs: string[];
  release: "internal" | "summary";
  explanation?: LocalizedText;
}

export interface VerdictResult {
  band: "A" | "B" | "C" | "D" | "F";
  label: LocalizedText;
  summary: LocalizedText;
  composite: number;
  scores: Record<ScoreAxis, number>;
  decisiveFactors: LocalizedText[];
  mostConsistentPlayerId: string | null;
  primarySuspectPlayerId: string | null;
  evaluationStatus: "complete" | "incomplete";
  diagnosticCode: "INCOMPLETE_EVALUATION" | null;
}

export type PhaseSkipReason =
  | "NO_CONTRADICTION"
  | "NO_PATCH_ACTIONS"
  | "NO_FOLLOWUP_SOURCE";

export interface SkippedPhase {
  phase: PhaseId;
  reason: PhaseSkipReason;
  phaseRevision: number;
}

export interface MatchState {
  matchId: string;
  seed: string;
  caseId: string;
  caseVersion: string;
  phase: PhaseId;
  phaseRevision: number;
  /** Absolute deadline in ms (server clock). Null when phase has no timer. */
  deadlineAt: number | null;
  /** Server-configured multiplier used by automated realtime playtests. */
  phaseDurationScale: number;
  players: PlayerState[];
  /** Locked shared-story facts, normalized. Keys are fact tags. */
  sharedStory: Record<string, string>;
  /** Planning proposals per field id (pre-lock). */
  proposals: Record<string, StoryProposal[]>;
  /** Confirming player ids per field id (pre-lock). */
  confirmations: Record<string, string[]>;
  /** Private evidence ids per player. */
  privateEvidenceByPlayer: Record<string, string[]>;
  /** Current-phase question assigned per player. */
  questionsByPlayer: Record<string, AssignedQuestion>;
  /** Every answer accumulated across the match. */
  answers: AnswerRecord[];
  /** Player ids that answered the current interrogation phase. */
  answeredThisPhase: string[];
  /** Player ids that acknowledged the current ack-phase. */
  acknowledgedThisPhase: string[];
  /** Server-only contradiction candidates. */
  detectedContradictions: DetectedContradiction[];
  /** Ids of contradictions already revealed to the room. */
  releasedContradictionIds: string[];
  /** Released contradiction key for each reveal slot. */
  releasedContradictionByPhase: Partial<Record<PhaseId, string>>;
  /** Patch selections applied so far. */
  selectedPatches: { patchId: string; phase: PhaseId; contradictionKey: string }[];
  /** Patch votes per phase: phase -> playerId -> patchId. */
  patchVotes: Record<string, Record<string, string>>;
  /** Commitments created by applied patches. */
  commitments: Commitment[];
  /** Deterministic, auditable score ledger. */
  scoreLedger: ScoreLedgerEntry[];
  verdict: VerdictResult | null;
  /** Ids of immutable evidence currently revealed (surprise added at its phase). */
  revealedEvidenceIds: string[];
  /** Server-authoritative record of phases skipped because no action was possible. */
  skippedPhases: SkippedPhase[];
}
