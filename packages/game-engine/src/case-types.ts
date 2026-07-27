/**
 * Authoring model for a case. Cases are authored in TypeScript so that
 * contradiction/plausibility rules can be pure, deterministic predicates
 * (CONTENT_SYSTEM.md). Structural invariants are enforced at build/test time by
 * the content validator; this file defines the shapes those predicates use.
 *
 * No visible Arabic text is ever used as a logic key — every entity has a
 * stable ASCII `id` and separate `LocalizedText` copy.
 */
import type { LocalizedText } from "./i18n";

export type ScoreAxis = "consistency" | "plausibility" | "stability" | "evasion";
export const SCORE_AXES: readonly ScoreAxis[] = [
  "consistency",
  "plausibility",
  "stability",
  "evasion",
];

export type QuestionFamily =
  | "foundation"
  | "gaps"
  | "no_good_answer"
  | "witness"
  | "timeline"
  | "location"
  | "followup";

export type ContradictionCategory =
  | "EVIDENCE_COLLISION"
  | "DIRECT_IMPOSSIBILITY"
  | "WITNESS_DENIAL"
  | "LOCKED_FACT_BREAK"
  | "COLOCATION"
  | "MAJORITY_ANOMALY";

/** Reveal priority (lower = revealed first). Matches GAME_DESIGN selection order. */
export const CATEGORY_PRIORITY: Record<ContradictionCategory, number> = {
  EVIDENCE_COLLISION: 1,
  DIRECT_IMPOSSIBILITY: 2,
  WITNESS_DENIAL: 3,
  LOCKED_FACT_BREAK: 4,
  COLOCATION: 5,
  MAJORITY_ANOMALY: 6,
};

export type PatchArchetype =
  | "shift_time"
  | "mistaken_identity"
  | "partial_admission"
  | "evidence_reinterpretation";

/** A minimal, immutable view of a player used by rule predicates. */
export interface PlayerRef {
  id: string;
  name: string;
  joinOrder: number;
}

export interface AnswerOption {
  id: string;
  label: LocalizedText;
  /** Normalized value used by rules. For witness answers this is a player id. */
  normalized: string;
  /** Marks vague / non-answer options; drives the evasion axis. */
  evasive?: boolean;
}

export type DynamicOptionSource = "other_players";

export interface Question {
  id: string;
  family: QuestionFamily;
  prompt: LocalizedText;
  /** Single fact tag this question probes; rules reference (playerId, tag). */
  tag: string;
  /** Static options, or omit and use `dynamicOptions`. */
  options?: AnswerOption[];
  /** Generate options at assignment time (e.g. the other players). */
  dynamicOptions?: DynamicOptionSource;
}

/** A single detected contradiction instance produced by a rule. */
export interface DetectedContradiction {
  ruleId: string;
  category: ContradictionCategory;
  severity: number;
  narrativeImportance: number;
  involvedPlayers: string[];
  /** Template params. Keys listed in `playerParams` hold player ids. */
  params: Record<string, string>;
  playerParams: string[];
  /** Two concrete sides plus the incompatibility rule used by the public reveal. */
  statementA?: LocalizedText;
  statementB?: LocalizedText;
  rule?: LocalizedText;
  explanation: LocalizedText;
}

export interface AnswerRecord {
  playerId: string;
  questionId: string;
  tag: string;
  optionId: string;
  /** Normalized value; for witness answers, the referenced player id. */
  normalized: string;
  evasive: boolean;
  /** True when the answer was a timeout/no-response fallback. */
  fallback: boolean;
}

/** Read-only context passed to rule predicates. Pure — no side effects. */
export interface DetectionContext {
  players: PlayerRef[];
  /** Locked shared-story facts, normalized. Keys are fact tags. */
  sharedStory: Record<string, string>;
  /** Private evidence ids per player. */
  evidenceByPlayer: Record<string, string[]>;
  /** Normalized assertions from all *revealed* immutable evidence. */
  evidenceFacts: { tag: string; value: string }[];
  /** All submitted answers so far. */
  answers: AnswerRecord[];
  /** Commitments created by applied patches. */
  commitments: Commitment[];
  /** Set of evidence ids currently revealed (includes surprise once released). */
  revealedEvidenceIds: string[];
  getAnswer(playerId: string, tag: string): AnswerRecord | undefined;
  answersByTag(tag: string): AnswerRecord[];
  playerName(playerId: string): string;
  /** Normalized assertions from a specific player's assigned private evidence. */
  privateEvidenceFacts(playerId: string): { tag: string; value: string }[];
}

