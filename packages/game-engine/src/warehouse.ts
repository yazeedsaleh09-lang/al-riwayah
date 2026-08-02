import {
  WAREHOUSE_CHAPTERS,
  type WarehouseAdoptedPatch,
  type WarehouseBallotResolution,
  type WarehouseCaseDefinition,
  type WarehouseCaseEvent,
  type WarehouseChapter,
  type WarehouseComparisonEvaluation,
  type WarehouseDetectedIssue,
  type WarehouseLockedAnswer,
  type WarehousePatchOption,
  type WarehousePlayer,
  type WarehousePlayerCount,
  type WarehousePlayerInput,
  type WarehouseQuestionAssignment,
  type WarehouseRankedBallot,
  type WarehouseSeat,
  type WarehouseSharedStory,
  type WarehouseState,
  type WarehouseStructuredValue,
} from "./warehouse-types";
import {
  calculateWarehouseScore,
  type CalculateWarehouseScoreInput,
} from "./warehouse-scoring";

const SEATS: readonly WarehouseSeat[] = ["P1", "P2", "P3", "P4", "P5", "P6"];
const ISSUE_PRIORITY = {
  EVIDENCE_CONFLICT: 0,
  DIRECT_CONTRADICTION: 1,
  STORY_GAP: 2,
  UNEXPLAINED_EVIDENCE: 3,
} as const;

export interface WarehouseValidationResult {
  valid: boolean;
  errors: readonly string[];
}

export function validateWarehouseCaseDefinition(
  definition: WarehouseCaseDefinition,
): WarehouseValidationResult {
  const errors: string[] = [];
  if (!definition.id || !definition.version) errors.push("case identity is required");
  if (definition.durationMinutes[0] <= 0 || definition.durationMinutes[1] < definition.durationMinutes[0]) {
    errors.push("durationMinutes must be an increasing positive range");
  }

  const questionIds = new Set<string>();
  for (const count of definition.supportedPlayerCounts) {
    const matrix = definition.questionMatrix[count];
    for (const chapter of WAREHOUSE_CHAPTERS) {
      const questions = matrix?.[chapter] ?? [];
      if (questions.length !== count) {
        errors.push(`${count}:${chapter} must assign exactly one question per seat`);
      }
      const seats = new Set<WarehouseSeat>();
      for (const question of questions) {
        if (question.chapter !== chapter) errors.push(`${question.id} has the wrong chapter`);
        if (seats.has(question.seat)) errors.push(`${count}:${chapter} duplicates ${question.seat}`);
        seats.add(question.seat);
        if (questionIds.has(`${count}:${question.id}`)) {
          errors.push(`${count}:${question.id} is duplicated`);
        }
        questionIds.add(`${count}:${question.id}`);
        if (
          question.options.length === 0 ||
          !question.outputFactKey ||
          question.comparisonTargets.length === 0 ||
          !question.compatibilityRule ||
          !question.conflictRule ||
          question.relevance.length === 0
        ) {
          errors.push(`${question.id} lacks structured comparison metadata`);
        }
      }
    }
  }

  const patchById = new Map(definition.patchOptions.map((patch) => [patch.id, patch]));
  for (const issue of definition.issues) {
    const validOptions = issue.patchOptionIds
      .map((id) => patchById.get(id))
      .filter((patch): patch is WarehousePatchOption => patch !== undefined);
    if (validOptions.length < 2) errors.push(`${issue.id} requires at least two valid patches`);
  }
  for (const patch of definition.patchOptions) {
    if (patch.factsAfter.length === 0) errors.push(`${patch.id} changes no facts`);
    if (patch.chapter !== "car" && patch.commitments.length === 0) {
      errors.push(`${patch.id} requires a later commitment`);
    }
    if (patch.chapter !== "car" && patch.laterEffects.length === 0) {
      errors.push(`${patch.id} requires a meaningful later effect`);
    }
  }
  for (const chapter of WAREHOUSE_CHAPTERS) {
    if (!definition.chapters[chapter]?.evidence) errors.push(`${chapter} requires main evidence`);
  }
  return { valid: errors.length === 0, errors };
}

function event(
  state: Pick<WarehouseState, "sessionId" | "eventLedger">,
  input: Omit<WarehouseCaseEvent, "id" | "sessionId">,
): WarehouseCaseEvent {
  return {
    ...input,
    id: `${state.sessionId}:event:${state.eventLedger.length + 1}`,
    sessionId: state.sessionId,
  };
}

function caseEvents(
  state: Pick<WarehouseState, "sessionId" | "eventLedger">,
  inputs: readonly Omit<WarehouseCaseEvent, "id" | "sessionId">[],
): readonly WarehouseCaseEvent[] {
  return inputs.reduce<WarehouseCaseEvent[]>((created, input) => {
    const eventState = {
      sessionId: state.sessionId,
      eventLedger: [...state.eventLedger, ...created],
    };
    return [...created, event(eventState, input)];
  }, []);
}

function assignPlayers(players: readonly WarehousePlayerInput[]): readonly WarehousePlayer[] {
  return players
    .slice()
    .sort((a, b) => a.joinOrder - b.joinOrder)
    .map((player, index) => ({ ...player, seat: SEATS[index]! }));
}

function assignQuestions(
  definition: WarehouseCaseDefinition,
  players: readonly WarehousePlayer[],
): Readonly<Record<string, WarehouseQuestionAssignment>> {
  const count = players.length as WarehousePlayerCount;
  const matrix = definition.questionMatrix[count];
  const assignments: Record<string, WarehouseQuestionAssignment> = {};
  for (const chapter of WAREHOUSE_CHAPTERS) {
    for (const question of matrix[chapter]) {
      const player = players.find((candidate) => candidate.seat === question.seat);
      if (!player) continue;
      const key = `${chapter}:${question.seat}`;
      assignments[key] = {
        ...question,
        playerId: player.id,
        instanceId: `${definition.id}:${key}`,
      };
    }
  }
  return assignments;
}

export interface CreateWarehouseCaseInput {
  definition: WarehouseCaseDefinition;
  sessionId: string;
  players: readonly WarehousePlayerInput[];
  sharedStory: WarehouseSharedStory;
  now: number;
}

