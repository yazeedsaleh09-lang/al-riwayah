export const WAREHOUSE_CHAPTERS = ["power", "device", "car"] as const;
export type WarehouseChapter = (typeof WAREHOUSE_CHAPTERS)[number];
export type WarehouseCaseChapter = "story" | WarehouseChapter | "result";
export type WarehousePlayerCount = 4 | 5 | 6;
export type WarehouseSeat = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export const WAREHOUSE_PHASES = [
  "STORY_BUILDING",
  "STORY_REVIEW",
  "SILENT_PHASE_INTRO",
  "CHAPTER_CONTEXT",
  "SILENT_ANSWERING",
  "WAITING_FOR_ANSWERS",
  "ISSUE_REVEAL",
  "OPEN_DISCUSSION",
  "PATCH_BALLOT",
  "PATCH_RESOLUTION",
  "STORY_UPDATE",
  "RESULT_CALCULATION",
  "RESULT_REVEAL",
] as const;
export type WarehousePhase = (typeof WAREHOUSE_PHASES)[number];

export type WarehouseStructuredValue = string | number | boolean | null;
export interface WarehouseStructuredFact {
  key: string;
  value: WarehouseStructuredValue | undefined;
}

export type WarehouseEntryReason =
  | "retrieve_misplaced_shipment"
  | "check_inventory_mismatch"
  | "return_equipment_before_audit";
export type WarehouseEntryRoute = "side_door" | "loading_gate" | "delivery_vehicle";
export type WarehouseLocation =
  | "inventory_room"
  | "electrical_corridor"
  | "admin_office"
  | "loading_area"
  | "parking"
  | "main_aisle";
export type WarehouseCarPurpose =
  | "transport_people"
  | "carry_equipment"
  | "collect_shipment"
  | "temporary_parking";

export interface WarehouseSharedStory {
  entryReason: WarehouseEntryReason;
  entryRoute: WarehouseEntryRoute;
  keyHolderInitial: string;
  location2346: Readonly<Record<string, WarehouseLocation>>;
  carPurpose: WarehouseCarPurpose;
  carDepartureExpected: boolean;
}

export interface WarehousePlayerInput {
  id: string;
  name: string;
  joinOrder: number;
  connected: boolean;
}
export interface WarehousePlayer extends WarehousePlayerInput {
  seat: WarehouseSeat;
}

export type WarehouseAnswerKind =
  | "PLAYER_PICK"
  | "LOCATION_PICK"
  | "YES_NO"
  | "TIME_WINDOW"
  | "ORDERING"
  | "ROUTE_PICK"
  | "EXPLANATION_PICK";

export interface WarehouseAnswerOption {
  id: string;
  value: WarehouseStructuredValue;
  label: LocalizedText;
}

export interface WarehouseQuestionDefinition {
  id: string;
  chapter: WarehouseChapter;
  seat: WarehouseSeat;
  answerKind: WarehouseAnswerKind;
  prompt: LocalizedText;
  options: readonly WarehouseAnswerOption[];
  outputFactKey: string;
  comparisonTargets: readonly string[];
  compatibilityRule: string;
  conflictRule: string;
  relevance: readonly ("evidence" | "patch" | "result")[];
  laterEffectSelector?: string;
}

export interface WarehouseQuestionAssignment extends WarehouseQuestionDefinition {
  playerId: string;
  instanceId: string;
}

export interface WarehouseEvidenceDefinition {
  id: string;
  chapter: WarehouseChapter;
  title: LocalizedText;
  detail: LocalizedText;
  timestamp: string;
  factKey: string;
  value: WarehouseStructuredValue;
  pressureKey: string;
}

export type WarehouseIssueType =
  | "DIRECT_CONTRADICTION"
  | "EVIDENCE_CONFLICT"
  | "STORY_GAP"
  | "UNEXPLAINED_EVIDENCE";

export interface WarehouseIssueDefinition {
  id: string;
  chapter: WarehouseChapter;
  type: WarehouseIssueType;
  severity: number;
  independentKey: string;
  factRefs: readonly string[];
  patchOptionIds: readonly string[];
  publicTitle: LocalizedText;
  publicExplanation: LocalizedText;
  statementA?: LocalizedText;
  statementB?: LocalizedText;
  rule?: LocalizedText;
}

