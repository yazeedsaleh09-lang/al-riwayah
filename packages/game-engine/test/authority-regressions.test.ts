import { describe, expect, it } from "vitest";
import { missingPayrollEnvelopeV1 as CASE } from "../../content/src";
import {
  PHASE_SEQUENCE,
  advancePhase,
  applyIntent,
  contradictionKey,
  finalizeVerdict,
  initializeMatch,
  isPhaseComplete,
  type DetectedContradiction,
  type PlayerState,
} from "../src";

const players: PlayerState[] = Array.from({ length: 4 }, (_, index) => ({
  id: `p${index + 1}`,
  name: `Player ${index + 1}`,
  joinOrder: index,
  connected: true,
  ready: true,
  isHost: index === 0,
}));

function makeState() {
  return initializeMatch({
    matchId: "authority-regression",
    seed: "authority-regression-seed",
    gameCase: CASE,
    players,
    now: 1_000,
  });
}

function contradiction(ruleId: string, involvedPlayers: string[]): DetectedContradiction {
  return {
    ruleId,
    category: "DIRECT_IMPOSSIBILITY",
    severity: 8,
    narrativeImportance: 8,
    involvedPlayers,
    params: {},
    playerParams: [],
    explanation: { ar: ruleId },
  };
}

describe("authoritative engine regressions", () => {
  it("advances through every reachable canonical phase and records intentional skips", () => {
    const state = makeState();
    const observed = [state.phase];
    const revisions = [state.phaseRevision];
    let now = 2_000;

    while (state.phase !== "RESULTS") {
      advancePhase(state, CASE, now++, { forced: true });
      observed.push(state.phase);
      revisions.push(state.phaseRevision);
    }

    const skipped = new Set(state.skippedPhases.map(({ phase }) => phase));
    expect(observed).toEqual(
      PHASE_SEQUENCE.slice(1).filter((phase) => !skipped.has(phase)),
    );
    expect(revisions).toEqual([...revisions].sort((a, b) => a - b));
    expect(new Set(state.skippedPhases.map(({ reason }) => reason))).toContain(
      "NO_CONTRADICTION",
    );
    expect(state.phaseRevision).toBe(PHASE_SEQUENCE.length - 1);
  });

  it("waits for a disconnected active player until the deadline, then applies one deterministic fallback penalty", () => {
    const state = makeState();
    let now = 2_000;
    while (state.phase !== "INTERROGATION_FOUNDATION") {
      advancePhase(state, CASE, now++, { forced: true });
    }

    const disconnected = state.players.at(-1)!;
    const disconnectedQuestion = state.questionsByPlayer[disconnected.id]!;
    disconnected.connected = false;
    for (const player of state.players.filter(({ connected }) => connected)) {
      const question = state.questionsByPlayer[player.id]!;
      const result = applyIntent(
        state,
        CASE,
        {
          type: "ANSWER",
          playerId: player.id,
          questionInstanceId: question.instanceId,
          optionId: question.options[0]!.id,
        },
        now,
      );
      expect(result.ok).toBe(true);
    }

    expect.soft(isPhaseComplete(state, CASE)).toBe(false);
    expect
      .soft(
        state.answers.some(({ playerId, fallback }) => playerId === disconnected.id && fallback),
      )
      .toBe(false);

    const penaltyCountBefore = state.scoreLedger.filter(
      ({ reasonCode, refs }) =>
        reasonCode === "answer.no_response" && refs.includes(disconnected.id),
    ).length;
    advancePhase(state, CASE, state.deadlineAt! + 1, { forced: true });
    const fallbackAnswers = state.answers.filter(
      ({ playerId, fallback }) => playerId === disconnected.id && fallback,
    );
    const penaltyCountAfter = state.scoreLedger.filter(
      ({ reasonCode, refs }) =>
        reasonCode === "answer.no_response" && refs.includes(disconnected.id),
    ).length;

    expect(fallbackAnswers).toHaveLength(1);
    expect(fallbackAnswers[0]!.optionId).toBe(
      disconnectedQuestion.options[0]!.id,
    );
    expect(penaltyCountAfter - penaltyCountBefore).toBe(CASE.scoring.noResponsePenalty.length);
  });

  it("uses only released contradiction instances for named player attribution", () => {
    const state = makeState();
    const released = contradiction("released", [players[0]!.id]);
    const unreleased = contradiction("unreleased", [players[1]!.id]);
    state.detectedContradictions = [released, unreleased];
    state.releasedContradictionIds = [contradictionKey(released)];
    state.answers = state.players.flatMap((player) =>
      Array.from({ length: 5 }, (_, index) => ({
        playerId: player.id,
        questionId: `question-${index}`,
        tag: `tag-${index}`,
        optionId: `option-${index}`,
        normalized: "complete",
        phase: "INTERROGATION_FOUNDATION" as const,
        submittedAt: 2_000 + index,
        fallback: false,
      })),
    );

    const { verdict } = finalizeVerdict(state, CASE);

    expect.soft(verdict.mostConsistentPlayerId).toBe(players[1]!.id);
    expect.soft(verdict.primarySuspectPlayerId).toBe(players[0]!.id);
  });
});