export function createWarehouseCase(input: CreateWarehouseCaseInput): WarehouseState {
  const validation = validateWarehouseCaseDefinition(input.definition);
  if (!validation.valid) throw new Error(`Invalid Warehouse case: ${validation.errors.join("; ")}`);
  if (!input.definition.supportedPlayerCounts.includes(input.players.length as WarehousePlayerCount)) {
    throw new Error(`Unsupported Warehouse player count: ${input.players.length}`);
  }
  const players = assignPlayers(input.players);
  const state: WarehouseState = {
    sessionId: input.sessionId,
    definitionId: input.definition.id,
    definitionVersion: input.definition.version,
    chapter: "story",
    phase: "STORY_BUILDING",
    phaseRevision: 0,
    advisoryDeadlineAt: input.now + 240_000,
    advisoryExpired: false,
    worldFacts: {
      powerOutageAt: "23:46",
      deviceConnectedAt: "23:48",
      carExitedAt: "00:01",
    },
    players,
    disconnectedAtByPlayer: {},
    skippedPlayerIds: [],
    sharedStory: {
      ...input.sharedStory,
      location2346: { ...input.sharedStory.location2346 },
    },
    storyConfirmedPlayerIds: [],
    questionStartedPlayerIds: [],
    questionAssignments: {},
    lockedAnswers: [],
    readyForVotePlayerIds: [],
    rankedBallots: [],
    ballotRound: 0,
    ballotOptionIds: [],
    issueLedger: [],
    evidenceLedger: [],
    comparisonLedger: [],
    documentedComparisonSkips: [],
    adoptedPatches: [],
    commitments: [],
    derivedFacts: {},
    resolvedChapters: [],
    scoreResult: null,
    eventLedger: [],
  };
  const questionAssignments = assignQuestions(input.definition, players);
  const initialStoryFacts = [
    { field: "entryReason", value: state.sharedStory.entryReason },
    { field: "entryRoute", value: state.sharedStory.entryRoute },
    { field: "keyHolderInitial", value: state.sharedStory.keyHolderInitial },
    { field: "carPurpose", value: state.sharedStory.carPurpose },
    { field: "carDepartureExpected", value: state.sharedStory.carDepartureExpected },
    ...players.map((player) => ({
      field: `location2346.${player.id}`,
      value: state.sharedStory.location2346[player.id] ?? null,
    })),
  ];
  const initialEvents = [
    ...Object.entries(state.worldFacts).map(([factKey, value]) => ({
      type: "WORLD_FACT_REVEALED" as const,
      chapter: "story" as const,
      timestamp: input.now,
      visibility: "public" as const,
      refs: [factKey],
      data: { factKey, value },
    })),
    ...initialStoryFacts.map(({ field, value }) => ({
      type: "STORY_FACT_SET" as const,
      chapter: "story" as const,
      timestamp: input.now,
      visibility: "public" as const,
      refs: [field],
      data: { field, value },
    })),
    ...Object.values(questionAssignments).map((assignment) => ({
      type: "QUESTION_ASSIGNED" as const,
      chapter: assignment.chapter,
      timestamp: input.now,
      visibility: "server" as const,
      playerId: assignment.playerId,
      refs: [assignment.id, assignment.instanceId],
      data: { seat: assignment.seat },
    })),
  ];
  const eventLedger = initialEvents.reduce<WarehouseCaseEvent[]>(
    (ledger, item) => [...ledger, event({ sessionId: state.sessionId, eventLedger: ledger }, item)],
    [],
  );
  return { ...state, questionAssignments, eventLedger };
}

export function expireWarehouseAdvisoryDeadline(
  state: WarehouseState,
  now: number,
): WarehouseState {
  if (state.advisoryDeadlineAt === null || now < state.advisoryDeadlineAt || state.advisoryExpired) {
    return state;
  }
  const elapsed = event(state, {
    type: "ADVISORY_DEADLINE_ELAPSED",
    chapter: state.chapter,
    timestamp: now,
    visibility: "public",
    refs: [],
    data: { phase: state.phase },
  });
  return { ...state, advisoryExpired: true, eventLedger: [...state.eventLedger, elapsed] };
}

export function confirmWarehouseStory(
  state: WarehouseState,
  playerId: string,
  now: number,
): WarehouseState {
  if (
    !["STORY_REVIEW", "STORY_UPDATE"].includes(state.phase) ||
    !state.players.some((player) => player.id === playerId)
  ) {
    return state;
  }
  if (state.storyConfirmedPlayerIds.includes(playerId)) return state;
  return {
    ...state,
    storyConfirmedPlayerIds: [...state.storyConfirmedPlayerIds, playerId],
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "STORY_CONFIRMED",
        chapter: state.chapter,
        timestamp: now,
        visibility: "public",
        playerId,
        refs: [playerId],
        data: {},
      }),
    ],
  };
}

export function startWarehouseQuestion(
  state: WarehouseState,
  playerId: string,
  now: number,
): WarehouseState {
  if (
    state.phase !== "SILENT_PHASE_INTRO" ||
    !state.players.some((player) => player.id === playerId) ||
    state.skippedPlayerIds.includes(playerId) ||
    state.questionStartedPlayerIds.includes(playerId)
  ) {
    return state;
  }
  const questionStartedPlayerIds = [...state.questionStartedPlayerIds, playerId];
  const allStarted = requiredPlayers(state).every((player) =>
    questionStartedPlayerIds.includes(player.id),
  );
  const startedEvent = event(state, {
    type: "QUESTION_STARTED",
    chapter: state.chapter,
    timestamp: now,
    visibility: "private",
    playerId,
    refs: [playerId],
    data: {},
  });
  const ledger = [...state.eventLedger, startedEvent];
  if (!allStarted) return { ...state, questionStartedPlayerIds, eventLedger: ledger };
  return {
    ...state,
    phase: "CHAPTER_CONTEXT",
    phaseRevision: state.phaseRevision + 1,
    advisoryDeadlineAt: null,
    advisoryExpired: false,
    questionStartedPlayerIds,
    eventLedger: [
      ...ledger,
      event({ ...state, eventLedger: ledger }, {
        type: "SILENT_PHASE_STARTED",
        chapter: state.chapter,
        timestamp: now,
        visibility: "public",
        refs: [],
        data: {},
      }),
    ],
  };
}

