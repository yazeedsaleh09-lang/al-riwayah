import {
  advanceWarehousePhase,
  confirmWarehouseStory,
  createWarehouseCase,
  lockWarehouseAnswer,
  setWarehouseDiscussionReady,
  setWarehouseStoryField,
  startWarehouseQuestion,
  submitWarehouseRankedBallot,
  submitWarehouseStory,
  toWarehousePrivateView,
  type EngineIntent,
  type WarehouseCaseDefinition,
  type WarehouseState,
  type WarehouseStoryField,
  type WarehouseStructuredValue,
} from "@al-riwayah/game-engine";

export type WarehouseManagerIntent =
  | {
      type: "WAREHOUSE_STORY_SET";
      playerId: string;
      field: WarehouseStoryField;
      value: WarehouseStructuredValue;
    }
  | { type: "WAREHOUSE_STORY_SUBMIT"; playerId: string }
  | { type: "WAREHOUSE_STORY_REVIEW"; playerId: string }
  | { type: "WAREHOUSE_START_QUESTION"; playerId: string }
  | { type: "WAREHOUSE_ADVANCE"; playerId: string }
  | {
      type: "WAREHOUSE_ANSWER";
      playerId: string;
      questionInstanceId: string;
      optionId: string;
    }
  | { type: "WAREHOUSE_DISCUSSION_READY"; playerId: string }
  | { type: "WAREHOUSE_BALLOT"; playerId: string; rankedOptionIds: readonly string[] };

interface LegacyPlayer {
  id: string;
  name: string;
  joinOrder: number;
  connected: boolean;
  ready: boolean;
  isHost: boolean;
}

export function initializeWarehouseMatch(input: {
  definition: WarehouseCaseDefinition;
  sessionId: string;
  players: readonly LegacyPlayer[];
  now: number;
}): WarehouseState {
  const firstPlayerId = input.players[0]!.id;
  const firstLocation = input.definition.storyOptions.locations[0]!.id;
  return createWarehouseCase({
    definition: input.definition,
    sessionId: input.sessionId,
    players: input.players,
    now: input.now,
    sharedStory: {
      entryReason: input.definition.storyOptions.entryReasons[0]!.id,
      entryRoute: input.definition.storyOptions.entryRoutes[0]!.id,
      keyHolderInitial: firstPlayerId,
      location2346: Object.fromEntries(input.players.map(({ id }) => [id, firstLocation])),
      carPurpose: input.definition.storyOptions.carPurposes[0]!.id,
      carDepartureExpected: true,
    },
  });
}

export function applyWarehouseIntent(input: {
  state: WarehouseState;
  definition: WarehouseCaseDefinition;
  player: { id: string; isHost: boolean };
  intent: WarehouseManagerIntent | EngineIntent;
  now: number;
}): WarehouseState {
  const { state, definition, player, intent, now } = input;
  switch (intent.type) {
    case "WAREHOUSE_STORY_SET":
      return setWarehouseStoryField(state, definition, intent.field, intent.value, player.id, now);
    case "WAREHOUSE_STORY_SUBMIT":
      return player.isHost ? submitWarehouseStory(state, now) : state;
    case "WAREHOUSE_STORY_REVIEW": {
      const confirmed = confirmWarehouseStory(state, player.id, now);
      return confirmed === state ? state : advanceWarehousePhase(confirmed, definition, now);
    }
    case "WAREHOUSE_START_QUESTION":
      return startWarehouseQuestion(state, player.id, now);
    case "WAREHOUSE_ADVANCE":
    case "ACKNOWLEDGE":
      return player.isHost ? advanceWarehousePhase(state, definition, now) : state;
    case "WAREHOUSE_ANSWER":
    case "ANSWER": {
      const questionInstanceId = intent.questionInstanceId;
      const privateView = toWarehousePrivateView(state, player.id);
      if (privateView?.question?.instanceId !== questionInstanceId) return state;
      const answered = lockWarehouseAnswer(state, player.id, intent.optionId, now);
      return answered === state ? state : advanceWarehousePhase(answered, definition, now);
    }
    case "WAREHOUSE_DISCUSSION_READY": {
      const ready = setWarehouseDiscussionReady(state, player.id, now);
      return ready === state ? state : advanceWarehousePhase(ready, definition, now);
    }
    case "WAREHOUSE_BALLOT": {
      const submitted = submitWarehouseRankedBallot(
        state,
        { playerId: player.id, rankedOptionIds: intent.rankedOptionIds },
        now,
      );
      return submitted === state ? state : advanceWarehousePhase(submitted, definition, now);
    }
    default:
      return state;
  }
}
