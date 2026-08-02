import { describe, expect, it } from "vitest";
import {
  adoptWarehousePatch,
  advanceWarehousePhase,
  calculateWarehouseScore,
  confirmWarehouseStory,
  createWarehouseCase,
  detectWarehouseIssues,
  evaluateWarehouseChapterIssues,
  expireWarehouseAdvisoryDeadline,
  isWarehouseQuestionActivatedByPatch,
  resolveRankedBallots,
  skipDisconnectedWarehousePlayer,
  startWarehouseQuestion,
  disconnectWarehousePlayer,
  toWarehousePrivateView,
  toWarehousePublicView,
  type WarehouseCaseDefinition,
  type WarehousePatchOption,
} from "../src";

const players = ["p1", "p2", "p3", "p4"].map((id, joinOrder) => ({
  id,
  name: id.toUpperCase(),
  joinOrder,
  connected: true,
}));

const story = {
  entryReason: "check_inventory_mismatch" as const,
  entryRoute: "side_door" as const,
  keyHolderInitial: "p1",
  location2346: {
    p1: "admin_office",
    p2: "parking",
    p3: "inventory_room",
    p4: "loading_area",
  } as const,
  carPurpose: "collect_shipment" as const,
  carDepartureExpected: true,
};

const label = { ar: "نص" };
const makeQuestions = (chapter: "power" | "device" | "car") =>
  (["P1", "P2", "P3", "P4"] as const).map((seat) => ({
    id: `${chapter}-${seat}`,
    chapter,
    seat,
    answerKind: "YES_NO" as const,
    prompt: label,
    options: [
      { id: "yes", value: true, label },
      { id: "no", value: false, label },
    ],
    outputFactKey: `${chapter}.${seat}`,
    comparisonTargets: [`${chapter}.story`],
    compatibilityRule: "equal",
    conflictRule: "not_equal",
    relevance: ["evidence", "result"] as const,
  }));
const patchMetadata = {
  publicLabel: label,
  description: label,
  solves: label,
  nextPressure: label,
};
const definition = {
  id: "warehouse",
  version: "1",
  title: label,
  pitch: label,
  premise: label,
  complexity: label,
  durationMinutes: [25, 30],
  supportedPlayerCounts: [4],
  storyOptions: {
    entryReasons: [{ id: "check_inventory_mismatch", label }],
    entryRoutes: [{ id: "side_door", label }],
    locations: [
      { id: "admin_office", label },
      { id: "parking", label },
      { id: "inventory_room", label },
      { id: "loading_area", label },
    ],
    carPurposes: [{ id: "collect_shipment", label }],
  },
  chapters: {
    power: {
      id: "power",
      evidence: {
        id: "gate",
        chapter: "power",
        title: label,
        detail: label,
        timestamp: "23:47",
        factKey: "gate",
        value: true,
        pressureKey: "gate",
      },
      issueIds: ["power-issue"],
      patchOptionIds: ["power-a", "power-b"],
    },
    device: {
      id: "device",
      evidence: {
        id: "device",
        chapter: "device",
        title: label,
        detail: label,
        timestamp: "23:48",
        factKey: "device",
        value: true,
        pressureKey: "device",
      },
      issueIds: ["device-issue"],
      patchOptionIds: ["device-a", "device-b"],
    },
    car: {
      id: "car",
      evidence: {
        id: "car",
        chapter: "car",
        title: label,
        detail: label,
        timestamp: "00:01",
        factKey: "car",
        value: true,
        pressureKey: "car",
      },
      issueIds: ["car-issue"],
      patchOptionIds: ["car-a", "car-b"],
    },
  },
  questionMatrix: {
    4: {
      power: makeQuestions("power"),
      device: makeQuestions("device"),
      car: makeQuestions("car"),
    },
  },
  issues: (["power", "device", "car"] as const).map((chapter) => ({
    id: `${chapter}-issue`,
    chapter,
    type: "UNEXPLAINED_EVIDENCE" as const,
    severity: 5,
    independentKey: chapter,
    factRefs: [chapter],
    patchOptionIds: [`${chapter}-a`, `${chapter}-b`],
    publicTitle: label,
    publicExplanation: label,
  })),
  patchOptions: (["power", "device", "car"] as const).flatMap((chapter) =>
    ["a", "b"].map((suffix) => ({
      id: `${chapter}-${suffix}`,
      chapter,
      resolvesIssueIds: [`${chapter}-issue`],
      factsAfter: [{ key: `${chapter}.resolved`, value: suffix }],
      commitments:
        chapter === "car"
          ? []
          : [
              {
                id: `${chapter}-${suffix}-commit`,
                factKey: `${chapter}.resolved`,
                expectedValue: suffix,
                testChapter: chapter === "power" ? ("device" as const) : ("car" as const),
                status: "pending" as const,
              },
            ],
      laterEffects:
        chapter === "car"
          ? []
          : [
              {
                chapter: chapter === "power" ? ("device" as const) : ("car" as const),
                selectorKey: `${chapter}.resolved`,
              },
            ],
      newFactCount: 1,
      changedFactCount: 0,
      ...patchMetadata,
    })),
  ),
  resultBands: [{ id: "all", min: 0, max: 100, label, summary: label }],
  copy: {
    silentPhaseIntro: label,
    advisoryWaiting: label,
    fairScoreUnavailable: label,
    noDirectContradiction: label,
  },
} satisfies WarehouseCaseDefinition;