export type WarehouseStoryField =
  | "entryReason"
  | "entryRoute"
  | "keyHolderInitial"
  | "carPurpose"
  | "carDepartureExpected"
  | `location2346.${string}`;

export function setWarehouseStoryField(
  state: WarehouseState,
  definition: WarehouseCaseDefinition,
  field: WarehouseStoryField,
  value: WarehouseStructuredValue,
  actorId: string,
  now: number,
): WarehouseState {
  if (state.phase !== "STORY_BUILDING" || !state.players.some((player) => player.id === actorId)) {
    return state;
  }
  let sharedStory: WarehouseSharedStory | null = null;
  if (
    field === "entryReason" &&
    definition.storyOptions.entryReasons.some((option) => option.id === value)
  ) {
    sharedStory = { ...state.sharedStory, entryReason: value as WarehouseSharedStory["entryReason"] };
  } else if (
    field === "entryRoute" &&
    definition.storyOptions.entryRoutes.some((option) => option.id === value)
  ) {
    sharedStory = { ...state.sharedStory, entryRoute: value as WarehouseSharedStory["entryRoute"] };
  } else if (
    field === "keyHolderInitial" &&
    typeof value === "string" &&
    state.players.some((player) => player.id === value)
  ) {
    sharedStory = { ...state.sharedStory, keyHolderInitial: value };
  } else if (
    field === "carPurpose" &&
    definition.storyOptions.carPurposes.some((option) => option.id === value)
  ) {
    sharedStory = { ...state.sharedStory, carPurpose: value as WarehouseSharedStory["carPurpose"] };
  } else if (field === "carDepartureExpected" && typeof value === "boolean") {
    sharedStory = { ...state.sharedStory, carDepartureExpected: value };
  } else if (field.startsWith("location2346.") && typeof value === "string") {
    const playerId = field.slice("location2346.".length);
    if (
      state.players.some((player) => player.id === playerId) &&
      definition.storyOptions.locations.some((option) => option.id === value)
    ) {
      sharedStory = {
        ...state.sharedStory,
        location2346: {
          ...state.sharedStory.location2346,
          [playerId]: value as WarehouseSharedStory["location2346"][string],
        },
      };
    }
  }
  if (!sharedStory) return state;
  return {
    ...state,
    sharedStory,
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "STORY_FACT_SET",
        chapter: "story",
        timestamp: now,
        visibility: "public",
        playerId: actorId,
        refs: [field],
        data: { field, value },
      }),
    ],
  };
}

export function submitWarehouseStory(state: WarehouseState, now: number): WarehouseState {
  if (state.phase !== "STORY_BUILDING") return state;
  return {
    ...state,
    phase: "STORY_REVIEW",
    phaseRevision: state.phaseRevision + 1,
    advisoryDeadlineAt: null,
    advisoryExpired: false,
    storyConfirmedPlayerIds: [],
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "STORY_FACT_SET",
        chapter: "story",
        timestamp: now,
        visibility: "public",
        refs: [],
        data: { status: "submitted" },
      }),
    ],
  };
}

export function lockWarehouseAnswer(
  state: WarehouseState,
  playerId: string,
  optionId: string,
  now: number,
): WarehouseState {
  if (!["SILENT_ANSWERING", "WAITING_FOR_ANSWERS"].includes(state.phase)) return state;
  if (!WAREHOUSE_CHAPTERS.includes(state.chapter as WarehouseChapter)) return state;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return state;
  const assignment = state.questionAssignments[`${state.chapter}:${player.seat}`];
  if (!assignment || state.lockedAnswers.some((answer) => answer.questionInstanceId === assignment.instanceId)) {
    return state;
  }
  const option = assignment.options.find((candidate) => candidate.id === optionId);
  if (!option) return state;
  const answer: WarehouseLockedAnswer = {
    playerId,
    questionInstanceId: assignment.instanceId,
    questionId: assignment.id,
    chapter: state.chapter as WarehouseChapter,
    fact: { key: assignment.outputFactKey, value: option.value },
    lockedAt: now,
  };
  return {
    ...state,
    lockedAnswers: [...state.lockedAnswers, answer],
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "ANSWER_LOCKED",
        chapter: state.chapter,
        timestamp: now,
        visibility: "private",
        playerId,
        refs: [assignment.id, assignment.outputFactKey],
        data: { factKey: assignment.outputFactKey, answerValue: option.value },
      }),
    ],
  };
}

export function setWarehouseDiscussionReady(
  state: WarehouseState,
  playerId: string,
  now: number,
): WarehouseState {
  if (
    state.phase !== "OPEN_DISCUSSION" ||
    !state.players.some((player) => player.id === playerId && player.connected) ||
    state.readyForVotePlayerIds.includes(playerId)
  ) {
    return state;
  }
  return {
    ...state,
    readyForVotePlayerIds: [...state.readyForVotePlayerIds, playerId],
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "DISCUSSION_READY",
        chapter: state.chapter,
        timestamp: now,
        visibility: "public",
        playerId,
        refs: [playerId],
        data: {},
      }),
    ],
  };
}

export function submitWarehouseRankedBallot(
  state: WarehouseState,
  ballot: WarehouseRankedBallot,
  now: number,
): WarehouseState {
  if (
    state.phase !== "PATCH_BALLOT" ||
    !state.players.some((player) => player.id === ballot.playerId) ||
    state.skippedPlayerIds.includes(ballot.playerId) ||
    state.rankedBallots.some((submitted) => submitted.playerId === ballot.playerId)
  ) {
    return state;
  }
  const required = new Set(state.ballotOptionIds);
  if (
    required.size < 2 ||
    ballot.rankedOptionIds.length !== required.size ||
    new Set(ballot.rankedOptionIds).size !== required.size ||
    ballot.rankedOptionIds.some((id) => !required.has(id))
  ) {
    return state;
  }
  const locked = { playerId: ballot.playerId, rankedOptionIds: [...ballot.rankedOptionIds] };
  return {
    ...state,
    rankedBallots: [...state.rankedBallots, locked],
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "RANKED_BALLOT_SUBMITTED",
        chapter: state.chapter,
        timestamp: now,
        visibility: "private",
        playerId: ballot.playerId,
        refs: [...ballot.rankedOptionIds],
        data: {
          optionCount: ballot.rankedOptionIds.length,
          ranking: ballot.rankedOptionIds.join("|"),
        },
      }),
    ],
  };
}

