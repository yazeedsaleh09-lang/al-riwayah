import {
  BANK_REPAIR_BRANCHES, assignBankQuestions, classifyFirstReveal, evaluateRepairAgainstTruth,
  getBankRuntimeEvidence, resolveRepairVote, scoreBankPlayer, scoreSuspicionBaskets,
  type BankAnswerPhase, type BankFactValue, type BankFit, type BankFirstReveal, type BankPhase,
  type BankPlayerInput, type BankQuestion, type BankQuestionAssignment, type BankRepairBranch,
  type BankRepairId, type BankRuntimeCaseDefinition, type BankScoreCheck, type BankScoreCheckKey,
  type BankTruthPacketId,
} from "./bank-al-saha-rules";
export interface BankLockedAnswer {
  playerId: string;
  phase: BankAnswerPhase;
  questionId: string;
  optionId: string;
  normalizedFacts: Readonly<Record<string, BankFactValue>>;
}
export interface BankEvent {
  id: string;
  type: "PHASE_ADVANCED" | "STORY_FACT_LOCKED" | "STORY_LOCKED" | "ANSWER_LOCKED" |
    "ISSUE_REVEALED" | "VOTE_UPDATED" | "REPAIR_ADOPTED" | "REPAIR_FACT_APPLIED" |
    "EVIDENCE_REVEALED" | "SUSPICION_APPLIED" | "SCORE_CALCULATED" |
    "VERDICT_CALCULATED" | "RANKING_CALCULATED";
  phase: BankPhase;
  playerId?: string;
  refs: readonly string[];
  visibility: "public" | "private" | "server";
}
export interface BankMatchState {
  matchId: string;
  seed: string;
  phase: BankPhase;
  phaseRevision: number;
  players: readonly BankPlayerInput[];
  assignments: Readonly<Record<string, BankQuestionAssignment>>;
  caseDefinition: BankRuntimeCaseDefinition | null;
  truthPacketId: BankTruthPacketId;
  storyAssignments: readonly BankStoryAssignment[];
  storyFacts: Readonly<Record<string, BankFactValue>>;
  storyLocked: boolean;
  answers: readonly BankLockedAnswer[];
  firstReveal: BankFirstReveal | null;
  votes: Readonly<Partial<Record<string, BankRepairId>>>;
  selectedRepairId: BankRepairId | null;
  repairEvaluation: ReturnType<typeof evaluateRepairAgainstTruth> | null;
  suspicion: number;
  suspicionAudit: ReturnType<typeof scoreSuspicionBaskets> | null;
  verdict: { suspicion: number; outcome: "survived" | "failed"; band: "clean" | "suspected" | "monitored" | "collapsed" | "exposed" } | null;
  rankings: readonly {
    playerId: string;
    displayName: string;
    score: number | null;
    sharedRank: number | null;
    reason: string;
    explanation: string;
  }[];
  rankingStatus: "pending" | "complete" | "incomplete";
  eventLedger: readonly BankEvent[];
}
export interface BankStoryOption {
  id: string;
  label: string;
  value: BankFactValue;
}
export interface BankStoryAssignment {
  ownerPlayerId: string;
  factKey: string;
  prompt: string;
  options: readonly BankStoryOption[];
}
function repairBranch(state: BankMatchState, repairId: BankRepairId): BankRepairBranch {
  const source = state.caseDefinition?.repairBranches[repairId];
  if (!source) return BANK_REPAIR_BRANCHES[repairId];
  const request = state.caseDefinition!.evidenceRequests[source.evidenceRequestId];
  return {
    id: repairId,
    title: source.title.ar,
    officialFacts: source.officialFacts.map((fact) => ({ ...fact })),
    resolves: source.resolves.ar,
    evidenceRequestId: source.evidenceRequestId,
    forensicQuestionSetId: source.forensicQuestionSet,
    evidence: {
      id: request?.id ?? source.evidenceRequestId,
      timestamp: request?.timestamp ?? "",
      summary: request?.summary.ar ?? "",
    },
  };
}
function evaluateStateRepair(state: BankMatchState, repairId: BankRepairId) {
  const outcome = state.caseDefinition?.truthPackets[state.truthPacketId].repairOutcomes[repairId];
  if (!outcome) return evaluateRepairAgainstTruth(repairId, state.truthPacketId);
  return outcome === "proven"
    ? { outcome, delta: -8 as const, reason: "الدليل ثبت التفسير اللي اخترتوه." }
    : outcome === "refuted"
      ? { outcome, delta: 24 as const, reason: "الدليل نفى التفسير اللي اخترتوه." }
      : { outcome, delta: 10 as const, reason: "التفسير بقي ممكن، لكن فيه فجوة." };
}
function stateRuntimeEvidence(state: BankMatchState, repairId: BankRepairId): BankRepairBranch["evidence"] {
  if (!state.caseDefinition) return getBankRuntimeEvidence(state.truthPacketId, repairId);
  const branch = state.caseDefinition.repairBranches[repairId];
  const request = state.caseDefinition.evidenceRequests[branch.evidenceRequestId];
  const packet = state.caseDefinition.truthPackets[state.truthPacketId].evidenceByRequest[branch.evidenceRequestId];
  return {
    id: request?.id ?? branch.evidenceRequestId,
    timestamp: request?.timestamp ?? "",
    summary: [packet?.visual.ar, packet?.relevance.ar].filter(Boolean).join(" "),
  };
}
function buildStoryAssignments(players: readonly BankPlayerInput[]): readonly BankStoryAssignment[] {
  const locations: readonly BankStoryOption[] = [
    { id: "cafe_counter", label: "عند كاونتر المقهى", value: "cafe_counter" },
    { id: "parking_vehicle", label: "عند السيارة", value: "parking_vehicle" },
    { id: "petrol_station", label: "محطة البنزين", value: "petrol_station" },
    { id: "alley", label: "الزقاق", value: "alley" },
    { id: "cafe_entrance", label: "باب المقهى", value: "cafe_entrance" },
    { id: "nearby_street", label: "الشارع القريب", value: "nearby_street" },
  ];
  const playerOptions = players.map(({ id, name }) => ({ id, label: name, value: id }));
  const details = Array.from({ length: 6 }, (_, index): BankStoryAssignment => {
    const player = players[index % players.length]!;
    if (index === 0) return {
      ownerPlayerId: player.id,
      factKey: "near_bank_reason",
      prompt: "ليش كنتوا قريب من البنك؟",
      options: [
        { id: "cafe_before_road_trip", label: "قهوة قبل مشوار", value: "cafe_before_road_trip" },
        { id: "petrol_stop", label: "وقفة بنزين", value: "petrol_stop" },
        { id: "meet_near_cafe", label: "موعد قريب من المقهى", value: "meet_near_cafe" },
      ],
    };
    if (index === 1) return {
      ownerPlayerId: player.id,
      factKey: "vehicle_key_holder",
      prompt: "مين كان معه مفتاح السيارة؟",
      options: playerOptions,
    };
    if (index === 2) return {
      ownerPlayerId: player.id,
      factKey: "suspicious_object_holder",
      prompt: "مين كان معه الغرض المشبوه؟",
      options: playerOptions,
    };
    if (index === 3) return {
      ownerPlayerId: player.id,
      factKey: "departure_plan",
      prompt: "كيف كنتوا بتطلعون من المكان؟",
      options: [
        { id: "side_street", label: "الشارع الجانبي", value: "side_street" },
        { id: "main_street", label: "الشارع الرئيسي", value: "main_street" },
        { id: "return_to_cafe", label: "نرجع للمقهى", value: "return_to_cafe" },
      ],
    };
    if (index === 4) return {
      ownerPlayerId: player.id,
      factKey: "cafe_door_witness",
      prompt: "مين كان يقدر يشوف باب المقهى؟",
      options: playerOptions,
    };
    return {
      ownerPlayerId: player.id,
      factKey: "parking_camera_sightline",
      prompt: "مين كان يعرف خط رؤية كاميرا المواقف؟",
      options: playerOptions,
    };
  });
  return [
    ...players.map((player) => ({
      ownerPlayerId: player.id,
      factKey: `alarm_location:${player.id}`,
      prompt: `وين كان ${player.name} وقت الإنذار؟`,
      options: locations,
    })),
    ...details,
  ];
}
function appendEvent(state: BankMatchState, item: Omit<BankEvent, "id">): readonly BankEvent[] {
  return [...state.eventLedger, { ...item, id: `${state.matchId}:event:${state.eventLedger.length + 1}` }];
}
export function createBankMatch(input: {
  matchId: string;
  seed: string;
  players: readonly BankPlayerInput[];
  truthPacketId: BankTruthPacketId;
  caseDefinition?: BankRuntimeCaseDefinition;
}): BankMatchState {
  const orderedPlayers = input.players.slice().sort((a, b) => a.joinOrder - b.joinOrder);
  const assignments = Object.fromEntries(
    assignBankQuestions(orderedPlayers, input.caseDefinition).map((assignment) => [assignment.playerId, assignment]),
  );
  return {
    matchId: input.matchId,
    seed: input.seed,
    phase: "OPENING",
    phaseRevision: 0,
    players: orderedPlayers.map((player) => ({ ...player })),
    assignments,
    caseDefinition: input.caseDefinition ?? null,
    truthPacketId: input.truthPacketId,
    storyAssignments: buildStoryAssignments(orderedPlayers),
    storyFacts: {},
    storyLocked: false,
    answers: [],
    firstReveal: null,
    votes: {},
    selectedRepairId: null,
    repairEvaluation: null,
    suspicion: 24,
    suspicionAudit: null,
    verdict: null,
    rankings: [],
    rankingStatus: "pending",
    eventLedger: [],
  };
}
function requirePlayer(state: BankMatchState, playerId: string): void {
  if (!state.players.some(({ id }) => id === playerId)) throw new Error("Player is not in this match");
}
export function lockBankStoryFact(
  state: BankMatchState,
  input: { playerId: string; factKey: string; value: BankFactValue },
): BankMatchState {
  requirePlayer(state, input.playerId);
  if (state.phase !== "STORY_BUILDING") throw new Error("Story facts are not open");
  const assignment = state.storyAssignments.find(({ factKey }) => factKey === input.factKey);
  if (!assignment || assignment.ownerPlayerId !== input.playerId) {
    throw new Error("Story fact is not assigned to this player");
  }
  if (!assignment.options.some(({ value }) => value === input.value)) {
    throw new Error("Story value is not an authored option");
  }
  if (!input.factKey.trim() || Object.hasOwn(state.storyFacts, input.factKey)) {
    throw new Error("Story fact is invalid or already locked");
  }
  const storyFacts = { ...state.storyFacts, [input.factKey]: input.value };
  const next = {
    ...state,
    storyFacts,
    storyLocked: state.storyAssignments.every(({ factKey }) => Object.hasOwn(storyFacts, factKey)),
  };
  return {
    ...next,
    eventLedger: appendEvent(next, {
      type: "STORY_FACT_LOCKED",
      phase: next.phase,
      playerId: input.playerId,
      refs: [input.factKey],
      visibility: "public",
    }),
  };
}
export function lockBankStoryChoice(
  state: BankMatchState,
  input: { playerId: string; factKey: string; optionId: string },
): BankMatchState {
  const assignment = state.storyAssignments.find(({ factKey }) => factKey === input.factKey);
  const option = assignment?.options.find(({ id }) => id === input.optionId);
  if (!option) throw new Error("Story option is not allowed");
  return lockBankStoryFact(state, { playerId: input.playerId, factKey: input.factKey, value: option.value });
}
export function confirmBankStory(state: BankMatchState, playerId: string): BankMatchState {
  requirePlayer(state, playerId);
  if (state.phase !== "STORY_BUILDING") throw new Error("Story is not being built");
  if (!state.storyLocked) throw new Error("Every required story fact must be locked first");
  const recorded: BankMatchState = {
    ...state,
    eventLedger: appendEvent(state, {
      type: "STORY_LOCKED", phase: state.phase, playerId, refs: Object.keys(state.storyFacts), visibility: "public",
    }),
  };
  return advanceBankMatch(recorded);
}
export function lockBankAnswer(
  state: BankMatchState,
  input: BankLockedAnswer,
): BankMatchState {
  requirePlayer(state, input.playerId);
  const requiredPhase = input.phase === "first_investigation" ? "FIRST_QUESTION" : "FORENSIC_QUESTION";
  if (state.phase !== requiredPhase) throw new Error("Answers are not open for this investigation");
  const assignment = state.assignments[input.playerId];
  const expected = input.phase === "first_investigation"
    ? assignment?.firstQuestion.id
    : state.selectedRepairId
      ? assignment?.forensicQuestions[state.selectedRepairId].id
      : undefined;
  if (expected !== input.questionId) throw new Error("Question is not assigned to this player");
  const authoredOption = (input.phase === "first_investigation"
    ? assignment?.firstQuestion
    : state.selectedRepairId
      ? assignment?.forensicQuestions[state.selectedRepairId]
      : undefined)?.options.find(({ id }) => id === input.optionId);
  if (!authoredOption) throw new Error("Answer option is not allowed for this question");
  if (JSON.stringify(authoredOption.normalizedFacts) !== JSON.stringify(input.normalizedFacts)) {
    throw new Error("Answer facts do not match the authored option");
  }
  if (state.answers.some(({ playerId, phase }) => playerId === input.playerId && phase === input.phase)) {
    throw new Error("Answer is already locked");
  }
  const answer: BankLockedAnswer = {
    ...input,
    normalizedFacts: { ...input.normalizedFacts },
  };
  const next = { ...state, answers: [...state.answers, answer] };
  return {
    ...next,
    eventLedger: appendEvent(next, {
      type: "ANSWER_LOCKED",
      phase: next.phase,
      playerId: input.playerId,
      refs: [input.questionId],
      visibility: "private",
    }),
  };
}
export function revealBankIssue(state: BankMatchState, reveal: BankFirstReveal): BankMatchState {
  const next = { ...state, firstReveal: { ...reveal, sources: [...reveal.sources] }, suspicion: Math.min(100, state.suspicion + reveal.delta) };
  return {
    ...next,
    eventLedger: appendEvent(next, {
      type: "ISSUE_REVEALED",
      phase: "ISSUE_REVEAL",
      refs: [...reveal.sources],
      visibility: "public",
    }),
  };
}
export function adoptBankRepair(state: BankMatchState, repairId: BankRepairId): BankMatchState {
  if (state.selectedRepairId && state.selectedRepairId !== repairId) {
    throw new Error("The adopted repair cannot be rewritten");
  }
  const evaluation = evaluateStateRepair(state, repairId);
  const next = {
    ...state,
    selectedRepairId: repairId,
    repairEvaluation: evaluation,
    suspicion: Math.max(0, Math.min(100, state.suspicion + evaluation.delta)),
  };
  const adopted: BankMatchState = {
    ...next,
    eventLedger: appendEvent(next, {
      type: "REPAIR_ADOPTED",
      phase: next.phase,
      refs: [repairId],
      visibility: "public",
    }),
  };
  return repairBranch(state, repairId).officialFacts.reduce<BankMatchState>((current, fact) => ({
    ...current,
    eventLedger: appendEvent(current, {
      type: "REPAIR_FACT_APPLIED", phase: current.phase, refs: [fact.factKey, String(fact.value)], visibility: "public",
    }),
  }), adopted);
}
export function submitBankRepairVote(
  state: BankMatchState,
  input: { playerId: string; repairId: BankRepairId },
): BankMatchState {
  requirePlayer(state, input.playerId);
  if (state.phase !== "REPAIR_VOTE") throw new Error("Repair voting is closed");
  const votedState: BankMatchState = { ...state, votes: { ...state.votes, [input.playerId]: input.repairId } };
  const votes = votedState.votes;
  const recordedState: BankMatchState = {
    ...votedState,
    eventLedger: appendEvent(votedState, {
      type: "VOTE_UPDATED",
      phase: votedState.phase,
      playerId: input.playerId,
      refs: [input.repairId],
      visibility: "server",
    }),
  };
  const resolution = resolveRepairVote({
    playerIds: state.players.map(({ id }) => id),
    votes,
  });
  if (resolution.status === "locked") return advanceBankMatch(adoptBankRepair(recordedState, resolution.repairId));
  return recordedState;
}
function withPhase(state: BankMatchState, phase: BankPhase): BankMatchState {
  const next = { ...state, phase, phaseRevision: state.phaseRevision + 1 };
  return {
    ...next,
    eventLedger: appendEvent(next, {
      type: "PHASE_ADVANCED",
      phase,
      refs: [phase],
      visibility: "public",
    }),
  };
}
export function advanceBankMatch(state: BankMatchState): BankMatchState {
  if (state.phase === "OPENING") return withPhase(state, "STORY_BUILDING");
  if (state.phase === "STORY_BUILDING" && state.storyLocked) return withPhase(state, "FIRST_QUESTION");
  const firstCount = state.answers.filter(({ phase }) => phase === "first_investigation").length;
  if (state.phase === "FIRST_QUESTION" && firstCount === state.players.length) {
    const claims = state.answers
      .filter(({ phase }) => phase === "first_investigation")
      .flatMap((answer) => Object.entries(answer.normalizedFacts).map(([factKey, value]) => {
        const displayName = state.players.find(({ id }) => id === answer.playerId)?.name ?? answer.playerId;
        const location = value === "parking" ? "عند السيارة" : value === "cafe" ? "داخل المقهى" : "عند محطة البنزين";
        const normalizedFactKey = semanticFactKey(factKey);
        return {
          sourceId: answer.playerId,
          factKey: normalizedFactKey,
          value,
          statement: normalizedFactKey === "saud_location"
            ? `${displayName} قال إن سعود كان ${location} الساعة 11:42.`
            : `${displayName} ثبت معلومة عن ${factKey}.`,
        };
      }));
    const reveal = classifyFirstReveal({
      claims,
      unexplainedFacts: claims.length === 0
        ? [{ factKey: "missing_answers", explanation: "ما اكتملت معلومات كافية للتحقيق." }]
        : [{ factKey: "black_bag_route", explanation: "طريق الشنطة للمواقف بقي من دون تفسير." }],
    });
    return revealBankIssue(withPhase(state, "ISSUE_REVEAL"), reveal);
  }
  if (state.phase === "ISSUE_REVEAL" && state.firstReveal) return withPhase(state, "REPAIR_VOTE");
  if (state.phase === "REPAIR_VOTE" && state.selectedRepairId) return withPhase(state, "STORY_UPDATE");
  if (state.phase === "STORY_UPDATE" && state.selectedRepairId) {
    const evidence = stateRuntimeEvidence(state, state.selectedRepairId);
    const recorded: BankMatchState = {
      ...state,
      eventLedger: appendEvent(state, {
        type: "EVIDENCE_REVEALED", phase: "FORENSIC_QUESTION", refs: [evidence.id], visibility: "public",
      }),
    };
    return withPhase(recorded, "FORENSIC_QUESTION");
  }
  const forensicCount = state.answers.filter(({ phase }) => phase === "forensic_investigation").length;
  if (state.phase === "FORENSIC_QUESTION" && forensicCount === state.players.length) {
    return withPhase(evaluateBankForensics(state), "GROUP_VERDICT");
  }
  if (state.phase === "GROUP_VERDICT" && state.verdict) return withPhase(state, "PLAYER_RANKING");
  return state;
}
function semanticFactKey(key: string): string {
  if (key.includes("location:saud") || key.includes("observed-location:saud")) return "saud_location";
  if (key.includes("bag")) return "bag_holder";
  if (key.includes("key") || key.includes("reflective-tag") || key.includes("carry")) return "key_holder";
  if (key.includes("route")) return "route";
  if (key.includes("doorway-figure") || key.includes("arrival-person") || key.includes("crossing-person")) return "doorway_person";
  if (key.includes("door-witness") || key.includes("door-stay")) return "door_witness";
  if (key.includes("saud-moved") || key.includes("saud_stayed") || key.includes("saud_departure")) return "saud_movement";
  if (key.includes("parking_camera_sightline")) return "parking_sightline";
  if (key === "person") return "person";
  return key;
}
function semanticFacts(facts: Readonly<Record<string, BankFactValue>>): Readonly<Record<string, BankFactValue>> {
  return Object.fromEntries(Object.entries(facts).map(([key, value]) => {
    const semanticKey = semanticFactKey(key);
    const semanticValue = key.includes("saud_stayed_at_car") && typeof value === "string" && /^(saud|yazid|fahad|rakan|nawaf|joud)$/.test(value)
      ? value === "saud" ? "no" : "yes"
      : value;
    return [semanticKey, semanticValue];
  }));
}
function comparableFactFit(
  actualFacts: Readonly<Record<string, BankFactValue>>,
  referenceFacts: Readonly<Record<string, BankFactValue>>,
): BankFit | undefined {
  const actual = semanticFacts(actualFacts);
  const reference = semanticFacts(referenceFacts);
  const comparisons = Object.entries(actual).flatMap(([key, value]) =>
    Object.hasOwn(reference, key) ? [reference[key] === value] : [],
  );
  if (comparisons.length === 0) return undefined;
  if (comparisons.every(Boolean)) return 1;
  if (comparisons.some(Boolean)) return 0.5;
  return 0;
}
function fitFacts(actual: Readonly<Record<string, BankFactValue>>, reference: Readonly<Record<string, BankFactValue>>): BankFit {
  return comparableFactFit(actual, reference) ?? 0.5;
}
function roleId(state: BankMatchState, playerId: BankFactValue | undefined): BankFactValue {
  if (playerId === undefined) return null;
  if (typeof playerId !== "string") return playerId;
  const index = state.players.findIndex(({ id }) => id === playerId);
  return ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"][index] ?? playerId;
}
function storyReferenceFacts(state: BankMatchState): Readonly<Record<string, BankFactValue>> {
  const location = state.storyFacts[`alarm_location:${state.players[0]!.id}`];
  const normalizedLocation = location === "parking_vehicle" ? "parking" : location === "cafe_counter" ? "cafe" : location;
  return {
    saud_location: normalizedLocation ?? null,
    key_holder: roleId(state, state.storyFacts.vehicle_key_holder),
    bag_holder: roleId(state, state.storyFacts.suspicious_object_holder),
    door_witness: roleId(state, state.storyFacts.cafe_door_witness),
    parking_sightline: roleId(state, state.storyFacts.parking_camera_sightline),
  };
}
function storyFit(answer: BankLockedAnswer, storyFacts: Readonly<Record<string, BankFactValue>>, predicate: BankQuestion["checks"]["storyOptionFits"]): BankFit | undefined {
  if (!predicate) return comparableFactFit(answer.normalizedFacts, storyFacts);
  const referenceValue = storyFacts[predicate.referenceFactKey];
  return referenceValue === undefined || referenceValue === null
    ? undefined : predicate.byOptionId[answer.optionId]?.[String(referenceValue)];
}
function evidenceFit(state: BankMatchState, answer: BankLockedAnswer, repairId: BankRepairId, predicate: BankQuestion["checks"]["evidenceOptionFitsByPacket"]): BankFit | undefined {
  return predicate ? predicate[state.truthPacketId]?.[answer.optionId]
    : comparableFactFit(answer.normalizedFacts, evidenceReferenceFacts(state, repairId));
}
function linkedFit(
  state: BankMatchState,
  answer: BankLockedAnswer,
  phase: BankAnswerPhase,
  linkedRef?: string,
  linkedOptionMatches?: Readonly<Record<string, readonly string[]>>,
): BankFit | undefined {
  const linkedRole = linkedRef?.match(/(?:^|[|,\s])linked\.([a-z][\w-]*)/i)?.[1]?.toLowerCase();
  const roleIndex = ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"].indexOf(linkedRole ?? "");
  if (roleIndex < 0) return undefined;
  const targetPlayerId = state.players[roleIndex]?.id;
  if (!targetPlayerId || targetPlayerId === answer.playerId) return undefined;
  const target = state.answers.find((candidate) =>
    candidate.phase === phase && candidate.playerId === targetPlayerId,
  );
  if (!target) return undefined;
  if (linkedOptionMatches) {
    const authoredMatches = linkedOptionMatches[answer.optionId];
    return authoredMatches ? authoredMatches.includes(target.optionId) ? 1 : 0 : undefined;
  }
  const ownFacts = semanticFacts(answer.normalizedFacts);
  const linked = Object.entries(semanticFacts(target.normalizedFacts))
    .filter(([key]) => Object.hasOwn(ownFacts, key));
  if (linked.length === 0) return undefined;
  return linked.every(([key, value]) => ownFacts[key] === value) ? 1 : 0;
}
function evidenceReferenceFacts(state: BankMatchState, repairId: BankRepairId): Readonly<Record<string, BankFactValue>> {
  const packet = state.truthPacketId;
  if (packet === "ambiguous") return {};
  const movementTrue = packet === "movement_true";
  if (repairId === "movement") return movementTrue
    ? { route: "sidewalk", doorway_person: "saud", bag_holder: "fahad", key_holder: "key_only", saud_movement: "saud" }
    : { route: "no_parking_movement", doorway_person: "nawaf", bag_holder: "fahad", saud_movement: "no" };
  return movementTrue
    ? { route: "sidewalk", doorway_person: "saud", bag_holder: "fahad", key_holder: "saud", saud_movement: "yes" }
    : { route: "no_parking_movement", doorway_person: "nawaf", bag_holder: "fahad", key_holder: "saud", saud_movement: "no" };
}
function repairReferenceFacts(state: BankMatchState, repairId: BankRepairId): Readonly<Record<string, BankFactValue>> {
  const branchFacts = Object.fromEntries(repairBranch(state, repairId).officialFacts.map(({ factKey, value }) => [factKey, value]));
  return repairId === "movement"
    ? { ...branchFacts, route: "sidewalk", doorway_person: "saud", door_witness: "nawaf", bag_holder: "fahad", key_holder: "key_only", saud_movement: "saud" }
    : { ...branchFacts, route: "no_parking_movement", doorway_person: "nawaf", door_witness: "nawaf", bag_holder: "fahad", key_holder: "saud", saud_movement: "no" };
}
export function evaluateBankForensics(state: BankMatchState): BankMatchState {
  if (state.suspicionAudit) return state;
  if (!state.firstReveal || !state.selectedRepairId || !state.repairEvaluation) {
    throw new Error("The reveal and adopted repair must be recorded before forensic scoring");
  }
  const answers = state.answers.filter(({ phase }) => phase === "forensic_investigation");
  if (answers.length !== state.players.length) throw new Error("Every forensic answer must be locked");
  const issues = answers.flatMap((answer) =>
    fitFacts(answer.normalizedFacts, repairReferenceFacts(state, state.selectedRepairId!)) < 1
      ? [{ independentFactKey: answer.questionId, sourceId: answer.playerId }]
      : [],
  );
  // The residual bag photo is scored from its own locked fact, never from the repair
  // outcome or the number of unrelated route/identity mistakes.
  const residualBag = answers
    .map((answer) => semanticFacts(answer.normalizedFacts).bag_holder)
    .find((value) => value !== undefined);
  const residualOutcome = residualBag === "fahad"
    ? "explained" as const
    : residualBag === "car"
      ? "gap" as const
      : "direct_conflict" as const;
  const audit = scoreSuspicionBaskets({
    initialSuspicion: 24,
    firstReveal: {
      outcome: state.firstReveal.kind,
      factKey: state.firstReveal.sources.join(":") || "unexplained_gap",
    },
    repairTest: {
      outcome: state.repairEvaluation.outcome,
      evidenceIds: [repairBranch(state, state.selectedRepairId).evidenceRequestId],
    },
    forensicAnswers: { issues },
    residualEvidence: {
      outcome: residualOutcome,
      evidenceIds: ["residual_black_bag_photo"],
    },
  });
  const scored = { ...state, suspicion: audit.finalSuspicion, suspicionAudit: audit };
  return audit.entries.reduce<BankMatchState>((current, entry) => ({
    ...current,
    eventLedger: appendEvent(current, {
      type: "SUSPICION_APPLIED", phase: current.phase, refs: [entry.basket, String(entry.delta), entry.reasonCode], visibility: "public",
    }),
  }), scored);
}
export function deriveBankScoreChecks(
  state: BankMatchState,
): Readonly<Record<string, Partial<Record<BankScoreCheckKey, BankScoreCheck>>>> {
  const repairId = state.selectedRepairId;
  const storyFacts = storyReferenceFacts(state);
  return Object.fromEntries(state.players.map((player) => {
    const first = state.answers.find(({ playerId, phase }) => playerId === player.id && phase === "first_investigation");
    const forensic = state.answers.find(({ playerId, phase }) => playerId === player.id && phase === "forensic_investigation");
    if (!first || !forensic || !repairId) return [player.id, {}];
    const firstQuestion = state.assignments[player.id]!.firstQuestion;
    const forensicQuestion = state.assignments[player.id]!.forensicQuestions[repairId];
    const firstStoryFit = storyFit(first, storyFacts, firstQuestion.checks.storyOptionFits);
    const forensicRepairFit = fitFacts(forensic.normalizedFacts, repairReferenceFacts(state, repairId));
    const forensicEvidenceFit = evidenceFit(state, forensic, repairId, forensicQuestion.checks.evidenceOptionFitsByPacket);
    const firstLinkedRef = firstQuestion.checks.firstLinkedRef;
    const finalLinkedRef = forensicQuestion.checks.finalLinkedRef;
    const firstLinkedFit = linkedFit(state, first, "first_investigation", firstLinkedRef, firstQuestion.checks.linkedOptionMatches);
    const forensicLinkedFit = linkedFit(state, forensic, "forensic_investigation", finalLinkedRef, forensicQuestion.checks.linkedOptionMatches);
    return [player.id, {
      ...(firstStoryFit === undefined || !firstQuestion.checks.storyRef ? {} : { firstStoryFit: { fit: firstStoryFit, ref: firstQuestion.checks.storyRef } }),
      ...(firstLinkedFit === undefined ? {} : { firstLinkedFit: { fit: firstLinkedFit, ref: firstLinkedRef! } }),
      forensicRepairFit: { fit: forensicRepairFit, ref: forensicQuestion.checks.repairRef! },
      ...(forensicEvidenceFit === undefined || !forensicQuestion.checks.evidenceRef ? {} : { forensicEvidenceFit: { fit: forensicEvidenceFit, ref: forensicQuestion.checks.evidenceRef } }),
      ...(forensicLinkedFit === undefined ? {} : { forensicLinkedFit: { fit: forensicLinkedFit, ref: finalLinkedRef! } }),
    }];
  }));
}
export function finalizeBankMatch(
  state: BankMatchState,
  checksByPlayer: Readonly<Record<string, Partial<Record<BankScoreCheckKey, BankScoreCheck>>>> = deriveBankScoreChecks(state),
): BankMatchState {
  if (state.phase !== "GROUP_VERDICT") throw new Error("The verdict is not ready");
  const scoreLabel: Readonly<Record<BankScoreCheckKey, string>> = {
    firstStoryFit: "حافظ على الرواية الأساسية",
    firstLinkedFit: "ربط إجابته الأولى بكلام زميله",
    forensicRepairFit: "التزم بالإصلاح المختار",
    forensicEvidenceFit: "ركّب إجابته على الدليل الجنائي",
    forensicLinkedFit: "ثبّت العلاقة الأخيرة بين الإجابات",
  };
  const ranked = state.players
    .map((player) => {
      const result = scoreBankPlayer({ playerId: player.id, checks: checksByPlayer[player.id] ?? {} });
      return {
      playerId: player.id,
      displayName: player.name,
      score: result.score,
      reason: result.status === "complete" && result.strongestContribution
        ? scoreLabel[result.strongestContribution.check]
        : "ما اكتملت بيانات كافية لسبب عادل",
      explanation: result.status === "complete" && result.strongestDeduction
        ? `لكن أكبر خصم جاء من: ${scoreLabel[result.strongestDeduction.check]}.`
        : result.status === "complete"
          ? "ما عليه خصم مسجل في الفحوص الخمسة."
          : "تعذر حساب ترتيب عادل لأن واحدًا أو أكثر من الفحوص الخمسة ناقص.",
      joinOrder: player.joinOrder,
      contributionRef: result.status === "complete" ? result.strongestContribution?.ref : undefined,
      deductionRef: result.status === "complete" ? result.strongestDeduction?.ref : undefined,
    };})
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.joinOrder - b.joinOrder)
  const rankings = ranked.map(({ joinOrder: _joinOrder, contributionRef: _contributionRef, deductionRef: _deductionRef, ...ranking }) => ({
    ...ranking,
    sharedRank: ranking.score === null
      ? null
      : (ranked.findIndex(({ score }) => score === ranking.score) + 1),
  }));
  const next = {
    ...state,
    verdict: {
      suspicion: state.suspicion,
      outcome: state.suspicion < 85 ? "survived" as const : "failed" as const,
      band: state.suspicion === 100 ? "exposed" as const : state.suspicion >= 85 ? "collapsed" as const : state.suspicion >= 60 ? "monitored" as const : state.suspicion >= 30 ? "suspected" as const : "clean" as const,
    },
    rankings,
    rankingStatus: rankings.some(({ score }) => score === null) ? "incomplete" as const : "complete" as const,
  };
  const scored = rankings.reduce<BankMatchState>((current, ranking) => {
    const source = ranked.find(({ playerId }) => playerId === ranking.playerId)!;
    return {
      ...current,
      eventLedger: appendEvent(current, {
        type: "SCORE_CALCULATED", phase: current.phase, playerId: ranking.playerId,
        refs: [
          ranking.score === null ? "incomplete" : String(ranking.score),
          ...(source.contributionRef ? [source.contributionRef] : []),
          ...(source.deductionRef ? [source.deductionRef] : []),
        ], visibility: "private",
      }),
    };
  }, next);
  const recorded: BankMatchState = {
    ...scored,
    eventLedger: appendEvent(scored, {
      type: "VERDICT_CALCULATED",
      phase: scored.phase,
      refs: [String(scored.suspicion), scored.verdict!.band],
      visibility: "public",
    }),
  };
  return {
    ...recorded,
    eventLedger: appendEvent(recorded, {
      type: "RANKING_CALCULATED", phase: recorded.phase, refs: [recorded.rankingStatus], visibility: "server",
    }),
  };
}
export interface BankPublicView {
  matchId: string;
  phase: BankPhase;
  phaseRevision: number;
  players: readonly { id: string; displayName: string; isHost: boolean }[];
  storyFacts: Readonly<Record<string, BankFactValue>>;
  progress: { required: number; firstAnswers: number; forensicAnswers: number; votes: number };
  suspicion: number;
  reveal: BankFirstReveal | null;
  repairs: readonly BankRepairBranch[];
  selectedRepair: BankRepairBranch | null;
  evidence: BankRepairBranch["evidence"] | null;
  verdict: BankMatchState["verdict"];
  rankings: BankMatchState["rankings"];
  rankingStatus: BankMatchState["rankingStatus"];
}
export function toBankPublicView(state: BankMatchState): BankPublicView {
  const repairsVisible = ["ISSUE_REVEAL", "REPAIR_VOTE"].includes(state.phase);
  const selectedRepairVisible = [
    "STORY_UPDATE",
    "FORENSIC_QUESTION",
    "GROUP_VERDICT",
    "PLAYER_RANKING",
  ].includes(state.phase);
  const selectedRepair = selectedRepairVisible && state.selectedRepairId
    ? repairBranch(state, state.selectedRepairId)
    : null;
  const evidenceVisible = ["FORENSIC_QUESTION", "GROUP_VERDICT", "PLAYER_RANKING"].includes(state.phase);
  const repairedStoryVisible = selectedRepairVisible && state.selectedRepairId;
  const storyFacts = repairedStoryVisible
    ? Object.fromEntries([
        ...Object.entries(state.storyFacts),
        ...repairBranch(state, state.selectedRepairId!).officialFacts.map(({ factKey, value }) => [factKey, value] as const),
      ])
    : { ...state.storyFacts };
  return {
    matchId: state.matchId,
    phase: state.phase,
    phaseRevision: state.phaseRevision,
    players: state.players.map(({ id, name, isHost }) => ({ id, displayName: name, isHost })),
    storyFacts,
    progress: {
      required: state.players.length,
      firstAnswers: state.answers.filter(({ phase }) => phase === "first_investigation").length,
      forensicAnswers: state.answers.filter(({ phase }) => phase === "forensic_investigation").length,
      votes: Object.keys(state.votes).length,
    },
    suspicion: state.suspicion,
    reveal: state.firstReveal ? { ...state.firstReveal, sources: [...state.firstReveal.sources] } : null,
    repairs: repairsVisible ? (["movement", "identity"] as const).map((id) => repairBranch(state, id)) : [],
    selectedRepair,
    evidence: evidenceVisible && state.selectedRepairId
      ? stateRuntimeEvidence(state, state.selectedRepairId)
      : null,
    verdict: state.phase === "GROUP_VERDICT" || state.phase === "PLAYER_RANKING" ? state.verdict : null,
    rankings: state.phase === "PLAYER_RANKING" ? state.rankings.map((item) => ({ ...item })) : [],
    rankingStatus: state.phase === "PLAYER_RANKING" ? state.rankingStatus : "pending",
  };
}
export interface BankPrivateView {
  playerId: string;
  phase: BankPhase;
  storyAssignments: readonly BankStoryAssignment[];
  question: BankQuestion | null;
  lockedAnswer: BankLockedAnswer | null;
  lockedVote: BankRepairId | null;
  allowedActions: readonly ("LOCK_STORY_FACT" | "LOCK_ANSWER" | "VOTE_REPAIR" | "WAIT")[];
}