export interface WarehouseDetectedIssue {
  id: string;
  chapter: WarehouseChapter;
  type: WarehouseIssueType;
  severity: number;
  independentKey: string;
  factRefs: readonly string[];
  attribution?: {
    sourcePlayerId: string;
    targetPlayerId?: string;
    sourceFactKey: string;
    targetFactKey: string;
    sourceValue: WarehouseStructuredValue;
    targetValue: WarehouseStructuredValue;
  };
}

export type WarehouseCommitmentStatus = "pending" | "satisfied" | "partial" | "broken" | "untested";
export interface WarehouseCommitment {
  id: string;
  fromPatchId?: string;
  factKey: string;
  expectedValue: WarehouseStructuredValue;
  testChapter: WarehouseChapter;
  status: WarehouseCommitmentStatus;
}

export interface WarehouseLaterEffect {
  chapter: WarehouseChapter;
  selectorKey: string;
}

export interface WarehousePatchOption {
  id: string;
  chapter: WarehouseChapter;
  resolvesIssueIds: readonly string[];
  factsAfter: readonly WarehouseStructuredFact[];
  commitments: readonly WarehouseCommitment[];
  laterEffects: readonly WarehouseLaterEffect[];
  newFactCount: number;
  changedFactCount: number;
  publicLabel: LocalizedText;
  description: LocalizedText;
  solves: LocalizedText;
  nextPressure: LocalizedText;
  availability?: {
    factKey: string;
    allowedValues: readonly WarehouseStructuredValue[];
  };
}

export interface WarehouseChapterDefinition {
  id: WarehouseChapter;
  evidence: WarehouseEvidenceDefinition;
  issueIds: readonly string[];
  patchOptionIds: readonly string[];
}

export interface WarehouseStoryOptionSets {
  entryReasons: readonly { id: WarehouseEntryReason; label: LocalizedText }[];
  entryRoutes: readonly { id: WarehouseEntryRoute; label: LocalizedText }[];
  locations: readonly { id: WarehouseLocation; label: LocalizedText }[];
  carPurposes: readonly { id: WarehouseCarPurpose; label: LocalizedText }[];
}

export interface WarehouseCaseDefinition {
  id: string;
  version: string;
  title: LocalizedText;
  pitch: LocalizedText;
  premise: LocalizedText;
  complexity: LocalizedText;
  durationMinutes: readonly [number, number];
  supportedPlayerCounts: readonly WarehousePlayerCount[];
  storyOptions: WarehouseStoryOptionSets;
  chapters: Readonly<Record<WarehouseChapter, WarehouseChapterDefinition>>;
  questionMatrix: Readonly<
    Record<WarehousePlayerCount, Readonly<Record<WarehouseChapter, readonly WarehouseQuestionDefinition[]>>>
  >;
  issues: readonly WarehouseIssueDefinition[];
  patchOptions: readonly WarehousePatchOption[];
  resultBands: readonly {
    id: string;
    min: number;
    max: number;
    label: LocalizedText;
    summary: LocalizedText;
  }[];
  copy: {
    silentPhaseIntro: LocalizedText;
    advisoryWaiting: LocalizedText;
    fairScoreUnavailable: LocalizedText;
    noDirectContradiction: LocalizedText;
  };
}

export interface WarehouseLockedAnswer {
  playerId: string;
  questionInstanceId: string;
  questionId: string;
  chapter: WarehouseChapter;
  fact: WarehouseStructuredFact;
  lockedAt: number;
}

export interface WarehouseRankedBallot {
  playerId: string;
  rankedOptionIds: readonly string[];
}

export interface WarehouseAdoptedPatch {
  patchId: string;
  chapter: WarehouseChapter;
  sourceIssueIds: readonly string[];
  rankedBallots: readonly WarehouseRankedBallot[];
  factsBefore: readonly WarehouseStructuredFact[];
  factsAfter: readonly WarehouseStructuredFact[];
  commitmentsCreated: readonly WarehouseCommitment[];
  laterEffects: readonly WarehouseLaterEffect[];
}

export type WarehouseEvidenceFit =
  | "DIRECTLY_EXPLAINED"
  | "COHERENT_PATCH"
  | "POSSIBLE_COMPLEX_PATCH"
  | "LEAVES_GAP"
  | "UNEXPLAINED_OR_CONFLICT";
export interface WarehouseEvidenceEvaluation {
  evidenceId: string;
  chapter: WarehouseChapter;
  fit: WarehouseEvidenceFit;
}

