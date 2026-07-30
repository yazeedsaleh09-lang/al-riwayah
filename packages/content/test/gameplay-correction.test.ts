import { describe, expect, it } from "vitest";
import {
  advancePhase,
  applyPatch,
  axisTotals,
  computeComposite,
  contradictionKey,
  finalizeVerdict,
  initializeMatch,
  makePlayers,
  optByNormalized,
  simulateMatch,
  toPublicView,
  type GameCase,
  type MatchScript,
  type MatchState,
} from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE } from "../src/index";
import { ans, buildState } from "./util";

const NOW = 1_000_000;

function advanceUntil(state: MatchState, phase: MatchState["phase"]): void {
  let guard = 0;
  while (state.phase !== phase && state.phase !== "RESULTS" && guard < 30) {
    advancePhase(state, CASE, NOW + guard, { forced: true });
    guard += 1;
  }
  expect(state.phase).toBe(phase);
}

const consistentScript: MatchScript = {
  reason: "repair_equipment",
  locations: Object.fromEntries(
    Array.from({ length: 6 }, (_, index) => [`p${index + 1}`, "meeting_room"]),
  ),
  answer: (_playerId, question) => {
    if (question.tag === "driver") {
      return optByNormalized(question.options, "p3");
    }
    if (question.tag === "storage_visit") {
      return optByNormalized(question.options, "yes");
    }
    if (question.tag === "was_alone") {
      return optByNormalized(question.options, "with_someone");
    }
    if (question.tag === "loc2346") {
      return optByNormalized(question.options, "meeting_room");
    }
    const nonEvasive = question.options.find((option) => option.normalized !== "unknown");
    return (nonEvasive ?? question.options[0]!).id;
  },
};

const naturalConflictScript: MatchScript = {
  ...consistentScript,
  answer: (playerId, question) => {
    if (question.tag === "driver") {
      return optByNormalized(question.options, playerId === "p1" ? "p3" : "p4");
    }
    if (question.tag === "storage_visit") {
      return optByNormalized(question.options, "no");
    }
    return consistentScript.answer(playerId, question);
  },
};