describe("Warehouse Case V1 state and assignments", () => {
  it("starts in an explicit story phase with one structured question per seat and chapter", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });

    expect(state.phase).toBe("STORY_BUILDING");
    expect(state.chapter).toBe("story");
    expect(Object.values(state.questionAssignments)).toHaveLength(12);
    expect(
      Object.values(state.questionAssignments).every(
        (assignment) =>
          assignment.outputFactKey.length > 0 &&
          assignment.comparisonTargets.length > 0 &&
          assignment.relevance.length > 0,
      ),
    ).toBe(true);
    expect(state.players.map((player) => player.seat)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(toWarehousePrivateView(state, "p1", true)?.allowedActions).toContain("SUBMIT_STORY");
    expect(toWarehousePrivateView(state, "p2", false)?.allowedActions).toEqual(["SET_STORY"]);
  });

  it("treats deadline expiry as advisory and fabricates neither answers nor transitions", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const answering = {
      ...state,
      phase: "SILENT_ANSWERING" as const,
      chapter: "power" as const,
      advisoryDeadlineAt: 2_000,
    };

    const waiting = advanceWarehousePhase(answering, definition, 1_500);
    const expired = expireWarehouseAdvisoryDeadline(waiting, 2_001);

    expect(waiting.advisoryDeadlineAt).toBe(2_000);
    expect(expired).not.toBe(waiting);
    expect(expired.phase).toBe("WAITING_FOR_ANSWERS");
    expect(expired.lockedAnswers).toEqual([]);
    expect(expired.advisoryExpired).toBe(true);
  });

  it("keeps each private question out of the view until that player starts it", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const intro = {
      ...state,
      phase: "SILENT_PHASE_INTRO" as const,
      chapter: "power" as const,
    };

    const firstStarted = startWarehouseQuestion(intro, "p1", 2_000);
    const answering = {
      ...firstStarted,
      phase: "SILENT_ANSWERING" as const,
    };

    expect(toWarehousePrivateView(answering, "p1")?.question?.playerId).toBe("p1");
    expect(toWarehousePrivateView(answering, "p2")?.question).toBeNull();
    expect(toWarehousePrivateView(intro, "p2")?.allowedActions).toEqual(["START_QUESTION"]);
  });

  it("waits for every required player to start before revealing chapter context", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    let intro = {
      ...state,
      phase: "SILENT_PHASE_INTRO" as const,
      chapter: "power" as const,
    };

    for (const player of players.slice(0, -1)) {
      intro = startWarehouseQuestion(intro, player.id, 2_000);
    }
    expect(intro.phase).toBe("SILENT_PHASE_INTRO");

    const context = startWarehouseQuestion(intro, players.at(-1)!.id, 2_100);
    expect(context.phase).toBe("CHAPTER_CONTEXT");
    expect(context.questionStartedPlayerIds).toEqual(players.map((player) => player.id));
  });

  it("requires every player to confirm each story update before the next silent intro", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    let update = {
      ...state,
      phase: "STORY_UPDATE" as const,
      chapter: "power" as const,
      storyConfirmedPlayerIds: [] as string[],
    };

    for (const player of players.slice(0, -1)) {
      update = confirmWarehouseStory(update, player.id, 2_000);
    }
    expect(advanceWarehousePhase(update, definition, 2_100)).toBe(update);

    const allConfirmed = confirmWarehouseStory(update, players.at(-1)!.id, 2_200);
    const next = advanceWarehousePhase(allConfirmed, definition, 2_300);
    expect(next.phase).toBe("SILENT_PHASE_INTRO");
    expect(next.chapter).toBe("device");
    expect(next.storyConfirmedPlayerIds).toEqual([]);
  });

  it("initializes an immutable ledger with world, story, and question assignment events", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });

    expect(state.eventLedger.filter((item) => item.type === "WORLD_FACT_REVEALED")).toHaveLength(3);
    expect(state.eventLedger.some((item) => item.type === "STORY_FACT_SET")).toBe(true);
    expect(state.eventLedger.filter((item) => item.type === "QUESTION_ASSIGNED")).toHaveLength(12);
    expect(new Set(state.eventLedger.map((item) => item.id)).size).toBe(state.eventLedger.length);
  });
});

