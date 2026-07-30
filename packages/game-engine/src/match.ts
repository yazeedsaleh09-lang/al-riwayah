/**
 * Match lifecycle orchestration: initialize, lock planning facts, run
 * interrogation, reveal contradictions, apply patches, and reach a verdict.
 * Every transition is deterministic given (seed, case, ordered answers).
 *
 * RNG for each concern is derived from `seed:<concern>` so determinism does not
 * depend on prior call history — replaying the same inputs reproduces results.
 */
import {
  DEFAULT_PHASE_DURATIONS_S,
  EXTENDED_PLANNING_MULTIPLIER,
  PLANNING_PHASES,
  nextPhase,
} from "./phases";
import type { PhaseId } from "./phases";
import type { GameCase } from "./case-types";
import type { MatchState, PlayerState, ScoreLedgerEntry } from "./match-types";
import { createRng } from "./rng";
import { assignPrivateEvidence, assignQuestionsForPhase } from "./assign";
import { buildDetectionContext } from "./context";
import { selectNextContradiction, contradictionKey } from "./contradictions";
import { applyPatch, applicablePatches, resolvePatchVote } from "./patches";
import { finalizeVerdict } from "./scoring";

export interface InitMatchInput {
  matchId: string;
  seed: string;
  gameCase: GameCase;
  players: PlayerState[];
  now: number;
  extendedPlanning?: boolean;
  phaseDurationScale?: number;
}

function phaseDurationMs(
  phase: PhaseId,
  extendedPlanning: boolean,
  durationScale: number,
): number | null {
  const base = DEFAULT_PHASE_DURATIONS_S[phase];
  if (base === null) return null;
  const mult = extendedPlanning && PLANNING_PHASES.includes(phase) ? EXTENDED_PLANNING_MULTIPLIER : 1;
  return Math.max(50, Math.round(base * mult * durationScale * 1000));
}

function deadlineFor(
  phase: PhaseId,
  now: number,
  extendedPlanning: boolean,
  durationScale: number,
): number | null {
  const ms = phaseDurationMs(phase, extendedPlanning, durationScale);
  return ms === null ? null : now + ms;
}

function connectedPlayers(state: MatchState): PlayerState[] {
  return state.players.filter((p) => p.connected);
}

/** Create the initial authoritative match state at CASE_BRIEF. */
export function initializeMatch(input: InitMatchInput): MatchState {
  const { matchId, seed, gameCase, players, now } = input;
  const extendedPlanning = input.extendedPlanning ?? false;
  const phaseDurationScale = input.phaseDurationScale ?? 1;
  const evidenceRng = createRng(`${seed}:evidence`);
  const ordered = players
    .slice()
    .sort((a, b) => a.joinOrder - b.joinOrder)
    .map((p) => ({ ...p }));

  const privateEvidenceByPlayer = assignPrivateEvidence(evidenceRng, gameCase, ordered);

  const state: MatchState = {
    matchId,
    seed,
    caseId: gameCase.id,
    caseVersion: gameCase.version,
    phase: "CASE_BRIEF",
    phaseRevision: 1,
    deadlineAt: deadlineFor("CASE_BRIEF", now, extendedPlanning, phaseDurationScale),
    phaseDurationScale,
    players: ordered,
    sharedStory: {},
    proposals: {},
    confirmations: {},
    privateEvidenceByPlayer,
    questionsByPlayer: {},
    answers: [],
    answeredThisPhase: [],
    acknowledgedThisPhase: [],
    detectedContradictions: [],
    releasedContradictionIds: [],
    releasedContradictionByPhase: {},
    selectedPatches: [],
    patchVotes: {},
    commitments: [],
    scoreLedger: [],
    verdict: null,
    revealedEvidenceIds: gameCase.immutableEvidence.map((e) => e.id),
    skippedPhases: [],
  };
  // Store extendedPlanning on a symbol-free field via seed convention: recompute
  // deadlines using the same flag each transition. We persist it in-band:
  (state as MatchState & { extendedPlanning: boolean }).extendedPlanning = extendedPlanning;
  return state;
}

function isExtended(state: MatchState): boolean {
  return (state as MatchState & { extendedPlanning?: boolean }).extendedPlanning ?? false;
}

// ---------------------------------------------------------------------------
// Planning locks
// ---------------------------------------------------------------------------

/** The most-proposed value for a field (plurality), earliest proposal breaks ties. */
function leadingProposal(state: MatchState, field: string): string | undefined {
  const proposals = state.proposals[field] ?? [];
  if (proposals.length === 0) return undefined;
  const tally = new Map<string, { count: number; firstIndex: number }>();
  proposals.forEach((p, i) => {
    const entry = tally.get(p.value);
    if (entry) entry.count += 1;
    else tally.set(p.value, { count: 1, firstIndex: i });
  });
  return [...tally.entries()].sort((a, b) => {
    if (a[1].count !== b[1].count) return b[1].count - a[1].count;
    return a[1].firstIndex - b[1].firstIndex;
  })[0]![0];
}