function requiredPlayers(state: WarehouseState) {
  return state.players.filter((player) => !state.skippedPlayerIds.includes(player.id));
}

function warehouseFactValue(
  state: WarehouseState,
  factKey: string,
): WarehouseStructuredValue | undefined {
  const storyFacts: Record<string, WarehouseStructuredValue> = {
    entry_reason: state.sharedStory.entryReason,
    entry_route: state.sharedStory.entryRoute,
    key_holder_initial: state.sharedStory.keyHolderInitial,
    car_purpose: state.sharedStory.carPurpose,
    car_departure_expected: state.sharedStory.carDepartureExpected,
  };
  return state.derivedFacts[factKey] ?? storyFacts[factKey];
}

export function isWarehousePatchAvailable(
  state: WarehouseState,
  option: WarehousePatchOption,
): boolean {
  if (!option.availability) return true;
  return option.availability.allowedValues.includes(
    warehouseFactValue(state, option.availability.factKey) ?? null,
  );
}

export function disconnectWarehousePlayer(
  state: WarehouseState,
  playerId: string,
  now: number,
): WarehouseState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player?.connected) return state;
  return {
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === playerId ? { ...candidate, connected: false } : candidate,
    ),
    disconnectedAtByPlayer: { ...state.disconnectedAtByPlayer, [playerId]: now },
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "PLAYER_DISCONNECTED",
        chapter: state.chapter,
        timestamp: now,
        visibility: "public",
        playerId,
        refs: [playerId],
        data: {},
      }),
    ],
  };
}

export function reconnectWarehousePlayer(
  state: WarehouseState,
  playerId: string,
  now: number,
): WarehouseState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.connected) return state;
  const disconnectedAtByPlayer = { ...state.disconnectedAtByPlayer };
  delete disconnectedAtByPlayer[playerId];
  return {
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === playerId ? { ...candidate, connected: true } : candidate,
    ),
    disconnectedAtByPlayer,
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "PLAYER_RECONNECTED",
        chapter: state.chapter,
        timestamp: now,
        visibility: "public",
        playerId,
        refs: [playerId],
        data: {},
      }),
    ],
  };
}

export function skipDisconnectedWarehousePlayer(
  state: WarehouseState,
  playerId: string,
  now: number,
): WarehouseState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const disconnectedAt = state.disconnectedAtByPlayer[playerId];
  if (
    !player ||
    player.connected ||
    disconnectedAt === undefined ||
    now - disconnectedAt < 90_000 ||
    state.skippedPlayerIds.includes(playerId)
  ) {
    return state;
  }
  return {
    ...state,
    skippedPlayerIds: [...state.skippedPlayerIds, playerId],
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "PLAYER_SKIPPED",
        chapter: state.chapter,
        timestamp: now,
        visibility: "public",
        playerId,
        refs: [playerId],
        data: {},
      }),
    ],
  };
}

const NEXT_CHAPTER: Record<WarehouseChapter, WarehouseChapter | "result"> = {
  power: "device",
  device: "car",
  car: "result",
};

