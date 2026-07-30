/**
 * Redacted projections of authoritative match state. This is THE secrecy
 * boundary (DATA_MODEL.md, SECURITY_AND_PRIVACY.md):
 *  - PublicRoomView is safe to broadcast to every player. It NEVER contains
 *    private evidence, answers, unreleased contradiction candidates, the score
 *    ledger, recovery tokens, or another player's question.
 *  - PrivatePlayerView contains exactly one player's private fields.
 *
 * The authoritative MatchState is never serialized directly.
 */
import type { PhaseId } from "./phases";
import type { DetectedContradiction, GameCase, PatchDefinition, ScoreAxis } from "./case-types";
import type { MatchState, VerdictResult } from "./match-types";
import type { LocalizedText } from "./i18n";
import { fillLocalized } from "./i18n";
import { currentReleasedContradiction } from "./match";
import { applicablePatches } from "./patches";
import { contradictionKey } from "./contradictions";

export interface PublicPlayer {
  id: string;
  name: string;
  joinOrder: number;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface PublicEvidence {
  id: string;
  title: LocalizedText;
  detail: LocalizedText;
  timestamp?: string;
}

export interface ReleasedContradictionView {
  category: string;
  statementA: LocalizedText;
  statementB: LocalizedText;
  rule: LocalizedText;
  involvedPlayerNames: string[];
}

export interface PublicPatchOption {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  archetype: string;
}

export interface PublicCommitment {
  id: string;
  label: LocalizedText;
}

export interface PublicResult {
  band: VerdictResult["band"];
  label: LocalizedText;
  summary: LocalizedText;
  composite: number;
  scores: Record<ScoreAxis, number>;
  decisiveFactors: LocalizedText[];
  firstFracture: LocalizedText | null;
  strongestPatch: LocalizedText | null;
  costliestPatch: LocalizedText | null;
  mostConsistentPlayerName: string | null;
  primarySuspectPlayerName: string | null;
  evaluationStatus: VerdictResult["evaluationStatus"];
}

export interface PublicRoomView {
  protocolVersion: 1;
  roomCode: string;
  phase: PhaseId;
  phaseRevision: number;
  deadlineAt: number | null;
  serverTime: number;
  caseId: string;
  caseVersion: string;
  players: PublicPlayer[];
  releasedStory: Record<string, string>;
  evidence: PublicEvidence[];
  releasedContradiction: ReleasedContradictionView | null;
  patchOptions: PublicPatchOption[] | null;
  commitments: PublicCommitment[];
  result: PublicResult | null;
}

export interface PrivateEvidenceCard {
  id: string;
  title: LocalizedText;
  detail: LocalizedText;
}

export interface PrivateQuestion {
  instanceId: string;
  prompt: LocalizedText;
  options: { id: string; label: LocalizedText }[];
}

export type AllowedActionType =
  "ACKNOWLEDGE" | "STORY_PROPOSE" | "STORY_CONFIRM" | "ANSWER" | "PATCH_VOTE" | "WAIT";

export interface PrivatePlayerView {
  protocolVersion: 1;
  playerId: string;
  isHost: boolean;
  connected: boolean;
  phase: PhaseId;
  phaseRevision: number;
  privateEvidence: PrivateEvidenceCard | null;
  currentQuestion: PrivateQuestion | null;
  answerLocked: boolean;
  submittedOptionId: string | null;
  allowedActions: AllowedActionType[];
  ownResultNote: LocalizedText | null;
}

function playerNames(state: MatchState, ids: string[]): string[] {
  return ids.map((id) => state.players.find((p) => p.id === id)?.name ?? id);
}

function contradictionTemplateParams(
  state: MatchState,
  contradiction: DetectedContradiction,
): Record<string, string> {
  const names = contradiction.playerParams.reduce<Record<string, string>>((acc, key) => {
    const playerId = contradiction.params[key];
    if (playerId) {
      acc[key] = state.players.find((player) => player.id === playerId)?.name ?? playerId;
    }
    return acc;
  }, {});
  return { ...contradiction.params, ...names };
}

function safeUniqueLocalized(items: LocalizedText[]): LocalizedText[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.ar.includes("{{") || item.en?.includes("{{")) return false;
    const key = `${item.ar}\u0000${item.en ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Build the public, broadcast-safe room view. */
export function toPublicView(
  state: MatchState,
  gameCase: GameCase,
  roomCode: string,
  serverTime: number,
): PublicRoomView {
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    joinOrder: p.joinOrder,
    ready: p.ready,
    connected: p.connected,
    isHost: p.isHost,
  }));

  const revealedSet = new Set(state.revealedEvidenceIds);
  const evidence: PublicEvidence[] = gameCase.immutableEvidence
    .concat(gameCase.surpriseEvidence)
    .filter((e) => revealedSet.has(e.id))
    .map((e) => ({
      id: e.id,
      title: e.title,
      detail: e.detail,
      ...(e.timestamp ? { timestamp: e.timestamp } : {}),
    }));

  // Only released facts are public. sharedStory holds only locked facts, which
  // are public by design once locked.
  const releasedStory = { ...state.sharedStory };

  let releasedContradiction: ReleasedContradictionView | null = null;
  if (
    (state.phase === "CONTRADICTION_REVEAL_1" ||
      state.phase === "CONTRADICTION_REVEAL_2" ||
      state.phase === "PATCH_1" ||
      state.phase === "PATCH_2") &&
    state.releasedContradictionIds.length > 0
  ) {
    const c = currentReleasedContradiction(state);
    if (c) {
      const filledParams = contradictionTemplateParams(state, c);
      releasedContradiction = {
        category: c.category,
        statementA: fillLocalized(c.statementA ?? c.explanation, filledParams),
        statementB: fillLocalized(
          c.statementB ?? { ar: "الشهادة المقابلة أو الدليل ما يطابق هذا القول." },
          filledParams,
        ),
        rule: fillLocalized(c.rule ?? c.explanation, filledParams),
        involvedPlayerNames: playerNames(state, c.involvedPlayers),
      };
    }
  }

  let patchOptions: PublicPatchOption[] | null = null;
  if (state.phase === "PATCH_1" || state.phase === "PATCH_2") {
    const c = currentReleasedContradiction(state);
    if (c) {
      patchOptions = applicablePatches(gameCase, c).map((p) => ({
        id: p.id,
        label: p.publicLabel,
        description: p.description,
        archetype: p.archetype,
      }));
    }
  }

  const commitments: PublicCommitment[] = state.commitments.map((c) => ({
    id: c.id,
    label: c.label,
  }));

  let result: PublicResult | null = null;
  if ((state.phase === "VERDICT" || state.phase === "RESULTS") && state.verdict) {
    const v = state.verdict;
    const releasedFirst = state.releasedContradictionIds[0];
    const firstFracture = releasedFirst
      ? state.detectedContradictions.find((item) => contradictionKey(item) === releasedFirst)
      : undefined;
    const selectedPatchDefinitions = state.selectedPatches
      .map((selected) => gameCase.patches.find((patch) => patch.id === selected.patchId))
      .filter((patch): patch is PatchDefinition => patch !== undefined);
    const patchCost = (patch: PatchDefinition) =>
      Object.values(patch.scoreEffects).reduce((total, delta) => total + Math.abs(delta ?? 0), 0);
    const rankedPatches = selectedPatchDefinitions
      .slice()
      .sort((a, b) => patchCost(a) - patchCost(b));
    result = {
      band: v.band,
      label: v.label,
      summary: v.summary,
      composite: v.composite,
      scores: v.scores,
      // Never project unresolved authored placeholders. The explicit
      // firstFracture row above carries the filled contradiction narrative.
      decisiveFactors: safeUniqueLocalized(v.decisiveFactors),
      firstFracture: firstFracture
        ? fillLocalized(
            firstFracture.explanation,
            contradictionTemplateParams(state, firstFracture),
          )
        : null,
      strongestPatch: rankedPatches[0]?.publicLabel ?? null,
      costliestPatch: rankedPatches.at(-1)?.publicLabel ?? null,
      mostConsistentPlayerName: v.mostConsistentPlayerId
        ? (state.players.find((p) => p.id === v.mostConsistentPlayerId)?.name ?? null)
        : null,
      primarySuspectPlayerName: v.primarySuspectPlayerId
        ? (state.players.find((p) => p.id === v.primarySuspectPlayerId)?.name ?? null)
        : null,
      evaluationStatus: v.evaluationStatus,
    };
  }

  return {
    protocolVersion: 1,
    roomCode,
    phase: state.phase,
    phaseRevision: state.phaseRevision,
    deadlineAt: state.deadlineAt,
    serverTime,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    players,
    releasedStory,
    evidence,
    releasedContradiction,
    patchOptions,
    commitments,
    result,
  };
}

function allowedActionsFor(state: MatchState, playerId: string): AllowedActionType[] {
  switch (state.phase) {
    case "CASE_BRIEF":
    case "PRIVATE_EVIDENCE":
    case "PLAN_REVIEW":
    case "SURPRISE_EVIDENCE":
      return state.acknowledgedThisPhase.includes(playerId) ? ["WAIT"] : ["ACKNOWLEDGE"];
    case "PLAN_REASON":
    case "PLAN_LOCATIONS":
    case "PLAN_ROLES":
      return ["STORY_PROPOSE", "STORY_CONFIRM"];
    case "INTERROGATION_FOUNDATION":
    case "INTERROGATION_GAPS":
    case "INTERROGATION_NO_GOOD_ANSWER":
    case "INTERROGATION_FOLLOWUP":
    case "FINAL_QUESTION":
      return state.answeredThisPhase.includes(playerId) ? ["WAIT"] : ["ANSWER"];
    case "PATCH_1":
    case "PATCH_2":
      return state.patchVotes[state.phase]?.[playerId] ? ["WAIT"] : ["PATCH_VOTE"];
    default:
      return ["WAIT"];
  }
}

/** Build the private view for a single player. Contains only their own data. */
export function toPrivateView(
  state: MatchState,
  gameCase: GameCase,
  playerId: string,
): PrivatePlayerView {
  const self = state.players.find((p) => p.id === playerId);
  if (!self) {
    throw new Error(`toPrivateView: unknown player ${playerId}`);
  }

  const evidenceIds = state.privateEvidenceByPlayer[playerId] ?? [];
  const firstEvidenceId = evidenceIds[0];
  const evidenceItem = firstEvidenceId
    ? gameCase.privateEvidencePool.find((e) => e.id === firstEvidenceId)
    : undefined;
  const privateEvidence: PrivateEvidenceCard | null = evidenceItem
    ? { id: evidenceItem.id, title: evidenceItem.title, detail: evidenceItem.detail }
    : null;

  const q = state.questionsByPlayer[playerId];
  const showQuestion =
    q &&
    (state.phase === "INTERROGATION_FOUNDATION" ||
      state.phase === "INTERROGATION_GAPS" ||
      state.phase === "INTERROGATION_NO_GOOD_ANSWER" ||
      state.phase === "INTERROGATION_FOLLOWUP" ||
      state.phase === "FINAL_QUESTION");

  const currentQuestion: PrivateQuestion | null = showQuestion
    ? {
        instanceId: q.instanceId,
        prompt: q.prompt,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      }
    : null;

  const submitted =
    showQuestion && state.answeredThisPhase.includes(playerId)
      ? (state.answers.filter((a) => a.playerId === playerId).at(-1) ?? null)
      : null;

  let ownResultNote: LocalizedText | null = null;
  if ((state.phase === "VERDICT" || state.phase === "RESULTS") && state.verdict) {
    if (state.verdict.mostConsistentPlayerId === playerId) {
      ownResultNote = { ar: "حافظت على الرواية أكثر من الجميع." };
    } else if (state.verdict.primarySuspectPlayerId === playerId) {
      ownResultNote = { ar: "التحقيق يركّز عليك." };
    }
  }

  return {
    protocolVersion: 1,
    playerId,
    isHost: self.isHost,
    connected: self.connected,
    phase: state.phase,
    phaseRevision: state.phaseRevision,
    privateEvidence,
    currentQuestion,
    answerLocked: submitted !== null,
    submittedOptionId: submitted?.optionId ?? null,
    allowedActions: allowedActionsFor(state, playerId),
    ownResultNote,
  };
}