export type WarehouseComparisonCompatibility =
  | "MATCH"
  | "COMPATIBLE_VARIANCE"
  | "GAP"
  | "DIRECT_CONTRADICTION";
export interface WarehouseComparisonEvaluation {
  id: string;
  chapter: WarehouseChapter;
  compatibility: WarehouseComparisonCompatibility;
  weight: number;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  sourceFactKey?: string;
  targetFactKey?: string;
  sourceValue?: WarehouseStructuredValue;
  targetValue?: WarehouseStructuredValue;
}

export type WarehouseEventType =
  | "WORLD_FACT_REVEALED"
  | "STORY_FACT_SET"
  | "STORY_CONFIRMED"
  | "SILENT_PHASE_STARTED"
  | "QUESTION_STARTED"
  | "QUESTION_ASSIGNED"
  | "ANSWER_LOCKED"
  | "ALL_ANSWERS_LOCKED"
  | "EVIDENCE_REVEALED"
  | "ISSUE_DETECTED"
  | "ISSUE_REVEALED"
  | "DISCUSSION_READY"
  | "PATCH_OPTIONS_GENERATED"
  | "RANKED_BALLOT_SUBMITTED"
  | "PATCH_ADOPTED"
  | "STORY_FACT_UPDATED"
  | "COMMITMENT_CREATED"
  | "COMMITMENT_CHECKED"
  | "PLAYER_DISCONNECTED"
  | "PLAYER_RECONNECTED"
  | "PLAYER_SKIPPED"
  | "CHAPTER_RESOLVED"
  | "SCORE_CALCULATED"
  | "ADVISORY_DEADLINE_ELAPSED";
export type WarehouseEventVisibility = "public" | "private" | "server";
export interface WarehouseCaseEvent {
  id: string;
  type: WarehouseEventType;
  sessionId: string;
  chapter: WarehouseCaseChapter;
  timestamp: number;
  visibility: WarehouseEventVisibility;
  playerId?: string;
  refs: readonly string[];
  data: Readonly<Record<string, WarehouseStructuredValue>>;
}

export interface WarehouseState {
  sessionId: string;
  definitionId: string;
  definitionVersion: string;
  chapter: WarehouseCaseChapter;
  phase: WarehousePhase;
  phaseRevision: number;
  advisoryDeadlineAt: number | null;
  advisoryExpired: boolean;
  worldFacts: {
    powerOutageAt: "23:46";
    deviceConnectedAt: "23:48";
    carExitedAt: "00:01";
  };
  players: readonly WarehousePlayer[];
  disconnectedAtByPlayer: Readonly<Record<string, number>>;
  skippedPlayerIds: readonly string[];
  sharedStory: WarehouseSharedStory;
  storyConfirmedPlayerIds: readonly string[];
  questionStartedPlayerIds: readonly string[];
  questionAssignments: Readonly<Record<string, WarehouseQuestionAssignment>>;
  lockedAnswers: readonly WarehouseLockedAnswer[];
  readyForVotePlayerIds: readonly string[];
  rankedBallots: readonly WarehouseRankedBallot[];
  ballotRound: 0 | 1;
  ballotOptionIds: readonly string[];
  issueLedger: readonly WarehouseDetectedIssue[];
  evidenceLedger: readonly WarehouseEvidenceEvaluation[];
  comparisonLedger: readonly WarehouseComparisonEvaluation[];
  documentedComparisonSkips: readonly string[];
  adoptedPatches: readonly WarehouseAdoptedPatch[];
  commitments: readonly WarehouseCommitment[];
  derivedFacts: Readonly<Record<string, WarehouseStructuredValue>>;
  resolvedChapters: readonly WarehouseChapter[];
  scoreResult: WarehouseScoreResult | null;
  eventLedger: readonly WarehouseCaseEvent[];
}

export type WarehouseBallotResolution =
  | { status: "rerun"; tiedOptionIds: readonly string[] }
  | {
      status: "adopted";
      patchId: string;
      reason: "RANKED_POINTS" | "SECOND_TIE_CONSERVATIVE";
    };

export type WarehouseScoreResult =
  | {
      status: "complete";
      consistency: number;
      plausibility: number;
      stability: number;
      overall: number;
    }
  | {
      status: "incomplete";
      diagnosticCode: "FAIR_SCORE_UNAVAILABLE";
      message: "تعذر حساب نتيجة عادلة لهذه الجولة.";
    };
import type { LocalizedText } from "./i18n";