export function advanceWarehousePhase(
  state: WarehouseState,
  definition: WarehouseCaseDefinition,
  now: number,
): WarehouseState {
  let phase = state.phase;
  let chapter = state.chapter;
  let advisoryDeadlineAt: number | null = null;
  let readyForVotePlayerIds = state.readyForVotePlayerIds;
  let rankedBallots = state.rankedBallots;
  let ballotOptionIds = state.ballotOptionIds;
  let resolvedChapters = state.resolvedChapters;

  switch (state.phase) {
    case "STORY_REVIEW":
      if (!requiredPlayers(state).every((player) => state.storyConfirmedPlayerIds.includes(player.id))) {
        return state;
      }
      phase = "SILENT_PHASE_INTRO";
      chapter = "power";
      break;
    case "SILENT_PHASE_INTRO":
      return state;
    case "CHAPTER_CONTEXT":
      phase = "SILENT_ANSWERING";
      advisoryDeadlineAt = now + 45_000;
      break;
    case "SILENT_ANSWERING":
      phase = "WAITING_FOR_ANSWERS";
      advisoryDeadlineAt = state.advisoryDeadlineAt;
      break;
    case "WAITING_FOR_ANSWERS": {
      const currentChapter = state.chapter as WarehouseChapter;
      if (
        !requiredPlayers(state).every((player) => {
          const assignment = state.questionAssignments[`${currentChapter}:${player.seat}`];
          return (
            assignment &&
            state.lockedAnswers.some((answer) => answer.questionInstanceId === assignment.instanceId)
          );
        })
      ) {
        return state;
      }
      phase = "ISSUE_REVEAL";
      const revealedIssues = evaluateWarehouseChapterIssues(state, definition, currentChapter);
      const comparisonEvaluation = evaluateChapterComparisons(state, currentChapter);
      const evidence = definition.chapters[currentChapter].evidence;
      const evidenceFit = revealedIssues.some((issue) => issue.type === "EVIDENCE_CONFLICT")
        ? "UNEXPLAINED_OR_CONFLICT"
        : revealedIssues.some((issue) => issue.type === "UNEXPLAINED_EVIDENCE")
          ? "LEAVES_GAP"
          : "DIRECTLY_EXPLAINED";
      const checkedCommitments = state.commitments.map((commitment) => {
        if (commitment.testChapter !== currentChapter || commitment.status !== "pending") {
          return commitment;
        }
        const actual = commitmentObservedValue(state, commitment, currentChapter);
        return {
          ...commitment,
          status:
            actual === undefined
              ? ("untested" as const)
              : actual === commitment.expectedValue
                ? ("satisfied" as const)
                : ("broken" as const),
        };
      });
      const checkedEventInputs = checkedCommitments
        .filter(
          (commitment, index) =>
            commitment.status !== state.commitments[index]?.status &&
            commitment.testChapter === currentChapter,
        )
        .map((commitment) => ({
          type: "COMMITMENT_CHECKED" as const,
          chapter: currentChapter,
          timestamp: now,
          visibility: "public" as const,
          refs: [commitment.id],
          data: { status: commitment.status, factKey: commitment.factKey },
        }));
      const transitionEvents = caseEvents(state, [
        {
          type: "ALL_ANSWERS_LOCKED",
          chapter: currentChapter,
          timestamp: now,
          visibility: "public",
          refs: [],
          data: { answerCount: requiredPlayers(state).length },
        },
        {
          type: "EVIDENCE_REVEALED",
          chapter: currentChapter,
          timestamp: now,
          visibility: "public",
          refs: [evidence.id],
          data: { evidenceId: evidence.id },
        },
        ...revealedIssues.map((issue) => ({
          type: "ISSUE_DETECTED" as const,
          chapter: currentChapter,
          timestamp: now,
          visibility: "server" as const,
          playerId: issue.attribution?.sourcePlayerId,
          refs: [
            issue.id,
            ...(issue.attribution
              ? [
                  issue.attribution.sourcePlayerId,
                  ...(issue.attribution.targetPlayerId ? [issue.attribution.targetPlayerId] : []),
                ]
              : []),
          ],
          data: { issueType: issue.type },
        })),
        ...revealedIssues.map((issue) => ({
          type: "ISSUE_REVEALED" as const,
          chapter: currentChapter,
          timestamp: now,
          visibility: "public" as const,
          playerId: issue.attribution?.sourcePlayerId,
          refs: [
            issue.id,
            ...(issue.attribution
              ? [
                  issue.attribution.sourcePlayerId,
                  ...(issue.attribution.targetPlayerId ? [issue.attribution.targetPlayerId] : []),
                ]
              : []),
          ],
          data: {
            issueType: issue.type,
            sourceValue: issue.attribution?.sourceValue ?? null,
            targetValue: issue.attribution?.targetValue ?? null,
          },
        })),
        ...checkedEventInputs,
      ]);
      return {
        ...state,
        phase,
        phaseRevision: state.phaseRevision + 1,
        advisoryDeadlineAt: null,
        advisoryExpired: false,
        issueLedger: [
          ...state.issueLedger,
          ...revealedIssues.filter(
            (issue) => !state.issueLedger.some((existing) => existing.id === issue.id),
          ),
        ],
        evidenceLedger: state.evidenceLedger.some(
          (evaluation) => evaluation.chapter === currentChapter,
        )
          ? state.evidenceLedger
          : [
              ...state.evidenceLedger,
              { evidenceId: evidence.id, chapter: currentChapter, fit: evidenceFit },
            ],
        comparisonLedger: [
          ...state.comparisonLedger,
          ...comparisonEvaluation.comparisons.filter(
            (comparison) =>
              !state.comparisonLedger.some((existing) => existing.id === comparison.id),
          ),
        ],
        documentedComparisonSkips: [
          ...state.documentedComparisonSkips,
          ...comparisonEvaluation.skipped.filter(
            (skip) => !state.documentedComparisonSkips.includes(skip),
          ),
        ],
        commitments: checkedCommitments,
        eventLedger: [...state.eventLedger, ...transitionEvents],
      };
    }
    case "ISSUE_REVEAL":
      phase = "OPEN_DISCUSSION";
      advisoryDeadlineAt = now + 90_000;
      readyForVotePlayerIds = [];
      break;
    case "OPEN_DISCUSSION": {
      const connectedRequired = requiredPlayers(state).filter((player) => player.connected);
      if (!connectedRequired.every((player) => state.readyForVotePlayerIds.includes(player.id))) {
        return state;
      }
      const issueIds = state.issueLedger
        .filter((issue) => issue.chapter === state.chapter)
        .map((issue) => issue.id);
      const optionIds = definition.patchOptions
        .filter(
          (option) =>
            option.chapter === state.chapter &&
            option.resolvesIssueIds.some((id) => issueIds.includes(id)) &&
            isWarehousePatchAvailable(state, option),
        )
        .map((option) => option.id);
      if (optionIds.length < 2) {
        return {
          ...state,
          phase: "STORY_UPDATE",
          phaseRevision: state.phaseRevision + 1,
          advisoryDeadlineAt: null,
          advisoryExpired: false,
          storyConfirmedPlayerIds: [],
          eventLedger: [
            ...state.eventLedger,
            event(state, {
              type: "CHAPTER_RESOLVED",
              chapter: state.chapter,
              timestamp: now,
              visibility: "public",
              refs: issueIds,
              data: { patchSkipped: true, reason: "INSUFFICIENT_VALID_OPTIONS" },
            }),
          ],
        };
      }
      phase = "PATCH_BALLOT";
      advisoryDeadlineAt = now + 60_000;
      rankedBallots = [];
      ballotOptionIds = optionIds;
      return {
        ...state,
        phase,
        phaseRevision: state.phaseRevision + 1,
        advisoryDeadlineAt,
        advisoryExpired: false,
        readyForVotePlayerIds,
        rankedBallots,
        ballotRound: 0,
        ballotOptionIds,
        eventLedger: [
          ...state.eventLedger,
          event(state, {
            type: "PATCH_OPTIONS_GENERATED",
            chapter: state.chapter,
            timestamp: now,
            visibility: "public",
            refs: optionIds,
            data: { optionCount: optionIds.length },
          }),
        ],
      };
    }
    case "PATCH_BALLOT":
      return resolveWarehouseBallotPhase(state, definition, now);
    case "PATCH_RESOLUTION":
      if (!state.adoptedPatches.some((patch) => patch.chapter === state.chapter)) return state;
      phase = "STORY_UPDATE";
      break;
    case "STORY_UPDATE": {
      if (!requiredPlayers(state).every((player) => state.storyConfirmedPlayerIds.includes(player.id))) {
        return state;
      }
      const currentChapter = state.chapter as WarehouseChapter;
      resolvedChapters = state.resolvedChapters.includes(currentChapter)
        ? state.resolvedChapters
        : [...state.resolvedChapters, currentChapter];
      const next = NEXT_CHAPTER[currentChapter];
      if (next === "result") {
        phase = "RESULT_CALCULATION";
        chapter = "result";
      } else {
        phase = "SILENT_PHASE_INTRO";
        chapter = next;
      }
      return {
        ...state,
        phase,
        chapter,
        phaseRevision: state.phaseRevision + 1,
        advisoryDeadlineAt: null,
        advisoryExpired: false,
        storyConfirmedPlayerIds: [],
        questionStartedPlayerIds: [],
        resolvedChapters,
        eventLedger: [
          ...state.eventLedger,
          event(state, {
            type: "CHAPTER_RESOLVED",
            chapter: currentChapter,
            timestamp: now,
            visibility: "public",
            refs: state.adoptedPatches
              .filter((patch) => patch.chapter === currentChapter)
              .map((patch) => patch.patchId),
            data: { patched: state.adoptedPatches.some((patch) => patch.chapter === currentChapter) },
          }),
        ],
      };
    }
    case "RESULT_CALCULATION":
      return {
        ...calculateWarehouseResultFromState(state, now),
        phase: "RESULT_REVEAL",
        phaseRevision: state.phaseRevision + 1,
      };
    default:
      return state;
  }

  return {
    ...state,
    phase,
    chapter,
    phaseRevision: state.phaseRevision + 1,
    advisoryDeadlineAt,
    advisoryExpired: false,
    readyForVotePlayerIds,
    rankedBallots,
    ballotRound: state.ballotRound,
    ballotOptionIds,
    resolvedChapters,
    storyConfirmedPlayerIds:
      phase === "STORY_UPDATE" ? state.storyConfirmedPlayerIds : [],
    questionStartedPlayerIds:
      phase === "SILENT_PHASE_INTRO" ? [] : state.questionStartedPlayerIds,
  };
}