describe("Warehouse Case V1 issues and ballots", () => {
  it("preserves all four issue types and reveals only two independent high-priority issues", () => {
    const issues = detectWarehouseIssues([
      {
        id: "minor",
        type: "STORY_GAP",
        chapter: "power",
        severity: 1,
        independentKey: "minor",
        factRefs: ["x"],
      },
      {
        id: "direct",
        type: "DIRECT_CONTRADICTION",
        chapter: "power",
        severity: 8,
        independentKey: "location",
        factRefs: ["a", "b"],
      },
      {
        id: "evidence",
        type: "EVIDENCE_CONFLICT",
        chapter: "power",
        severity: 9,
        independentKey: "gate",
        factRefs: ["c", "d"],
      },
      {
        id: "unexplained",
        type: "UNEXPLAINED_EVIDENCE",
        chapter: "power",
        severity: 7,
        independentKey: "gate",
        factRefs: ["e"],
      },
    ]);

    expect(issues.map((issue) => issue.type)).toEqual([
      "EVIDENCE_CONFLICT",
      "DIRECT_CONTRADICTION",
    ]);
  });

  it("detects a direct issue only from incompatible linked structured facts", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const p1 = state.questionAssignments["power:P1"]!;
    const p2 = state.questionAssignments["power:P2"]!;
    const directDefinition = {
      ...definition,
      issues: [
        ...definition.issues,
        {
          id: "power-direct",
          chapter: "power" as const,
          type: "DIRECT_CONTRADICTION" as const,
          severity: 9,
          independentKey: "power.location",
          factRefs: [p1.outputFactKey, p2.outputFactKey],
          patchOptionIds: ["power-a", "power-b"],
          publicTitle: label,
          publicExplanation: label,
        },
      ],
    };
    const compared = {
      ...state,
      questionAssignments: {
        ...state.questionAssignments,
        "power:P1": {
          ...p1,
          comparisonTargets: [p2.outputFactKey],
          conflictRule: "different_location",
        },
        "power:P2": {
          ...p2,
          comparisonTargets: [p1.outputFactKey],
          conflictRule: "different_location",
        },
      },
      lockedAnswers: [
        {
          playerId: "p1",
          questionInstanceId: p1.instanceId,
          questionId: p1.id,
          chapter: "power" as const,
          fact: { key: p1.outputFactKey, value: true },
          lockedAt: 1,
        },
        {
          playerId: "p2",
          questionInstanceId: p2.instanceId,
          questionId: p2.id,
          chapter: "power" as const,
          fact: { key: p2.outputFactKey, value: false },
          lockedAt: 1,
        },
      ],
    };

    expect(evaluateWarehouseChapterIssues(compared, directDefinition, "power")[0]).toMatchObject({
      type: "DIRECT_CONTRADICTION",
      attribution: {
        sourcePlayerId: "p1",
        targetPlayerId: "p2",
        sourceFactKey: p1.outputFactKey,
        targetFactKey: p2.outputFactKey,
        sourceValue: true,
        targetValue: false,
      },
    });
  });

  it("keeps a consistent path free of fabricated direct/evidence conflict", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });

    expect(evaluateWarehouseChapterIssues(state, definition, "power").map((issue) => issue.type)).toEqual([
      "UNEXPLAINED_EVIDENCE",
    ]);
  });

  it("returns no issue when the car evidence is fully explained", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });

    expect(
      evaluateWarehouseChapterIssues(
        {
          ...state,
          derivedFacts: { car_departure_reason: "planned_departure" },
        },
        definition,
        "car",
      ),
    ).toEqual([]);
  });

  it("reruns a first tie and uses the conservative patch after a second tie", () => {
    const options: WarehousePatchOption[] = [
      {
        id: "complex",
        chapter: "power",
        resolvesIssueIds: ["issue"],
        factsAfter: [{ key: "gate_open_reason", value: "fetch_tool" }],
        commitments: [],
        laterEffects: [{ chapter: "device", selectorKey: "movement" }],
        newFactCount: 2,
        changedFactCount: 2,
        ...patchMetadata,
      },
      {
        id: "conservative",
        chapter: "power",
        resolvesIssueIds: ["issue"],
        factsAfter: [{ key: "gate_open_reason", value: "manual_reset" }],
        commitments: [],
        laterEffects: [{ chapter: "device", selectorKey: "key_used_after_outage" }],
        newFactCount: 1,
        changedFactCount: 1,
        ...patchMetadata,
      },
    ];
    const ballots = players.map((player, index) => ({
      playerId: player.id,
      rankedOptionIds:
        index % 2 === 0 ? ["complex", "conservative"] : ["conservative", "complex"],
    }));

    expect(resolveRankedBallots(options, ballots, 0)).toEqual({
      status: "rerun",
      tiedOptionIds: ["complex", "conservative"],
    });
    expect(resolveRankedBallots(options, ballots, 1)).toEqual({
      status: "adopted",
      patchId: "conservative",
      reason: "SECOND_TIE_CONSERVATIVE",
    });
  });
});