function lockReason(state: MatchState, gameCase: GameCase): void {
  if (state.sharedStory["reason"]) return;
  const value = leadingProposal(state, "reason") ?? gameCase.planning.reasons[0]!.id;
  state.sharedStory["reason"] = value;
}

function lockLocations(state: MatchState, gameCase: GameCase): void {
  const fallback = gameCase.planning.locations[0]!.id;
  for (const player of state.players) {
    const field = `location.${player.id}`;
    if (state.sharedStory[field]) continue;
    state.sharedStory[field] = leadingProposal(state, field) ?? fallback;
  }
}

function lockRoles(state: MatchState, gameCase: GameCase): void {
  const connected = connectedPlayers(state);
  for (const role of gameCase.planning.roles) {
    const field = `role.${role.id}`;
    if (state.sharedStory[field]) continue;
    const fallbackPlayer = connected[0]?.id ?? state.players[0]!.id;
    state.sharedStory[field] = leadingProposal(state, field) ?? fallbackPlayer;
  }
}

// ---------------------------------------------------------------------------
// Interrogation fallbacks
// ---------------------------------------------------------------------------

/** Apply NO_RESPONSE fallback answers for players who did not answer in time. */
function applyInterrogationFallbacks(state: MatchState, gameCase: GameCase): void {
  for (const player of connectedPlayers(state).concat(
    state.players.filter((p) => !p.connected),
  )) {
    const q = state.questionsByPlayer[player.id];
    if (!q) continue;
    if (state.answeredThisPhase.includes(player.id)) continue;
    // Choose the "worst-safe" option: prefer a non-evasive first option; for
    // no-good-answer phases any option costs, so take the first deterministically.
    const option = q.options[0];
    state.answers.push({
      playerId: player.id,
      questionId: q.questionId,
      tag: q.tag,
      optionId: option?.id ?? "NO_RESPONSE",
      normalized: option?.normalized ?? "NO_RESPONSE",
      evasive: true,
      fallback: true,
    });
    state.answeredThisPhase.push(player.id);
    for (const pen of gameCase.scoring.noResponsePenalty) {
      state.scoreLedger.push({
        axis: pen.axis,
        delta: pen.delta,
        reasonCode: "answer.no_response",
        refs: [player.id, q.questionId],
        release: "summary",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Reveal / patch entry effects
// ---------------------------------------------------------------------------

function enterContradictionReveal(state: MatchState, gameCase: GameCase): void {
  const ctx = buildDetectionContext(state, gameCase);
  // Refresh the full candidate list (server-only).
  state.detectedContradictions = candidatesOf(state, gameCase);
  const selected = selectNextContradiction(ctx, gameCase, state.releasedContradictionIds);
  if (!selected) return;
  const key = contradictionKey(selected);
  state.releasedContradictionIds.push(key);
  state.releasedContradictionByPhase[state.phase] = key;
  // Consistency penalty for a revealed contradiction.
  state.scoreLedger.push({
    axis: "consistency",
    delta: -selected.severity,
    reasonCode: `contradiction.${selected.category}`,
    refs: selected.involvedPlayers,
    release: "summary",
    explanation: selected.explanation,
  });
}

function candidatesOf(state: MatchState, gameCase: GameCase) {
  const ctx = buildDetectionContext(state, gameCase);
  const seen = new Map<string, ReturnType<typeof selectNextContradiction>>();
  for (const rule of gameCase.contradictionRules) {
    for (const d of rule.detect(ctx)) {
      const key = contradictionKey(d);
      const existing = seen.get(key);
      if (!existing || d.severity > existing.severity) seen.set(key, d);
    }
  }
  return [...seen.values()].filter((c): c is NonNullable<typeof c> => c !== null);
}

/** The contradiction currently being revealed (last released). */
export function currentReleasedContradiction(state: MatchState) {
  const revealPhase =
    state.phase === "PATCH_1"
      ? "CONTRADICTION_REVEAL_1"
      : state.phase === "PATCH_2"
        ? "CONTRADICTION_REVEAL_2"
        : state.phase;
  const key = state.releasedContradictionByPhase[revealPhase];
  if (!key) return null;
  return state.detectedContradictions.find((c) => contradictionKey(c) === key) ?? null;
}

function resolvePatchPhase(state: MatchState, gameCase: GameCase): void {
  const contradiction = currentReleasedContradiction(state);
  if (!contradiction) return;
  const options = applicablePatches(gameCase, contradiction);
  if (options.length === 0) return;
  const votes = state.patchVotes[state.phase] ?? {};
  const winningId = resolvePatchVote(votes, options);
  const patch = options.find((p) => p.id === winningId) ?? options[0]!;
  const applied = applyPatch(patch, contradiction, gameCase, (id) =>
    state.players.find((p) => p.id === id)?.name ?? id,
  );
  state.commitments.push(...applied.commitments);
  state.scoreLedger.push(...applied.ledgerAdditions);
  state.selectedPatches.push({
    patchId: patch.id,
    phase: state.phase,
    contradictionKey: contradictionKey(contradiction),
  });
}

// ---------------------------------------------------------------------------
// Phase progression
// ---------------------------------------------------------------------------

/**
 * Complete the current phase and enter the next one, running exit locks and
 * entry effects. `forced` indicates a deadline expiry (apply fallbacks).
 * Returns a new phase; at RESULTS it is a no-op.
 */
export function advancePhase(
  state: MatchState,
  gameCase: GameCase,
  now: number,
  opts: { forced?: boolean } = {},
): MatchState {
  const forced = opts.forced ?? false;
  const current = state.phase;

  // --- exit effects for the current phase ---
  switch (current) {
    case "PLAN_REASON":
      lockReason(state, gameCase);
      break;
    case "PLAN_LOCATIONS":
      lockLocations(state, gameCase);
      break;
    case "PLAN_ROLES":
      lockRoles(state, gameCase);
      break;
    case "INTERROGATION_FOUNDATION":
    case "INTERROGATION_GAPS":
    case "INTERROGATION_NO_GOOD_ANSWER":
    case "INTERROGATION_FOLLOWUP":
    case "FINAL_QUESTION":
      if (forced) applyInterrogationFallbacks(state, gameCase);
      break;
    case "PATCH_1":
    case "PATCH_2":
      resolvePatchPhase(state, gameCase);
      break;
    default:
      break;
  }

  let next = nextPhase(current);
  while (next !== null) {
    state.phase = next;
    state.phaseRevision += 1;
    state.deadlineAt = deadlineFor(next, now, isExtended(state), state.phaseDurationScale);
    state.answeredThisPhase = [];
    state.acknowledgedThisPhase = [];

    if (
      next === "INTERROGATION_FOLLOWUP" &&
      !state.selectedPatches.some((selected) => selected.phase === "PATCH_1")
    ) {
      state.skippedPhases.push({
        phase: next,
        reason: "NO_FOLLOWUP_SOURCE",
        phaseRevision: state.phaseRevision,
      });
      next = nextPhase(next);
      continue;
    }

    if (next === "PATCH_1" || next === "PATCH_2") {
      const contradiction = currentReleasedContradiction(state);
      if (!contradiction) {
        state.skippedPhases.push({
          phase: next,
          reason: "NO_CONTRADICTION",
          phaseRevision: state.phaseRevision,
        });
        next = nextPhase(next);
        continue;
      }
      if (applicablePatches(gameCase, contradiction).length === 0) {
        state.skippedPhases.push({
          phase: next,
          reason: "NO_PATCH_ACTIONS",
          phaseRevision: state.phaseRevision,
        });
        next = nextPhase(next);
        continue;
      }
    }

    // --- entry effects for the next reachable phase ---
    const questionRng = createRng(`${state.seed}:questions:${next}`);
    const usedIds = new Set(state.answers.map((answer) => answer.questionId));
    switch (next) {
      case "INTERROGATION_FOUNDATION":
      case "INTERROGATION_GAPS":
      case "INTERROGATION_NO_GOOD_ANSWER":
      case "FINAL_QUESTION":
        state.questionsByPlayer = assignQuestionsForPhase(
          questionRng,
          gameCase,
          state.players,
          next,
          usedIds,
          [],
          state.privateEvidenceByPlayer,
        );
        break;
      case "INTERROGATION_FOLLOWUP": {
        const followUpIds = state.selectedPatches.flatMap(
          (selected) =>
            gameCase.patches.find((patch) => patch.id === selected.patchId)
              ?.followUpQuestionIds ?? [],
        );
        state.questionsByPlayer = assignQuestionsForPhase(
          questionRng,
          gameCase,
          state.players,
          next,
          usedIds,
          followUpIds,
          state.privateEvidenceByPlayer,
        );
        break;
      }
      case "CONTRADICTION_REVEAL_1":
      case "CONTRADICTION_REVEAL_2":
        enterContradictionReveal(state, gameCase);
        if (!state.releasedContradictionByPhase[next]) {
          state.skippedPhases.push({
            phase: next,
            reason: "NO_CONTRADICTION",
            phaseRevision: state.phaseRevision,
          });
          next = nextPhase(next);
          continue;
        }
        break;
      case "SURPRISE_EVIDENCE":
        if (!state.revealedEvidenceIds.includes(gameCase.surpriseEvidence.id)) {
          state.revealedEvidenceIds.push(gameCase.surpriseEvidence.id);
        }
        break;
      case "VERDICT": {
        const { verdict, ledgerAdditions } = finalizeVerdict(state, gameCase);
        state.scoreLedger.push(...(ledgerAdditions as ScoreLedgerEntry[]));
        state.verdict = verdict;
        break;
      }
      default:
        break;
    }
    break;
  }
  return state;
}