export function resolveWarehouseBallotPhase(
  state: WarehouseState,
  definition: WarehouseCaseDefinition,
  now: number,
): WarehouseState {
  if (state.phase !== "PATCH_BALLOT") return state;
  if (
    !requiredPlayers(state).every((player) =>
      state.rankedBallots.some((ballot) => ballot.playerId === player.id),
    )
  ) {
    return state;
  }
  const options = state.ballotOptionIds
    .map((id) => definition.patchOptions.find((option) => option.id === id))
    .filter((option): option is WarehousePatchOption => option !== undefined);
  const resolution = resolveRankedBallots(options, state.rankedBallots, state.ballotRound);
  if (resolution.status === "rerun") {
    return {
      ...state,
      phaseRevision: state.phaseRevision + 1,
      advisoryDeadlineAt: now + 60_000,
      advisoryExpired: false,
      ballotRound: 1,
      ballotOptionIds: [...resolution.tiedOptionIds],
      rankedBallots: [],
    };
  }
  const option = options.find((candidate) => candidate.id === resolution.patchId);
  if (!option) throw new Error(`Resolved patch ${resolution.patchId} is unavailable`);
  const adopted = adoptWarehousePatch(state, option, state.rankedBallots, now);
  return {
    ...adopted,
    phase: "PATCH_RESOLUTION",
    phaseRevision: state.phaseRevision + 1,
    advisoryDeadlineAt: null,
    advisoryExpired: false,
  };
}

export function calculateWarehouseResult(
  state: WarehouseState,
  input: CalculateWarehouseScoreInput,
  now: number,
): WarehouseState {
  if (state.phase !== "RESULT_CALCULATION") return state;
  const scoreResult = calculateWarehouseScore(input);
  return {
    ...state,
    scoreResult,
    eventLedger: [
      ...state.eventLedger,
      event(state, {
        type: "SCORE_CALCULATED",
        chapter: "result",
        timestamp: now,
        visibility: "public",
        refs: [],
        data: {
          status: scoreResult.status,
          overall: scoreResult.status === "complete" ? scoreResult.overall : null,
          consistency: scoreResult.status === "complete" ? scoreResult.consistency : null,
          plausibility: scoreResult.status === "complete" ? scoreResult.plausibility : null,
          stability: scoreResult.status === "complete" ? scoreResult.stability : null,
        },
      }),
    ],
  };
}

export function calculateWarehouseResultFromState(
  state: WarehouseState,
  now: number,
): WarehouseState {
  const complexity = state.derivedFacts.story_complexity;
  return calculateWarehouseResult(
    state,
    {
      comparisons: state.comparisonLedger,
      documentedComparisonSkips: state.documentedComparisonSkips,
      evidenceEvaluations: state.evidenceLedger,
      commitments: state.commitments,
      unnecessaryComplexityPenalty: typeof complexity === "number" ? complexity : 0,
      chaptersResolved: state.resolvedChapters,
    },
    now,
  );
}

export function detectWarehouseIssues(
  candidates: readonly WarehouseDetectedIssue[],
): readonly WarehouseDetectedIssue[] {
  const sorted = candidates.slice().sort((a, b) => {
    const priority = ISSUE_PRIORITY[a.type] - ISSUE_PRIORITY[b.type];
    if (priority !== 0) return priority;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return a.id.localeCompare(b.id);
  });
  const selected: WarehouseDetectedIssue[] = [];
  for (const issue of sorted) {
    if (issue.severity <= 1 || selected.some((item) => item.independentKey === issue.independentKey)) {
      continue;
    }
    selected.push({
      ...issue,
      factRefs: [...issue.factRefs],
      ...(issue.attribution ? { attribution: { ...issue.attribution } } : {}),
    });
    if (selected.length === 2) break;
  }
  return selected;
}