describe("Warehouse Case V1 privacy and disconnect authority", () => {
  it("keeps private questions and ballots out of the public allowlist view", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const publicJson = JSON.stringify(toWarehousePublicView(state, definition));
    const privateView = toWarehousePrivateView(
      {
        ...state,
        chapter: "power",
        phase: "SILENT_ANSWERING",
        questionStartedPlayerIds: ["p1"],
      },
      "p1",
    );

    expect(publicJson).not.toContain("questionAssignments");
    expect(publicJson).not.toContain("lockedAnswers");
    expect(privateView?.question?.playerId).toBe("p1");
  });

  it("exposes current chapter issues separately from complete safe result history", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const directIssue = {
      id: "power-direct",
      chapter: "power" as const,
      type: "DIRECT_CONTRADICTION" as const,
      severity: 9,
      independentKey: "power-direct",
      factRefs: ["a", "b"],
    };
    const resultDefinition = {
      ...definition,
      issues: [
        ...definition.issues,
        {
          ...directIssue,
          patchOptionIds: ["power-a", "power-b"],
          publicTitle: label,
          publicExplanation: label,
        },
      ],
    };
    const resultView = toWarehousePublicView(
      {
        ...state,
        chapter: "result",
        phase: "RESULT_REVEAL",
        issueLedger: [directIssue, ...state.issueLedger, ...definition.issues.slice(1, 3)],
      },
      resultDefinition,
    );

    expect(resultView.revealedIssues).toEqual([]);
    expect(resultView.issueHistory).toHaveLength(3);
    expect(resultView.hasDirectIssue).toBe(true);
  });

  it("derives named result attribution from evaluated issues and ranked patch events", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const directIssue = {
      id: "power-direct",
      chapter: "power" as const,
      type: "DIRECT_CONTRADICTION" as const,
      severity: 9,
      independentKey: "power-direct",
      factRefs: ["power.P1", "power.P2"],
      attribution: {
        sourcePlayerId: "p1",
        targetPlayerId: "p2",
        sourceFactKey: "power.P1",
        targetFactKey: "power.P2",
        sourceValue: true,
        targetValue: false,
      },
    };
    const resultDefinition = {
      ...definition,
      issues: [
        ...definition.issues,
        {
          ...directIssue,
          patchOptionIds: ["power-a", "power-b"],
          publicTitle: label,
          publicExplanation: label,
        },
      ],
    };
    const adoptedPatch = {
      patchId: "power-a",
      chapter: "power" as const,
      sourceIssueIds: [directIssue.id],
      rankedBallots: [
        { playerId: "p3", rankedOptionIds: ["power-a", "power-b"] },
        { playerId: "p4", rankedOptionIds: ["power-b", "power-a"] },
      ],
      factsBefore: [{ key: "power.resolved", value: undefined }],
      factsAfter: [{ key: "power.resolved", value: "a" }],
      commitmentsCreated: [],
      laterEffects: [{ chapter: "device" as const, selectorKey: "power.resolved" }],
    };
    const secondAdoptedPatch = {
      ...adoptedPatch,
      patchId: "power-b",
      factsAfter: [{ key: "power.resolved", value: "b" }],
    };
    const unattributedEvidenceConflict = {
      id: "higher-severity-unattributed-evidence-conflict",
      chapter: "device" as const,
      type: "EVIDENCE_CONFLICT" as const,
      severity: 10,
      independentKey: "unattributed",
      factRefs: ["evidence.device"],
    };
    const eventLedger = [
      ...state.eventLedger,
      {
        id: "unattributed-issue-event",
        type: "ISSUE_REVEALED" as const,
        sessionId: state.sessionId,
        chapter: "device" as const,
        timestamp: 1_900,
        visibility: "public" as const,
        refs: [unattributedEvidenceConflict.id],
        data: { issueType: unattributedEvidenceConflict.type },
      },
      {
        id: "issue-event",
        type: "ISSUE_REVEALED" as const,
        sessionId: state.sessionId,
        chapter: "power" as const,
        timestamp: 2_000,
        visibility: "public" as const,
        playerId: "p1",
        refs: [directIssue.id, "p1", "p2"],
        data: { issueType: directIssue.type },
      },
      {
        id: "ballot-event",
        type: "RANKED_BALLOT_SUBMITTED" as const,
        sessionId: state.sessionId,
        chapter: "power" as const,
        timestamp: 2_100,
        visibility: "private" as const,
        playerId: "p3",
        refs: ["power-b", "power-a"],
        data: { ranking: "power-b|power-a" },
      },
      {
        id: "later-tied-ballot-event",
        type: "RANKED_BALLOT_SUBMITTED" as const,
        sessionId: state.sessionId,
        chapter: "power" as const,
        timestamp: 2_150,
        visibility: "private" as const,
        playerId: "p4",
        refs: ["power-b", "power-a"],
        data: { ranking: "power-b|power-a" },
      },
      {
        id: "patch-event",
        type: "PATCH_ADOPTED" as const,
        sessionId: state.sessionId,
        chapter: "power" as const,
        timestamp: 2_200,
        visibility: "public" as const,
        refs: ["power-a", directIssue.id],
        data: { patchId: "power-a" },
      },
      {
        id: "second-patch-event",
        type: "PATCH_ADOPTED" as const,
        sessionId: state.sessionId,
        chapter: "power" as const,
        timestamp: 2_300,
        visibility: "public" as const,
        refs: ["power-b", directIssue.id],
        data: { patchId: "power-b" },
      },
    ];

    const view = toWarehousePublicView(
      {
        ...state,
        chapter: "result",
        phase: "RESULT_REVEAL",
        issueLedger: [unattributedEvidenceConflict, directIssue],
        adoptedPatches: [adoptedPatch, secondAdoptedPatch],
        eventLedger,
      },
      resultDefinition,
    );

    expect(view.resultAttribution.worstContradiction).toMatchObject({
      playerId: "p1",
      playerName: "P1",
      issueId: directIssue.id,
    });
    expect(view.resultAttribution.bestPatch).toMatchObject({
      playerId: "p3",
      playerName: "P3",
      patchId: "power-a",
    });
    expect(view.resultAttribution.bestPatch?.contribution.ar).toContain("المرتبة 2");
  });

  it("does not call an adopted patch successful after its later commitment breaks", () => {
    const state = createWarehouseCase({
      sessionId: "broken-patch-session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const authoredPatch = definition.patchOptions.find((patch) => patch.chapter === "power")!;
    const createdCommitment = {
      ...authoredPatch.commitments[0]!,
      id: "evaluated-commitment",
      fromPatchId: authoredPatch.id,
      status: "pending" as const,
    };
    const adoptedPatch = {
      patchId: authoredPatch.id,
      chapter: "power" as const,
      sourceIssueIds: [] as readonly string[],
      rankedBallots: [{ playerId: "p2", rankedOptionIds: [authoredPatch.id, "other"] }],
      factsBefore: [] as readonly { key: string; value: undefined }[],
      factsAfter: authoredPatch.factsAfter,
      commitmentsCreated: [createdCommitment],
      laterEffects: authoredPatch.laterEffects,
    };
    const view = toWarehousePublicView(
      {
        ...state,
        chapter: "result",
        phase: "RESULT_REVEAL",
        adoptedPatches: [adoptedPatch],
        commitments: [{ ...createdCommitment, status: "broken" }],
        eventLedger: [
          ...state.eventLedger,
          {
            id: "broken-ballot-event",
            type: "RANKED_BALLOT_SUBMITTED" as const,
            sessionId: state.sessionId,
            chapter: "power" as const,
            timestamp: 2_000,
            visibility: "private" as const,
            playerId: "p2",
            refs: [authoredPatch.id, "other"],
            data: { ranking: `${authoredPatch.id}|other` },
          },
          {
            id: "broken-patch-event",
            type: "PATCH_ADOPTED" as const,
            sessionId: state.sessionId,
            chapter: "power" as const,
            timestamp: 2_100,
            visibility: "public" as const,
            refs: [authoredPatch.id],
            data: { patchId: authoredPatch.id },
          },
        ],
      },
      definition,
    );

    expect(view.resultAttribution.bestPatch).toBeNull();
  });

  it("returns truthful empty attribution when no contradiction or patch occurred", () => {
    const state = createWarehouseCase({
      sessionId: "clean-result-session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const view = toWarehousePublicView(
      { ...state, chapter: "result", phase: "RESULT_REVEAL" },
      definition,
    );

    expect(view.resultAttribution).toEqual({
      worstContradiction: null,
      bestPatch: null,
    });
  });

  it("allows skip only after 90 seconds disconnected and never invents an answer", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const disconnected = disconnectWarehousePlayer(state, "p2", 2_000);

    expect(skipDisconnectedWarehousePlayer(disconnected, "p2", 91_999)).toBe(disconnected);
    const skipped = skipDisconnectedWarehousePlayer(disconnected, "p2", 92_000);
    expect(skipped.skippedPlayerIds).toEqual(["p2"]);
    expect(skipped.lockedAnswers).toEqual([]);
  });
});