export interface ContradictionRule {
  id: string;
  category: ContradictionCategory;
  severity: number;
  narrativeImportance: number;
  detect(ctx: DetectionContext): DetectedContradiction[];
}

export interface Commitment {
  id: string;
  factKey: string;
  value: string;
  fromPatchId: string;
  playerId?: string;
  label: LocalizedText;
}

export interface CommitmentTemplate {
  factKey: string;
  value?: string;
  /** Resolve the owning player from the contradiction being patched. */
  fromContradiction?: "primaryPlayer" | "secondaryPlayer";
  label: LocalizedText;
}

export interface PatchDefinition {
  id: string;
  archetype: PatchArchetype;
  resolvesCategories: ContradictionCategory[];
  publicLabel: LocalizedText;
  description: LocalizedText;
  commitments: CommitmentTemplate[];
  scoreEffects: Partial<Record<ScoreAxis, number>>;
  followUpQuestionIds: string[];
}

export interface PlausibilityRule {
  id: string;
  delta: number;
  reason: LocalizedText;
  applies(ctx: DetectionContext): boolean;
}

export interface PrivateEvidenceItem {
  id: string;
  title: LocalizedText;
  detail: LocalizedText;
  /** Normalized facts this evidence asserts about its holder. */
  asserts?: { tag: string; value: string }[];
  /** Restrict to specific player counts if needed. */
  playerCounts?: number[];
}

export interface EvidenceAssignmentConstraint {
  /** Exactly one of these evidence ids must be assigned in every match. */
  requireExactlyOne?: string[];
  /** Groups of evidence ids that may not be co-assigned. */
  mutuallyExclusive?: string[][];
}

export interface ReasonOption {
  id: string;
  label: LocalizedText;
  /** Plausibility hint used by authored rules. */
  plausibility?: number;
}

export interface LocationDef {
  id: string;
  label: LocalizedText;
}

export interface RoleDef {
  id: string;
  label: LocalizedText;
}

export interface PlanningConfig {
  reasons: ReasonOption[];
  locations: LocationDef[];
  roles: RoleDef[];
}

export interface ImmutableEvidenceItem {
  id: string;
  title: LocalizedText;
  detail: LocalizedText;
  timestamp?: string;
  asserts?: { tag: string; value: string }[];
}

export interface VerdictBandDef {
  band: "A" | "B" | "C" | "D" | "F";
  label: LocalizedText;
  summary: LocalizedText;
  /** Inclusive composite score range; validator enforces full [0,100] cover. */
  minComposite: number;
  maxComposite: number;
}

export interface ScoringConfig {
  initial: Record<ScoreAxis, number>;
  evasionPerAnswer: number;
  noResponsePenalty: { axis: ScoreAxis; delta: number }[];
  stabilityBreakPenalty: number;
  /** Composite weights; must sum to 1 across the three positive axes. */
  compositeWeights: { consistency: number; plausibility: number; stability: number };
  /** How much evasion subtracts from the composite (0..1 per point). */
  evasionCompositeWeight: number;
}

export interface CaseCopy {
  privateEvidenceIntro: LocalizedText;
  interrogationBanner: LocalizedText;
  planReviewIntro: LocalizedText;
}

export interface GameCase {
  id: string;
  version: string;
  title: LocalizedText;
  pitch: LocalizedText;
  premise: LocalizedText;
  complexity: LocalizedText;
  playerCounts: number[];
  durationMinutes: [number, number];
  immutableEvidence: ImmutableEvidenceItem[];
  surpriseEvidence: ImmutableEvidenceItem;
  privateEvidencePool: PrivateEvidenceItem[];
  evidenceConstraints: EvidenceAssignmentConstraint;
  planning: PlanningConfig;
  questions: Question[];
  contradictionRules: ContradictionRule[];
  plausibilityRules: PlausibilityRule[];
  patches: PatchDefinition[];
  scoring: ScoringConfig;
  verdictBands: VerdictBandDef[];
  copy: CaseCopy;
}