function structuredFactsForChapter(
  state: WarehouseState,
  chapter: WarehouseChapter,
): Readonly<Record<string, WarehouseStructuredValue>> {
  const facts = state.lockedAnswers
    .filter((answer) => answer.chapter === chapter)
    .reduce<Record<string, WarehouseStructuredValue>>(
      (result, answer) => ({ ...result, [answer.fact.key]: answer.fact.value ?? null }),
      { ...state.derivedFacts },
    );
  for (const player of state.players) {
    facts[`story.location2346.${player.seat}`] =
      state.sharedStory.location2346[player.id] ?? null;
  }
  return {
    ...facts,
    "story.entryReason": state.sharedStory.entryReason,
    "story.entryRoute": state.sharedStory.entryRoute,
    "story.keyHolderInitial": state.sharedStory.keyHolderInitial,
    "story.carPurpose": state.sharedStory.carPurpose,
    "story.carDepartureExpected": state.sharedStory.carDepartureExpected,
  };
}

export function isWarehouseQuestionActivatedByPatch(
  state: WarehouseState,
  assignment: WarehouseQuestionAssignment,
): boolean {
  if (!assignment.laterEffectSelector) return false;
  return state.adoptedPatches.some((patch) =>
    patch.laterEffects.some(
      (effect) =>
        effect.chapter === assignment.chapter &&
        effect.selectorKey === assignment.laterEffectSelector,
    ),
  );
}

function commitmentObservedValue(
  state: WarehouseState,
  commitment: WarehouseState["commitments"][number],
  chapter: WarehouseChapter,
): WarehouseStructuredValue | undefined {
  const directAnswer = state.lockedAnswers.find(
    (answer) => answer.chapter === chapter && answer.fact.key === commitment.factKey,
  );
  if (directAnswer) return directAnswer.fact.value;

  const sourcePatch = state.adoptedPatches.find(
    (patch) => patch.patchId === commitment.fromPatchId,
  );
  const selectors = new Set(
    sourcePatch?.laterEffects
      .filter((effect) => effect.chapter === chapter)
      .map((effect) => effect.selectorKey) ?? [],
  );
  const linkedAssignments = Object.values(state.questionAssignments).filter(
    (assignment) =>
      assignment.chapter === chapter &&
      assignment.laterEffectSelector !== undefined &&
      selectors.has(assignment.laterEffectSelector) &&
      (assignment.comparisonTargets.includes(commitment.factKey) ||
        assignment.comparisonTargets.includes(`derived.${commitment.factKey}`) ||
        (commitment.factKey.startsWith("movement.") &&
          assignment.comparisonTargets.includes("derived.movement"))),
  );
  for (const assignment of linkedAssignments) {
    const answer = state.lockedAnswers.find(
      (candidate) => candidate.questionInstanceId === assignment.instanceId,
    );
    if (!answer) continue;
    if (
      assignment.compatibilityRule === "location_reachable" &&
      typeof commitment.expectedValue === "string"
    ) {
      const destination = /^to_(.+)_\d{4}_\d{4}$/.exec(commitment.expectedValue)?.[1];
      return answer.fact.value === destination ? commitment.expectedValue : answer.fact.value;
    }
    return answer.fact.value;
  }
  return undefined;
}

function evaluateChapterComparisons(
  state: WarehouseState,
  chapter: WarehouseChapter,
): {
  comparisons: readonly WarehouseComparisonEvaluation[];
  skipped: readonly string[];
  hasDirectContradiction: boolean;
} {
  const facts = structuredFactsForChapter(state, chapter);
  const comparisons: WarehouseComparisonEvaluation[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const assignment of Object.values(state.questionAssignments).filter(
    (question) => question.chapter === chapter,
  )) {
    const value = facts[assignment.outputFactKey];
    let compared = false;
    for (const target of assignment.comparisonTargets) {
      const targetValue = facts[target];
      if (value === undefined || targetValue === undefined || typeof targetValue === "object") {
        continue;
      }
      const pair = [assignment.outputFactKey, target].sort().join("|");
      if (seen.has(pair)) continue;
      seen.add(pair);
      compared = true;
      const isDirectRule =
        assignment.conflictRule === "different_location" ||
        assignment.conflictRule === "incompatible_companion";
      const targetAssignment = Object.values(state.questionAssignments).find(
        (candidate) => candidate.chapter === chapter && candidate.outputFactKey === target,
      );
      comparisons.push({
        id: `${chapter}:${pair}`,
        chapter,
        compatibility:
          value === targetValue ? "MATCH" : isDirectRule ? "DIRECT_CONTRADICTION" : "GAP",
        weight: 1,
        sourcePlayerId: assignment.playerId,
        ...(targetAssignment ? { targetPlayerId: targetAssignment.playerId } : {}),
        sourceFactKey: assignment.outputFactKey,
        targetFactKey: target,
        sourceValue: value,
        targetValue,
      });
    }
    if (!compared && state.skippedPlayerIds.includes(assignment.playerId)) {
      skipped.push(`${chapter}:${assignment.id}:player-skipped`);
    }
  }
  return {
    comparisons,
    skipped,
    hasDirectContradiction: comparisons.some(
      (comparison) => comparison.compatibility === "DIRECT_CONTRADICTION",
    ),
  };
}