describe("critical contradiction, patch, and scoring corrections", () => {
  for (const playerCount of [4, 5, 6]) {
    it(`${playerCount} players always receive contradiction-capable anchor questions`, () => {
      for (let seedIndex = 0; seedIndex < 20; seedIndex += 1) {
        const state = initializeMatch({
          matchId: `anchors-${playerCount}-${seedIndex}`,
          seed: `anchors-${playerCount}-${seedIndex}`,
          gameCase: CASE,
          players: makePlayers(playerCount),
          now: NOW,
        });

        advanceUntil(state, "INTERROGATION_FOUNDATION");
        const driverQuestions = Object.values(state.questionsByPlayer).filter(
          (question) => question.tag === "driver",
        );
        expect(driverQuestions).toHaveLength(2);

        advancePhase(state, CASE, NOW + 100, { forced: true });
        expect(state.phase).toBe("INTERROGATION_GAPS");
        const wifiHolder = Object.entries(state.privateEvidenceByPlayer).find(([, evidenceIds]) =>
          evidenceIds.includes("pe.own_device_wifi"),
        )?.[0];
        expect(wifiHolder).toBeDefined();
        expect(state.questionsByPlayer[wifiHolder!]!.tag).toBe("storage_visit");
      }
    });
  }

  it("four-player play can release one natural driver contradiction", () => {
    const state = simulateMatch(
      CASE,
      makePlayers(4),
      "four-player-one-contradiction",
      {
        ...consistentScript,
        answer: (playerId, question) =>
          question.tag === "driver"
            ? optByNormalized(question.options, playerId === "p1" ? "p3" : "p4")
            : consistentScript.answer(playerId, question),
      },
    );

    expect(state.releasedContradictionIds).toHaveLength(1);
    expect(state.detectedContradictions).toHaveLength(1);
  });

  it("five-player natural partially coordinated answers release a real contradiction", () => {
    const state = simulateMatch(
      CASE,
      makePlayers(5),
      "five-player-natural-conflict",
      naturalConflictScript,
    );

    expect(state.releasedContradictionIds.length).toBeGreaterThanOrEqual(1);
    expect(state.selectedPatches.length).toBeGreaterThanOrEqual(1);
    expect(state.verdict?.composite).toBeLessThan(100);
  });

  it("six-player play can release multiple supported contradictions", () => {
    const state = simulateMatch(
      CASE,
      makePlayers(6),
      "six-player-multiple-contradictions",
      naturalConflictScript,
    );

    expect(state.detectedContradictions.length).toBeGreaterThanOrEqual(2);
    expect(state.releasedContradictionIds.length).toBeGreaterThanOrEqual(2);
    expect(state.verdict?.composite).toBeLessThan(90);
  });

  it("a fully consistent session skips empty contradiction, patch, and follow-up phases", () => {
    const state = simulateMatch(CASE, makePlayers(5), "five-player-consistent", consistentScript);

    expect(state.releasedContradictionIds).toEqual([]);
    expect(state.selectedPatches).toEqual([]);
    expect(state.answers.some((answer) => answer.questionId.startsWith("followup."))).toBe(false);
    expect(state.skippedPhases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase: "CONTRADICTION_REVEAL_1",
          reason: "NO_CONTRADICTION",
        }),
        expect.objectContaining({ phase: "PATCH_1", reason: "NO_CONTRADICTION" }),
        expect.objectContaining({
          phase: "INTERROGATION_FOLLOWUP",
          reason: "NO_FOLLOWUP_SOURCE",
        }),
        expect.objectContaining({
          phase: "CONTRADICTION_REVEAL_2",
          reason: "NO_CONTRADICTION",
        }),
        expect.objectContaining({ phase: "PATCH_2", reason: "NO_CONTRADICTION" }),
      ]),
    );
    expect(state.verdict?.decisiveFactors.map((factor) => factor.ar)).toContain(
      "روايتكم ما كشفت تناقضًا واضحًا.",
    );
    expect(state.verdict?.composite).toBeGreaterThanOrEqual(85);
  });

  it("skips a patch phase whose selected contradiction has no applicable actions", () => {
    const caseWithoutDirectPatches: GameCase = {
      ...CASE,
      patches: CASE.patches.filter(
        (patch) => !patch.resolvesCategories.includes("DIRECT_IMPOSSIBILITY"),
      ),
    };
    const state = buildState(caseWithoutDirectPatches, {
      phase: "INTERROGATION_NO_GOOD_ANSWER",
      answers: [ans("p1", "driver", "p3"), ans("p2", "driver", "p4")],
      answeredThisPhase: ["p1", "p2", "p3", "p4"],
    });

    advancePhase(state, caseWithoutDirectPatches, NOW, { forced: false });
    expect(state.phase).toBe("CONTRADICTION_REVEAL_1");
    advancePhase(state, caseWithoutDirectPatches, NOW + 1, { forced: true });

    expect(state.phase).toBe("SURPRISE_EVIDENCE");
  });

  it("every reached patch phase exposes actions and waits only until each player votes", () => {
    const state = buildState(CASE, {
      phase: "INTERROGATION_NO_GOOD_ANSWER",
      answers: [ans("p1", "driver", "p3"), ans("p2", "driver", "p4")],
      answeredThisPhase: ["p1", "p2", "p3", "p4"],
    });
    advancePhase(state, CASE, NOW, { forced: false });
    advancePhase(state, CASE, NOW + 1, { forced: true });

    expect(state.phase).toBe("PATCH_1");
    const publicView = toPublicView(state, CASE, "TEST", NOW + 1);
    expect(publicView.patchOptions?.length).toBeGreaterThanOrEqual(1);
  });

  it("uses the deterministic case fallback when a reached patch deadline gets no votes", () => {
    const state = buildState(CASE, {
      phase: "INTERROGATION_NO_GOOD_ANSWER",
      answers: [ans("p1", "driver", "p3"), ans("p2", "driver", "p4")],
      answeredThisPhase: ["p1", "p2", "p3", "p4"],
    });
    advancePhase(state, CASE, NOW, { forced: false });
    advancePhase(state, CASE, NOW + 1, { forced: true });
    expect(state.phase).toBe("PATCH_1");

    const releasedKey = state.releasedContradictionByPhase.CONTRADICTION_REVEAL_1;
    advancePhase(state, CASE, NOW + 2, { forced: true });

    expect(state.phase).toBe("SURPRISE_EVIDENCE");
    expect(state.selectedPatches).toHaveLength(1);
    expect(state.selectedPatches[0]!.contradictionKey).toBe(releasedKey);
    expect(state.commitments.length).toBeGreaterThan(0);
    advancePhase(state, CASE, NOW + 3, { forced: true });
    expect(state.phase).toBe("INTERROGATION_FOLLOWUP");
  });

  it("a successful repair improves the score without erasing the contradiction", () => {
    const contradiction = CASE.contradictionRules
      .find((rule) => rule.id === "contradiction.evidence.storage_wifi.v1")!
      .detect(
        // The concrete context is built by the real matcher in the other tests;
        // this fixture only compares the authored repair ledger effects.
        {
          players: makePlayers(4),
          sharedStory: {},
          evidenceByPlayer: { p1: ["pe.own_device_wifi"] },
          evidenceFacts: [{ tag: "wifi_storage", value: "2348" }],
          answers: [ans("p1", "storage_visit", "no")],
          commitments: [],
          revealedEvidenceIds: ["ev.wifi_storage"],
          getAnswer: (playerId, tag) =>
            playerId === "p1" && tag === "storage_visit"
              ? ans("p1", "storage_visit", "no")
              : undefined,
          answersByTag: (tag) =>
            tag === "storage_visit" ? [ans("p1", "storage_visit", "no")] : [],
          playerName: (playerId) => playerId,
          privateEvidenceFacts: (playerId) =>
            playerId === "p1" ? [{ tag: "holder_storage_presence", value: "yes" }] : [],
        },
      )[0]!;
    const contradictionPenalty = [
      {
        axis: "consistency" as const,
        delta: -contradiction.severity,
        reasonCode: "contradiction",
        refs: [contradictionKey(contradiction)],
        release: "summary" as const,
      },
    ];
    const successfulPatch = CASE.patches.find(
      (patch) => patch.id === "patch.storage_charger_admission.v1",
    )!;
    const applied = applyPatch(successfulPatch, contradiction, CASE, (playerId) => playerId);
    const before = computeComposite(axisTotals(contradictionPenalty, CASE), CASE);
    const after = computeComposite(
      axisTotals([...contradictionPenalty, ...applied.ledgerAdditions], CASE),
      CASE,
    );

    expect(after).toBeGreaterThan(before);
    expect(contradictionKey(contradiction)).toContain(
      "contradiction.evidence.storage_wifi.v1",
    );
  });

  it("a poor repair scores lower than a successful repair", () => {
    const state = buildState(CASE, {
      privateEvidenceByPlayer: { p1: ["pe.own_device_wifi"], p2: [], p3: [], p4: [] },
      answers: [ans("p1", "storage_visit", "no")],
    });
    const contradiction = CASE.contradictionRules
      .flatMap((rule) =>
        rule.detect({
          players: state.players,
          sharedStory: state.sharedStory,
          evidenceByPlayer: state.privateEvidenceByPlayer,
          evidenceFacts: [{ tag: "wifi_storage", value: "2348" }],
          answers: state.answers,
          commitments: [],
          revealedEvidenceIds: ["ev.wifi_storage"],
          getAnswer: (playerId, tag) =>
            state.answers.find((answer) => answer.playerId === playerId && answer.tag === tag),
          answersByTag: (tag) => state.answers.filter((answer) => answer.tag === tag),
          playerName: (playerId) =>
            state.players.find((player) => player.id === playerId)?.name ?? playerId,
          privateEvidenceFacts: (playerId) =>
            playerId === "p1" ? [{ tag: "holder_storage_presence", value: "yes" }] : [],
        }),
      )
      .find((candidate) => candidate.category === "EVIDENCE_COLLISION")!;
    const baseLedger = [
      {
        axis: "consistency" as const,
        delta: -contradiction.severity,
        reasonCode: "contradiction",
        refs: [],
        release: "summary" as const,
      },
    ];
    const good = applyPatch(
      CASE.patches.find((patch) => patch.id === "patch.storage_charger_admission.v1")!,
      contradiction,
      CASE,
      (playerId) => playerId,
    );
    const poor = applyPatch(
      CASE.patches.find((patch) => patch.id === "patch.auto_corridor_connection.v1")!,
      contradiction,
      CASE,
      (playerId) => playerId,
    );
    const goodScore = computeComposite(
      axisTotals([...baseLedger, ...good.ledgerAdditions], CASE),
      CASE,
    );
    const poorScore = computeComposite(
      axisTotals([...baseLedger, ...poor.ledgerAdditions], CASE),
      CASE,
    );

    expect(poorScore).toBeLessThan(goodScore);
  });

  it("empty evaluation data returns a controlled non-perfect verdict", () => {
    const state = buildState(CASE);
    const { verdict } = finalizeVerdict(state, CASE);

    expect(verdict.composite).not.toBe(100);
    expect(verdict.mostConsistentPlayerId).toBeNull();
    expect(verdict.primarySuspectPlayerId).toBeNull();
    expect(verdict.summary.ar).toContain("تعذّر");
  });

  it("the final public report only names contradiction and patch events that occurred", () => {
    const state = simulateMatch(CASE, makePlayers(5), "truthful-consistent", consistentScript);
    const publicView = toPublicView(state, CASE, "TEST", NOW);

    expect(publicView.result?.firstFracture).toBeNull();
    expect(publicView.result?.strongestPatch).toBeNull();
    expect(publicView.result?.costliestPatch).toBeNull();
    expect(publicView.result?.decisiveFactors.map((factor) => factor.ar)).toContain(
      "روايتكم ما كشفت تناقضًا واضحًا.",
    );
  });
});
