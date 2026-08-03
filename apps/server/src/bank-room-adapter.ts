import {
  advanceBankMatch,
  confirmBankStory,
  createBankMatch,
  finalizeBankMatch,
  lockBankAnswer,
  lockBankStoryChoice,
  submitBankRepairVote,
  type BankMatchState,
  type BankPlayerInput,
  type BankRepairId,
  toBankPrivateView,
} from "@al-riwayah/game-engine";
import { bankAlSahaV1, validateBankAlSahaCaseOrThrow } from "@al-riwayah/content";

validateBankAlSahaCaseOrThrow(bankAlSahaV1);

export type BankManagerIntent =
  | {
      type: "BANK_STORY_LOCK";
      playerId: string;
      factId:
        | "near_bank_reason"
        | "alarm_location"
        | "vehicle_key_holder"
        | "suspicious_object_holder"
        | "departure_plan"
        | "cafe_door_witness"
        | "parking_camera_sightline";
      optionId: string;
      targetPlayerId?: string;
    }
  | { type: "BANK_ANSWER"; playerId: string; questionId: string; optionId: string }
  | { type: "BANK_REPAIR_VOTE"; playerId: string; repairId: BankRepairId };

export function initializeBankMatch(input: {
  matchId: string;
  seed: string;
  players: readonly BankPlayerInput[];
}): BankMatchState {
  const packets = ["movement_true", "identity_true", "ambiguous"] as const;
  const checksum = Array.from(input.seed).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  return createBankMatch({
    ...input,
    truthPacketId: packets[checksum % packets.length]!,
    caseDefinition: bankAlSahaV1,
  });
}

function currentQuestion(state: BankMatchState, playerId: string) {
  const assignment = state.assignments[playerId];
  if (!assignment) return null;
  if (state.phase === "FIRST_QUESTION") return assignment.firstQuestion;
  if (state.phase === "FORENSIC_QUESTION" && state.selectedRepairId) {
    return assignment.forensicQuestions[state.selectedRepairId];
  }
  return null;
}

export function toSafeBankPrivateView(state: BankMatchState, playerId: string) {
  const view = toBankPrivateView(state, playerId);
  if (!view) return null;
  return {
    playerId: view.playerId,
    phase: view.phase,
    storyAssignments: view.storyAssignments.map((assignment) => ({
      ownerPlayerId: assignment.ownerPlayerId,
      factKey: assignment.factKey,
      prompt: assignment.prompt,
      options: assignment.options.map(({ id, label }) => ({ id, label })),
    })),
    question: view.question
      ? {
          id: view.question.id,
          prompt: view.question.prompt,
          options: view.question.options.map(({ id, label }) => ({ id, label })),
        }
      : null,
    lockedAnswer: view.lockedAnswer
      ? {
          playerId: view.lockedAnswer.playerId,
          phase: view.lockedAnswer.phase,
          questionId: view.lockedAnswer.questionId,
          optionId: view.lockedAnswer.optionId,
        }
      : null,
    lockedVote: view.lockedVote,
    allowedActions: [...view.allowedActions],
  };
}

export function applyBankIntent(
  state: BankMatchState,
  player: { id: string; isHost: boolean },
  intent: BankManagerIntent,
): BankMatchState {
  switch (intent.type) {
    case "BANK_STORY_LOCK": {
      const factKey =
        intent.factId === "alarm_location"
          ? `alarm_location:${intent.targetPlayerId ?? ""}`
          : intent.factId;
      const locked = lockBankStoryChoice(state, {
        playerId: player.id,
        factKey,
        optionId: intent.optionId,
      });
      return locked.storyLocked ? confirmBankStory(locked, player.id) : locked;
    }
    case "BANK_ANSWER": {
      const question = currentQuestion(state, player.id);
      const option = question?.options.find(({ id }) => id === intent.optionId);
      if (!question || question.id !== intent.questionId || !option) return state;
      const phase =
        state.phase === "FIRST_QUESTION"
          ? "first_investigation"
          : state.phase === "FORENSIC_QUESTION"
            ? "forensic_investigation"
            : null;
      if (!phase) return state;
      let updated = lockBankAnswer(state, {
        playerId: player.id,
        phase,
        questionId: question.id,
        optionId: option.id,
        normalizedFacts: option.normalizedFacts,
      });
      updated = advanceBankMatch(updated);
      return updated.phase === "GROUP_VERDICT"
        ? finalizeBankMatch(updated)
        : updated;
    }
    case "BANK_REPAIR_VOTE":
      return submitBankRepairVote(state, {
        playerId: player.id,
        repairId: intent.repairId,
      });
    default:
      return state;
  }
}

export function advancePassiveBankPhase(
  state: BankMatchState,
  elapsedMs: number,
  phaseDurationScale: number,
): BankMatchState {
  const durations: Partial<Record<BankMatchState["phase"], number>> = {
    OPENING: 12_000,
    ISSUE_REVEAL: 7_000,
    STORY_UPDATE: 6_000,
    GROUP_VERDICT: 8_000,
  };
  const duration = durations[state.phase];
  const canAdvance =
    duration !== undefined &&
    elapsedMs >= duration * phaseDurationScale &&
    (state.phase !== "GROUP_VERDICT" || state.verdict !== null);
  return canAdvance ? advanceBankMatch(state) : state;
}