export function evaluateWarehouseChapterIssues(
  state: WarehouseState,
  definition: WarehouseCaseDefinition,
  chapter: WarehouseChapter,
): readonly WarehouseDetectedIssue[] {
  const comparison = evaluateChapterComparisons(state, chapter);
  const facts = structuredFactsForChapter(state, chapter);
  const evidenceConflict =
    (chapter === "car" && state.sharedStory.carDepartureExpected === false) ||
    (chapter === "device" &&
      (facts.inventory_screen_expected === false || facts.inventory_screen_expected === "no"));
  const explanationKey = {
    power: "gate_open_reason",
    device: "device_explanation",
    car: "car_departure_reason",
  }[chapter];
  const unexplained = warehouseFactValue(state, explanationKey) === undefined;
  const hasStoryGap =
    typeof state.derivedFacts.unresolved_issue_count === "number" &&
    state.derivedFacts.unresolved_issue_count > 0;
  const desiredTypes = comparison.hasDirectContradiction
    ? (["DIRECT_CONTRADICTION"] as const)
    : evidenceConflict
      ? (["EVIDENCE_CONFLICT"] as const)
      : unexplained
        ? (["UNEXPLAINED_EVIDENCE"] as const)
        : hasStoryGap
          ? (["STORY_GAP"] as const)
          : ([] as const);
  const directComparison = comparison.comparisons.find(
    (item) => item.compatibility === "DIRECT_CONTRADICTION" && item.sourcePlayerId,
  );
  const candidates = definition.issues
    .filter((issue) => issue.chapter === chapter && desiredTypes.includes(issue.type as never))
    .map(({ id, type, severity, independentKey, factRefs }) => ({
      id,
      chapter,
      type,
      severity,
      independentKey,
      factRefs,
      ...(type === "DIRECT_CONTRADICTION" &&
      directComparison?.sourcePlayerId &&
      directComparison.sourceFactKey &&
      directComparison.targetFactKey &&
      directComparison.sourceValue !== undefined &&
      directComparison.targetValue !== undefined
        ? {
            attribution: {
              sourcePlayerId: directComparison.sourcePlayerId,
              ...(directComparison.targetPlayerId
                ? { targetPlayerId: directComparison.targetPlayerId }
                : {}),
              sourceFactKey: directComparison.sourceFactKey,
              targetFactKey: directComparison.targetFactKey,
              sourceValue: directComparison.sourceValue,
              targetValue: directComparison.targetValue,
            },
          }
        : {}),
    }));
  if (candidates.length > 0) return detectWarehouseIssues(candidates);
  return [];
}

function validateBallots(
  options: readonly WarehousePatchOption[],
  ballots: readonly WarehouseRankedBallot[],
): void {
  if (options.length < 2) throw new Error("PATCH_BALLOT requires at least two valid options");
  const optionIds = new Set(options.map((option) => option.id));
  for (const ballot of ballots) {
    if (
      ballot.rankedOptionIds.length !== options.length ||
      new Set(ballot.rankedOptionIds).size !== options.length ||
      ballot.rankedOptionIds.some((id) => !optionIds.has(id))
    ) {
      throw new Error(`Invalid ranked ballot from ${ballot.playerId}`);
    }
  }
}

export function resolveRankedBallots(
  options: readonly WarehousePatchOption[],
  ballots: readonly WarehouseRankedBallot[],
  rerunCount: 0 | 1,
): WarehouseBallotResolution {
  validateBallots(options, ballots);
  if (ballots.length === 0) throw new Error("Cannot resolve an empty ballot");
  const scores = new Map(options.map((option) => [option.id, 0]));
  for (const ballot of ballots) {
    ballot.rankedOptionIds.forEach((id, index) => {
      scores.set(id, scores.get(id)! + options.length - index);
    });
  }
  const maxScore = Math.max(...scores.values());
  const tiedOptionIds = options
    .filter((option) => scores.get(option.id) === maxScore)
    .map((option) => option.id);
  if (tiedOptionIds.length === 1) {
    return { status: "adopted", patchId: tiedOptionIds[0]!, reason: "RANKED_POINTS" };
  }
  if (rerunCount === 0) return { status: "rerun", tiedOptionIds };
  const patchId = options
    .filter((option) => tiedOptionIds.includes(option.id))
    .slice()
    .sort(
      (a, b) =>
        a.newFactCount - b.newFactCount ||
        a.changedFactCount - b.changedFactCount ||
        a.id.localeCompare(b.id),
    )[0]!.id;
  return { status: "adopted", patchId, reason: "SECOND_TIE_CONSERVATIVE" };
}

export function adoptWarehousePatch(
  state: WarehouseState,
  option: WarehousePatchOption,
  ballots: readonly WarehouseRankedBallot[],
  now: number,
): WarehouseState {
  const factsBefore = option.factsAfter.map(({ key }) => ({ key, value: state.derivedFacts[key] }));
  const factsAfter = option.factsAfter.map((fact) => ({ ...fact }));
  const derivedFacts = factsAfter.reduce<Record<string, WarehouseStructuredValue>>(
    (facts, fact) => ({ ...facts, [fact.key]: fact.value ?? null }),
    { ...state.derivedFacts },
  );
  const adopted: WarehouseAdoptedPatch = {
    patchId: option.id,
    chapter: option.chapter,
    sourceIssueIds: [...option.resolvesIssueIds],
    rankedBallots: ballots.map((ballot) => ({
      playerId: ballot.playerId,
      rankedOptionIds: [...ballot.rankedOptionIds],
    })),
    factsBefore,
    factsAfter,
    commitmentsCreated: option.commitments.map((commitment) => ({
      ...commitment,
      fromPatchId: option.id,
    })),
    laterEffects: option.laterEffects.map((effect) => ({ ...effect })),
  };
  const patchEvents = caseEvents(state, [
    {
      type: "PATCH_ADOPTED",
      chapter: option.chapter,
      timestamp: now,
      visibility: "public",
      refs: [option.id, ...option.resolvesIssueIds],
      playerId: ballots.find((ballot) => ballot.rankedOptionIds[0] === option.id)?.playerId,
      data: { patchId: option.id },
    },
    ...factsAfter.map((fact) => ({
      type: "STORY_FACT_UPDATED" as const,
      chapter: option.chapter,
      timestamp: now,
      visibility: "public" as const,
      refs: [option.id, fact.key],
      data: { factKey: fact.key, value: fact.value ?? null },
    })),
    ...adopted.commitmentsCreated.map((commitment) => ({
      type: "COMMITMENT_CREATED" as const,
      chapter: option.chapter,
      timestamp: now,
      visibility: "server" as const,
      refs: [option.id, commitment.id],
      data: { factKey: commitment.factKey },
    })),
  ]);
  return {
    ...state,
    derivedFacts,
    adoptedPatches: [...state.adoptedPatches, adopted],
    commitments: [...state.commitments, ...adopted.commitmentsCreated],
    eventLedger: [...state.eventLedger, ...patchEvents],
  };
}