export function toBankPrivateView(state: BankMatchState, playerId: string): BankPrivateView | null {
  const player = state.players.find(({ id }) => id === playerId);
  const assignment = state.assignments[playerId];
  if (!player || !assignment) return null;
  const answerPhase: BankAnswerPhase | null = state.phase === "FIRST_QUESTION"
    ? "first_investigation"
    : state.phase === "FORENSIC_QUESTION"
      ? "forensic_investigation"
      : null;
  const question = state.phase === "FIRST_QUESTION"
    ? assignment.firstQuestion
    : state.phase === "FORENSIC_QUESTION" && state.selectedRepairId
      ? assignment.forensicQuestions[state.selectedRepairId]
      : null;
  const lockedAnswer = answerPhase
    ? state.answers.find((answer) => answer.playerId === playerId && answer.phase === answerPhase) ?? null
    : null;
  let allowedActions: BankPrivateView["allowedActions"] = ["WAIT"];
  if (state.phase === "STORY_BUILDING") allowedActions = ["LOCK_STORY_FACT"];
  else if (question && !lockedAnswer) allowedActions = ["LOCK_ANSWER"];
  else if (state.phase === "REPAIR_VOTE") allowedActions = ["VOTE_REPAIR"];
  return {
    playerId,
    phase: state.phase,
    storyAssignments: state.phase === "STORY_BUILDING"
      ? state.storyAssignments
          .filter(({ ownerPlayerId }) => ownerPlayerId === playerId)
          .map((item) => ({
            ...item,
            options: item.options.map((option) => ({ ...option })),
          }))
      : [],
    question,
    lockedAnswer: lockedAnswer ? { ...lockedAnswer, normalizedFacts: { ...lockedAnswer.normalizedFacts } } : null,
    lockedVote: state.votes[playerId] ?? null,
    allowedActions,
  };
}