describe("Warehouse Case V1 patches and group scoring", () => {
  it("records facts before/after and preserves commitments and later effects immutably", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const option: WarehousePatchOption = {
      id: "manual-reset",
      chapter: "power",
      resolvesIssueIds: ["issue"],
      factsAfter: [
        { key: "gate_open_reason", value: "manual_reset" },
        { key: "key_used_after_outage", value: true },
      ],
      commitments: [
        {
          id: "commit-key",
          factKey: "key_used_after_outage",
          expectedValue: true,
          testChapter: "device",
          status: "pending",
        },
      ],
      laterEffects: [{ chapter: "device", selectorKey: "key_used_after_outage" }],
      newFactCount: 2,
      changedFactCount: 0,
      ...patchMetadata,
    };

    const updated = adoptWarehousePatch(state, option, [], 2_000);

    expect(updated).not.toBe(state);
    expect(updated.adoptedPatches[0]).toMatchObject({
      patchId: "manual-reset",
      factsBefore: [
        { key: "gate_open_reason", value: undefined },
        { key: "key_used_after_outage", value: undefined },
      ],
      factsAfter: option.factsAfter,
      commitmentsCreated: option.commitments,
      laterEffects: option.laterEffects,
    });
    expect(state.derivedFacts).toEqual({});
    expect(updated.derivedFacts).toMatchObject({
      gate_open_reason: "manual_reset",
      key_used_after_outage: true,
    });
  });

  it("checks due commitments from later structured facts and records satisfied and broken outcomes", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const lockedAnswers = players.map((player, index) => {
      const assignment = state.questionAssignments[`device:P${index + 1}`]!;
      return {
        playerId: player.id,
        questionInstanceId: assignment.instanceId,
        questionId: assignment.id,
        chapter: "device" as const,
        fact: { key: assignment.outputFactKey, value: true },
        lockedAt: 2_000,
      };
    });
    const waiting = {
      ...state,
      chapter: "device" as const,
      phase: "WAITING_FOR_ANSWERS" as const,
      lockedAnswers: lockedAnswers.map((answer, index) =>
        index === 0
          ? { ...answer, fact: { key: "committed_fact", value: true } }
          : answer,
      ),
      questionAssignments: {
        ...state.questionAssignments,
        "device:P1": {
          ...state.questionAssignments["device:P1"]!,
          laterEffectSelector: "committed_fact",
          outputFactKey: "committed_fact",
        },
      },
      adoptedPatches: [
        {
          patchId: "patch",
          chapter: "power" as const,
          sourceIssueIds: ["issue"],
          rankedBallots: [],
          factsBefore: [],
          factsAfter: [{ key: "committed_fact", value: true }],
          commitmentsCreated: [],
          laterEffects: [{ chapter: "device" as const, selectorKey: "committed_fact" }],
        },
      ],
      commitments: [
        {
          id: "kept",
          fromPatchId: "patch",
          factKey: "committed_fact",
          expectedValue: true,
          testChapter: "device" as const,
          status: "pending" as const,
        },
        {
          id: "broken",
          fromPatchId: "patch",
          factKey: "committed_fact",
          expectedValue: false,
          testChapter: "device" as const,
          status: "pending" as const,
        },
      ],
    };

    const checked = advanceWarehousePhase(waiting, definition, 3_000);

    expect(
      isWarehouseQuestionActivatedByPatch(waiting, waiting.questionAssignments["device:P1"]!),
    ).toBe(true);
    expect(checked.commitments.map((commitment) => commitment.status)).toEqual([
      "satisfied",
      "broken",
    ]);
    expect(
      checked.eventLedger.filter((event) => event.type === "COMMITMENT_CHECKED"),
    ).toHaveLength(2);
  });

  it("does not use an unrelated activated question as commitment evidence", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const assignment = state.questionAssignments["device:P1"]!;
    const waiting = {
      ...state,
      chapter: "device" as const,
      phase: "WAITING_FOR_ANSWERS" as const,
      questionAssignments: {
        ...state.questionAssignments,
        "device:P1": {
          ...assignment,
          outputFactKey: "unrelated_fact",
          laterEffectSelector: "committed_fact",
          comparisonTargets: ["different_fact"],
        },
      },
      lockedAnswers: players.map((player, index) => {
        const question =
          index === 0
            ? {
                ...assignment,
                outputFactKey: "unrelated_fact",
                instanceId: assignment.instanceId,
              }
            : state.questionAssignments[`device:P${index + 1}`]!;
        return {
          playerId: player.id,
          questionInstanceId: question.instanceId,
          questionId: question.id,
          chapter: "device" as const,
          fact: { key: question.outputFactKey, value: false },
          lockedAt: 2_000,
        };
      }),
      adoptedPatches: [
        {
          patchId: "patch",
          chapter: "power" as const,
          sourceIssueIds: ["issue"],
          rankedBallots: [],
          factsBefore: [],
          factsAfter: [{ key: "committed_fact", value: true }],
          commitmentsCreated: [],
          laterEffects: [{ chapter: "device" as const, selectorKey: "committed_fact" }],
        },
      ],
      commitments: [
        {
          id: "commitment",
          fromPatchId: "patch",
          factKey: "committed_fact",
          expectedValue: true,
          testChapter: "device" as const,
          status: "pending" as const,
        },
      ],
    };

    expect(advanceWarehousePhase(waiting, definition, 3_000).commitments[0]?.status).toBe(
      "untested",
    );
  });

  it("evaluates the canonical movement commitment through its reachable-location rule", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const assignment = state.questionAssignments["device:P1"]!;
    const evaluateMovement = (location: string) =>
      advanceWarehousePhase(
        {
          ...state,
          chapter: "device",
          phase: "WAITING_FOR_ANSWERS",
          questionAssignments: {
            ...state.questionAssignments,
            "device:P1": {
              ...assignment,
              outputFactKey: "device_location.2348",
              laterEffectSelector: "movement.selectedPlayer",
              comparisonTargets: ["derived.movement"],
              compatibilityRule: "location_reachable",
            },
          },
          lockedAnswers: players.map((player, index) => {
            const question = state.questionAssignments[`device:P${index + 1}`]!;
            return {
              playerId: player.id,
              questionInstanceId: question.instanceId,
              questionId: question.id,
              chapter: "device" as const,
              fact: {
                key: index === 0 ? "device_location.2348" : question.outputFactKey,
                value: index === 0 ? location : true,
              },
              lockedAt: 2_000,
            };
          }),
          adoptedPatches: [
            {
              patchId: "P1_FETCH_TOOL",
              chapter: "power",
              sourceIssueIds: ["issue"],
              rankedBallots: [],
              factsBefore: [],
              factsAfter: [],
              commitmentsCreated: [],
              laterEffects: [
                { chapter: "device", selectorKey: "movement.selectedPlayer" },
              ],
            },
          ],
          commitments: [
            {
              id: "commit.fetch_tool_movement",
              fromPatchId: "P1_FETCH_TOOL",
              factKey: "movement.selectedPlayer",
              expectedValue: "to_loading_area_2346_2348",
              testChapter: "device",
              status: "pending",
            },
          ],
        },
        definition,
        3_000,
      ).commitments[0]?.status;

    expect(evaluateMovement("loading_area")).toBe("satisfied");
    expect(evaluateMovement("parking")).toBe("broken");
  });

  it("resets a prior tie rerun before opening the next chapter ballot", () => {
    const state = createWarehouseCase({
      sessionId: "session",
      definition,
      players,
      sharedStory: story,
      now: 1_000,
    });
    const openDiscussion = {
      ...state,
      chapter: "device" as const,
      phase: "OPEN_DISCUSSION" as const,
      ballotRound: 1 as const,
      readyForVotePlayerIds: players.map((player) => player.id),
      issueLedger: [
        {
          id: "device-issue",
          chapter: "device" as const,
          type: "STORY_GAP" as const,
          severity: 7,
          independentKey: "device",
          factRefs: ["device"],
        },
      ],
    };

    const ballot = advanceWarehousePhase(openDiscussion, definition, 3_000);

    expect(ballot.phase).toBe("PATCH_BALLOT");
    expect(ballot.ballotRound).toBe(0);
  });

  it("calculates only group consistency/plausibility/stability and fails closed on missing data", () => {
    const complete = calculateWarehouseScore({
      comparisons: [
        { id: "c1", chapter: "power", compatibility: "MATCH", weight: 1 },
        { id: "c2", chapter: "device", compatibility: "COMPATIBLE_VARIANCE", weight: 1 },
      ],
      documentedComparisonSkips: [],
      evidenceEvaluations: [
        { evidenceId: "gate", chapter: "power", fit: "DIRECTLY_EXPLAINED" },
        { evidenceId: "device", chapter: "device", fit: "COHERENT_PATCH" },
        { evidenceId: "car", chapter: "car", fit: "POSSIBLE_COMPLEX_PATCH" },
      ],
      commitments: [
        {
          id: "commit",
          factKey: "x",
          expectedValue: true,
          testChapter: "device",
          status: "satisfied",
        },
      ],
      unnecessaryComplexityPenalty: 5,
      chaptersResolved: ["power", "device", "car"],
    });

    expect(complete).toEqual({
      status: "complete",
      consistency: 93,
      plausibility: 78,
      stability: 100,
      overall: 90,
    });
    expect(complete).not.toHaveProperty("players");
    expect(complete).not.toHaveProperty("ranking");

    expect(
      calculateWarehouseScore({
        comparisons: [],
        documentedComparisonSkips: [],
        evidenceEvaluations: [],
        commitments: [],
        unnecessaryComplexityPenalty: 0,
        chaptersResolved: [],
      }),
    ).toEqual({
      status: "incomplete",
      diagnosticCode: "FAIR_SCORE_UNAVAILABLE",
      message: "تعذر حساب نتيجة عادلة لهذه الجولة.",
    });
  });
});
