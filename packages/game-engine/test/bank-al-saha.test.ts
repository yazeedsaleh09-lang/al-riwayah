import { describe, expect, it } from "vitest";
import {
  BANK_LINKED_CANONICAL_SELECTION,
  BANK_LINKED_OPTION_COMPATIBILITY,
  bankAlSahaV1,
} from "../../content/src/index";
import {
  BANK_REPAIR_BRANCHES,
  BANK_TRUTH_PACKETS,
  adoptBankRepair,
  advanceBankMatch,
  assignBankQuestions,
  buildCausalRecap,
  classifyFirstReveal,
  confirmBankStory,
  createBankMatch,
  deriveBankScoreChecks,
  evaluateBankForensics,
  evaluateRepairAgainstTruth,
  finalizeBankMatch,
  lockBankAnswer,
  lockBankStoryChoice,
  resolveRepairVote,
  scoreBankPlayer,
  scoreSuspicionBaskets,
  toBankPublicView,
  type BankPlayerInput,
} from "../src/bank-al-saha";

const ARABIC_NAMES = ["سعود", "يزيد", "فهد", "راكان", "نواف", "جود"] as const;

function players(count: 4 | 5 | 6): BankPlayerInput[] {
  return ARABIC_NAMES.slice(0, count).map((name, joinOrder) => ({
    id: `player-${joinOrder + 1}`,
    name,
    joinOrder,
    isHost: joinOrder === 0,
  }));
}

describe("Bank Al-Saha authored assignment matrix", () => {
  it.each([4, 5, 6] as const)(
    "assigns every one of %i players one first and one branch-specific forensic question",
    (count) => {
      const assigned = assignBankQuestions(players(count));

      expect(assigned).toHaveLength(count);
      expect(new Set(assigned.map(({ playerId }) => playerId)).size).toBe(count);
      expect(new Set(assigned.map(({ firstQuestion }) => firstQuestion.id)).size).toBe(count);
      expect(
        new Set(assigned.map(({ forensicQuestions }) => forensicQuestions.movement.id)).size,
      ).toBe(count);
      expect(
        new Set(assigned.map(({ forensicQuestions }) => forensicQuestions.identity.id)).size,
      ).toBe(count);
      expect(
        assigned.every(
          ({ firstQuestion, forensicQuestions }) =>
            firstQuestion.checks.storyRef &&
            firstQuestion.checks.firstLinkedRef &&
            forensicQuestions.movement.checks.repairRef &&
            forensicQuestions.movement.checks.evidenceRef &&
            forensicQuestions.movement.checks.finalLinkedRef &&
            forensicQuestions.identity.checks.repairRef &&
            forensicQuestions.identity.checks.evidenceRef &&
            forensicQuestions.identity.checks.finalLinkedRef,
        ),
      ).toBe(true);
      expect(assigned.every(({ firstQuestion, forensicQuestions }) =>
        [firstQuestion, forensicQuestions.movement, forensicQuestions.identity].every((question) =>
          question.options.every((option) =>
            Object.keys(option.normalizedFacts).every((factKey) => question.factKeys.includes(factKey)),
          ),
        ),
      )).toBe(true);
    },
  );

  it("uses display names publicly and gives the sixth player a causal camera role", () => {
    const assigned = assignBankQuestions(players(6));
    const publicCopy = JSON.stringify(
      assigned.map(({ displayName, roleLabel }) => ({
        displayName,
        roleLabel,
      })),
    );
    const joud = assigned.find(({ playerId }) => playerId === "player-6");

    expect(publicCopy).toContain("جود");
    expect(publicCopy).not.toMatch(/\b(?:P|S)[1-6]\b/);
    expect(joud?.firstQuestion.factKeys).toContain("parking_camera_sightline");
    expect(joud?.forensicQuestions.movement.factKeys).toContain("saud_departure");
    expect(joud?.forensicQuestions.identity.factKeys).toContain("saud_stayed_at_car");
  });

});

describe("first investigation reveal", () => {
  it.each([4, 5, 6] as const)(
    "normalizes authored aliases into the live Saud contradiction for %i players",
    (count) => {
      let state = advanceBankMatch(createBankMatch({
        matchId: `alias-${count}`, seed: `alias-${count}`, players: players(count),
        truthPacketId: "movement_true",
      }));
      for (const assignment of state.storyAssignments) {
        state = lockBankStoryChoice(state, {
          playerId: assignment.ownerPlayerId, factKey: assignment.factKey,
          optionId: assignment.options[0]!.id,
        });
      }
      state = confirmBankStory(state, "player-1");
      for (const [index, player] of state.players.entries()) {
        const question = state.assignments[player.id]!.firstQuestion;
        const option = question.options[index === 1 ? 1 : 0]!;
        state = lockBankAnswer(state, {
          playerId: player.id, phase: "first_investigation", questionId: question.id,
          optionId: option.id, normalizedFacts: option.normalizedFacts,
        });
      }
      state = advanceBankMatch(state);

      expect(state.phase).toBe("ISSUE_REVEAL");
      expect(state.firstReveal).toMatchObject({
        kind: "direct_contradiction", sources: ["player-1", "player-2"], delta: 15,
      });
    },
  );

  it("reports a direct contradiction only when two locked claims cannot both be true", () => {
    const reveal = classifyFirstReveal({
      claims: [
        {
          sourceId: "player-1",
          factKey: "location:saud:11:42",
          value: "parking",
          statement: "سعود كان عند السيارة الساعة 11:42.",
        },
        {
          sourceId: "player-2",
          factKey: "location:saud:11:42",
          value: "cafe",
          statement: "سعود كان داخل المقهى الساعة 11:42.",
        },
      ],
      unexplainedFacts: [],
    });

    expect(reveal.kind).toBe("direct_contradiction");
    expect(reveal.delta).toBe(15);
    expect(reveal.sources).toEqual(["player-1", "player-2"]);
    expect(reveal.explanation).toContain("11:42");
  });

  it("shows a truthful gap instead of fabricating a contradiction", () => {
    const reveal = classifyFirstReveal({
      claims: [
        {
          sourceId: "player-1",
          factKey: "location:saud:11:42",
          value: "parking",
          statement: "سعود كان عند السيارة الساعة 11:42.",
        },
        {
          sourceId: "player-2",
          factKey: "location:saud:11:42",
          value: "parking",
          statement: "سعود كان عند السيارة الساعة 11:42.",
        },
      ],
      unexplainedFacts: [
        {
          factKey: "black_bag_route",
          explanation: "الشنطة مثبتة مع فهد، لكن طريقها للمواقف غير مفسر.",
        },
      ],
    });

    expect(reveal.kind).toBe("unexplained_gap");
    expect(reveal.delta).toBe(8);
    expect(reveal.sources).toEqual([]);
    expect(reveal.explanation).toContain("الشنطة");
  });
});

describe("repair branches and pre-authored truth packets", () => {
  it("defines two genuinely different repairs with causal evidence and forensic questions", () => {
    expect(Object.keys(BANK_REPAIR_BRANCHES).sort()).toEqual(["identity", "movement"]);
    expect(BANK_REPAIR_BRANCHES.movement.officialFacts).toContainEqual({
      factKey: "location:saud:11:44",
      value: "cafe_entrance",
    });
    expect(BANK_REPAIR_BRANCHES.identity.officialFacts).toContainEqual({
      factKey: "doorway_figure:11:44",
      value: "nawaf",
    });
    expect(BANK_REPAIR_BRANCHES.movement.evidenceRequestId).not.toBe(
      BANK_REPAIR_BRANCHES.identity.evidenceRequestId,
    );
    expect(BANK_REPAIR_BRANCHES.movement.forensicQuestionSetId).not.toBe(
      BANK_REPAIR_BRANCHES.identity.forensicQuestionSetId,
    );
  });

  it("locks one of three authored truth packets before voting and never rewrites the first answer", () => {
    expect(Object.keys(BANK_TRUTH_PACKETS).sort()).toEqual([
      "ambiguous",
      "identity_true",
      "movement_true",
    ]);
    let initial = advanceBankMatch(createBankMatch({
      matchId: "bank-match",
      seed: "locked-before-vote",
      players: players(5),
      truthPacketId: "movement_true",
    }));
    for (const assignment of initial.storyAssignments) {
      initial = lockBankStoryChoice(initial, {
        playerId: assignment.ownerPlayerId,
        factKey: assignment.factKey,
        optionId: assignment.options[0]!.id,
      });
    }
    initial = confirmBankStory(initial, "player-1");
    const withAnswer = lockBankAnswer(initial, {
      playerId: "player-2",
      phase: "first_investigation",
      questionId: initial.assignments["player-2"]!.firstQuestion.id,
      optionId: "saud_at_cafe",
      normalizedFacts: { "location:saud:11:42": "cafe" },
    });
    const repaired = adoptBankRepair(withAnswer, "movement");

    expect(withAnswer).not.toBe(initial);
    expect(repaired).not.toBe(withAnswer);
    expect(initial.answers).toEqual([]);
    expect(repaired.truthPacketId).toBe("movement_true");
    expect(repaired.answers).toEqual(withAnswer.answers);
    expect(repaired.answers[0]?.normalizedFacts["location:saud:11:42"]).toBe("cafe");
  });

  it("evaluates either repair against the packet chosen at match creation", () => {
    expect(evaluateRepairAgainstTruth("movement", "movement_true")).toMatchObject({
      outcome: "proven",
      delta: -8,
    });
    expect(evaluateRepairAgainstTruth("identity", "movement_true")).toMatchObject({
      outcome: "refuted",
      delta: 24,
    });
    expect(evaluateRepairAgainstTruth("identity", "identity_true")).toMatchObject({
      outcome: "proven",
      delta: -8,
    });
    expect(evaluateRepairAgainstTruth("movement", "ambiguous")).toMatchObject({
      outcome: "gap",
      delta: 10,
    });
  });
});

describe("strict-majority repair voting", () => {
  it.each([
    [4, 3],
    [5, 3],
    [6, 4],
  ] as const)("requires %i-player strict majority of %i", (count, required) => {
    const roster = players(count);
    const votes = Object.fromEntries(
      roster.map(({ id }, index) => [id, index < required ? "movement" : "identity"]),
    ) as Record<string, "movement" | "identity">;

    expect(
      resolveRepairVote({
        playerIds: roster.map(({ id }) => id),
        votes,
      }),
    ).toMatchObject({ status: "locked", repairId: "movement", required });
  });

  it("locks immediately at strict majority and leaves a tie open for a live vote change", () => {
    const roster = players(4);
    const votes = {
      "player-1": "movement",
      "player-2": "movement",
      "player-3": "identity",
      "player-4": "identity",
    } as const;

    expect(resolveRepairVote({
      playerIds: roster.map(({ id }) => id),
      votes,
    })).toMatchObject({ status: "pending", required: 3 });
    expect(
      resolveRepairVote({
        playerIds: roster.map(({ id }) => id),
        votes: { ...votes, "player-2": "identity" },
      }),
    ).toMatchObject({ status: "locked", repairId: "identity", decidedBy: "strict_majority" });
  });
});

describe("suspicion baskets", () => {
  it("reaches the canonical 37% with one route issue and an independently explained bag photo", () => {
    const initial = createBankMatch({
      matchId: "canonical-37",
      seed: "canonical-37",
      players: players(5),
      truthPacketId: "movement_true",
    });
    const repaired = adoptBankRepair({
      ...initial,
      firstReveal: {
        kind: "direct_contradiction",
        delta: 15,
        sources: ["player-1", "player-2"],
        explanation: "تعارض مكان سعود الساعة 11:42.",
      },
      answers: initial.players.map((player, index) => {
        const optionId = ["carry_key_only", "entrant_saud", "bag_with_fahad", "route_alley", "wait_nawaf"][index]!;
        const question = initial.assignments[player.id]!.forensicQuestions.movement;
        const option = question.options.find(({ id }) => id === optionId)!;
        return {
          playerId: player.id,
          phase: "forensic_investigation" as const,
          questionId: question.id,
          optionId,
          normalizedFacts: option.normalizedFacts,
        };
      }),
    }, "movement");

    const scored = evaluateBankForensics(repaired);

    expect(scored.suspicionAudit?.entries.map(({ delta }) => delta)).toEqual([15, -8, 10, -4]);
    expect(scored.suspicion).toBe(37);

    const coherentAnswers = repaired.answers.map((answer) => {
      if (answer.playerId !== "player-4") return answer;
      const option = initial.assignments[answer.playerId]!.forensicQuestions.movement.options.find(
        ({ id }) => id === "route_sidewalk",
      )!;
      return { ...answer, optionId: option.id, normalizedFacts: option.normalizedFacts };
    });
    const wrongRepair = adoptBankRepair({
      ...initial,
      truthPacketId: "identity_true",
      firstReveal: repaired.firstReveal,
      answers: coherentAnswers,
    }, "movement");
    const wrongScored = evaluateBankForensics(wrongRepair);

    expect(wrongScored.suspicionAudit?.entries.map(({ delta }) => delta)).toEqual([15, 24, -10, -4]);
    expect(wrongScored.suspicion).toBe(49);
  });

  it("applies each basket once, deduplicates natural facts, and never reuses repair evidence", () => {
    const result = scoreSuspicionBaskets({
      initialSuspicion: 24,
      firstReveal: { outcome: "direct_contradiction", factKey: "saud_location" },
      repairTest: {
        outcome: "refuted",
        evidenceIds: ["camera_chain"],
      },
      forensicAnswers: {
        issues: [
          { independentFactKey: "route", sourceId: "player-4" },
          { independentFactKey: "route", sourceId: "player-5" },
        ],
      },
      residualEvidence: {
        outcome: "direct_conflict",
        evidenceIds: ["camera_chain"],
      },
    });

    expect(result.entries).toHaveLength(4);
    expect(result.entries.map(({ basket }) => basket)).toEqual([
      "first_reveal",
      "repair_test",
      "forensic_answers",
      "residual_evidence",
    ]);
    expect(result.entries.map(({ delta }) => delta)).toEqual([15, 24, 10, 0]);
    expect(result.entries[3]).toMatchObject({
      applied: false,
      reasonCode: "evidence_already_scored",
    });
    expect(result.finalSuspicion).toBe(73);
  });

  it("clamps only the final total while retaining every auditable delta", () => {
    const result = scoreSuspicionBaskets({
      initialSuspicion: 90,
      firstReveal: { outcome: "evidence_impossibility", factKey: "bag_location" },
      repairTest: { outcome: "refuted", evidenceIds: ["door_camera"] },
      forensicAnswers: {
        issues: [
          { independentFactKey: "route", sourceId: "player-4" },
          { independentFactKey: "key_holder", sourceId: "player-3" },
        ],
      },
      residualEvidence: { outcome: "direct_conflict", evidenceIds: ["bag_photo"] },
    });

    expect(result.entries.map(({ delta }) => delta)).toEqual([20, 24, 18, 16]);
    expect(result.finalSuspicion).toBe(100);
  });
});

describe("individual contribution scores", () => {
  it("uses the canonical 25/20/20/25/10 weights and explains the strongest gain and loss", () => {
    const result = scoreBankPlayer({
      playerId: "player-4",
      checks: {
        firstStoryFit: { fit: 1, ref: "story.route" },
        firstLinkedFit: { fit: 1, ref: "linked.key_holder" },
        forensicRepairFit: { fit: 1, ref: "repair.movement" },
        forensicEvidenceFit: { fit: 0, ref: "evidence.sidewalk" },
        forensicLinkedFit: { fit: 0, ref: "linked.arrival_route" },
      },
    });

    expect(result).toMatchObject({ status: "complete", score: 65 });
    expect(result.strongestContribution?.ref).toBe("story.route");
    expect(result.strongestDeduction?.ref).toBe("evidence.sidewalk");
    expect(JSON.stringify(result)).not.toContain("vote");
  });

  it("fails closed instead of printing a prorated score when any check is missing", () => {
    const result = scoreBankPlayer({
      playerId: "player-2",
      checks: {
        firstStoryFit: { fit: 1, ref: "story.location" },
        firstLinkedFit: { fit: 0, ref: "linked.saud_location" },
        forensicRepairFit: { fit: 1, ref: "repair.identity" },
        forensicEvidenceFit: { fit: 1, ref: "evidence.doorway" },
      },
    });

    expect(result).toMatchObject({ status: "incomplete", score: null });
  });

  it("projects complete rankings with Arabic ledger-backed reasons and truthful shared ranks", () => {
    const initial = createBankMatch({
      matchId: "auditable-ranking",
      seed: "auditable-ranking",
      players: players(4),
      truthPacketId: "movement_true",
    });
    const checks = Object.fromEntries(initial.players.map(({ id }) => [id, {
      firstStoryFit: { fit: 1 as const, ref: `story.${id}` },
      firstLinkedFit: { fit: 1 as const, ref: `linked.first.${id}` },
      forensicRepairFit: { fit: 1 as const, ref: "repair.movement" },
      forensicEvidenceFit: { fit: 0.5 as const, ref: "evidence.camera" },
      forensicLinkedFit: { fit: 1 as const, ref: `linked.final.${id}` },
    }]));
    const verdict = finalizeBankMatch({ ...initial, phase: "GROUP_VERDICT", suspicion: 37 }, checks);
    const view = toBankPublicView(advanceBankMatch(verdict));

    expect(view.rankingStatus).toBe("complete");
    expect(view.rankings).toHaveLength(4);
    expect(view.rankings.every(({ reason, explanation }) => reason.length > 0 && explanation.length > 0)).toBe(true);
    expect(view.rankings.map(({ sharedRank }) => sharedRank)).toEqual([1, 1, 1, 1]);
    expect(verdict.eventLedger.filter(({ type }) => type === "SCORE_CALCULATED")[0]?.refs).toContain("story.player-1");
  });

  it("derives five complete sample scores from the match facts and authored predicates", () => {
    let state = advanceBankMatch(createBankMatch({
      matchId: "derived-sample",
      seed: "derived-sample",
      players: players(5),
      truthPacketId: "movement_true",
      caseDefinition: bankAlSahaV1,
    }));
    for (const assignment of state.storyAssignments) {
      state = lockBankStoryChoice(state, {
        playerId: assignment.ownerPlayerId,
        factKey: assignment.factKey,
        optionId: assignment.options[0]!.id,
      });
    }
    state = confirmBankStory(state, "player-1");
    for (const [index, player] of state.players.entries()) {
      const question = state.assignments[player.id]!.firstQuestion;
      const option = question.options[[0, 1, 0, 0, 0][index]!]!;
      state = lockBankAnswer(state, {
        playerId: player.id, phase: "first_investigation", questionId: question.id,
        optionId: option.id, normalizedFacts: option.normalizedFacts,
      });
    }
    state = adoptBankRepair({ ...state, phase: "FORENSIC_QUESTION" }, "movement");
    for (const [index, player] of state.players.entries()) {
      const question = state.assignments[player.id]!.forensicQuestions.movement;
      const option = question.options[[0, 0, 0, 1, 0][index]!]!;
      state = lockBankAnswer(state, {
        playerId: player.id, phase: "forensic_investigation", questionId: question.id,
        optionId: option.id, normalizedFacts: option.normalizedFacts,
      });
    }

    const checks = deriveBankScoreChecks(state);
    expect(state.players.map(({ id }) => scoreBankPlayer({ playerId: id, checks: checks[id]! }).status))
      .toEqual(["complete", "complete", "complete", "complete", "complete"]);
  });

  it("scores the sixth player's Saud-stayed answer as the semantic value 'no'", () => {
    let state = advanceBankMatch(createBankMatch({
      matchId: "sixth-stayed", seed: "sixth-stayed", players: players(6),
      truthPacketId: "identity_true",
    }));
    for (const assignment of state.storyAssignments) {
      state = lockBankStoryChoice(state, {
        playerId: assignment.ownerPlayerId, factKey: assignment.factKey,
        optionId: assignment.options[0]!.id,
      });
    }
    state = confirmBankStory(state, "player-1");
    for (const player of state.players) {
      const question = state.assignments[player.id]!.firstQuestion;
      const option = question.options[0]!;
      state = lockBankAnswer(state, {
        playerId: player.id, phase: "first_investigation", questionId: question.id,
        optionId: option.id, normalizedFacts: option.normalizedFacts,
      });
    }
    state = adoptBankRepair({ ...state, phase: "FORENSIC_QUESTION" }, "identity");
    for (const [index, player] of state.players.entries()) {
      const question = state.assignments[player.id]!.forensicQuestions.identity;
      const option = question.options[index === 1 ? 1 : 0]!;
      state = lockBankAnswer(state, {
        playerId: player.id, phase: "forensic_investigation", questionId: question.id,
        optionId: option.id, normalizedFacts: option.normalizedFacts,
      });
    }

    const checks = deriveBankScoreChecks(state);
    const saudChecks = checks["player-1"]!;
    const joudChecks = checks["player-6"]!;
    expect(saudChecks.forensicRepairFit?.fit).toBe(1);
    expect(saudChecks.forensicEvidenceFit?.fit).toBe(1);
    expect(joudChecks.forensicRepairFit?.fit).toBe(1);
    expect(joudChecks.forensicEvidenceFit?.fit).toBe(1);
  });

  it.each([4, 5, 6] as const)("scores every injected %i-player first question against its production linked target", (count) => {
    const initial = createBankMatch({
      matchId: `linked-target-${count}`, seed: `linked-target-${count}`, players: players(count),
      truthPacketId: "movement_true", caseDefinition: bankAlSahaV1,
    });
    const answers = initial.players.flatMap(({ id }) => {
      const assignment = initial.assignments[id]!;
      const first = assignment.firstQuestion.options.find(({ id: optionId }) =>
        optionId === BANK_LINKED_CANONICAL_SELECTION[count].first[assignment.firstQuestion.id])!;
      const forensic = assignment.forensicQuestions.movement.options.find(({ id: optionId }) =>
        optionId === BANK_LINKED_CANONICAL_SELECTION[count].movement[assignment.forensicQuestions.movement.id])!;
      return [
        { playerId: id, phase: "first_investigation" as const, questionId: assignment.firstQuestion.id, optionId: first.id, normalizedFacts: first.normalizedFacts },
        { playerId: id, phase: "forensic_investigation" as const, questionId: assignment.forensicQuestions.movement.id, optionId: forensic.id, normalizedFacts: forensic.normalizedFacts },
      ];
    });
    const state = {
      ...initial,
      selectedRepairId: "movement" as const,
      answers,
    };
    const completeChecks = deriveBankScoreChecks(state);
    for (const [ownerIndex, owner] of initial.players.entries()) {
      const ownerQuestion = initial.assignments[owner.id]!.firstQuestion;
      const { firstLinkedRef: ref, linkedOptionMatches } = ownerQuestion.checks;
      expect(ref).toMatch(/^linked\.(saud|yazid|fahad|rakan|nawaf|joud)$/);
      const role = ref!.slice("linked.".length);
      const targetIndex = ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"].indexOf(role);
      expect(targetIndex).toBeGreaterThanOrEqual(0);
      expect(targetIndex).toBeLessThan(count);
      expect(targetIndex).not.toBe(ownerIndex);
      const targetId = initial.players[targetIndex]!.id;
      const targetQuestion = initial.assignments[targetId]!.firstQuestion;
      const semanticCompatibility = BANK_LINKED_OPTION_COMPATIBILITY[ownerQuestion.id]!;
      expect(linkedOptionMatches).toEqual(semanticCompatibility);
      const withPair = (ownerOption: typeof ownerQuestion.options[number], targetOption: typeof targetQuestion.options[number]) => ({ ...state, answers: answers.map((answer) => {
        if (answer.phase !== "first_investigation") return answer;
        if (answer.playerId === owner.id) return { ...answer, optionId: ownerOption.id, normalizedFacts: ownerOption.normalizedFacts };
        if (answer.playerId === targetId) return { ...answer, optionId: targetOption.id, normalizedFacts: targetOption.normalizedFacts };
        return answer;
      }) });
      for (const ownerOption of ownerQuestion.options) {
        const allowed = semanticCompatibility[ownerOption.id] ?? [];
        for (const targetOption of targetQuestion.options) {
          const expectedFit = allowed.includes(targetOption.id) ? 1 : 0;
          expect(deriveBankScoreChecks(withPair(ownerOption, targetOption))[owner.id]?.firstLinkedFit?.fit).toBe(expectedFit);
        }
      }
      const withoutTarget = { ...state, answers: answers.filter((answer) =>
        answer.phase !== "first_investigation" || answer.playerId !== targetId) };
      const incompleteChecks = deriveBankScoreChecks(withoutTarget);
      expect(incompleteChecks[owner.id]).not.toHaveProperty("firstLinkedFit");
      expect(finalizeBankMatch({ ...withoutTarget, phase: "GROUP_VERDICT" }, incompleteChecks).rankingStatus).toBe("incomplete");
    }
    expect(initial.players.every(({ id }) => completeChecks[id]?.firstLinkedFit?.fit === 1)).toBe(true);
  });

  it.each([
    [4, "movement"], [4, "identity"], [5, "movement"], [5, "identity"],
    [6, "movement"], [6, "identity"],
  ] as const)("scores every injected %i-player %s forensic question against its production linked target", (count, repairId) => {
    const initial = createBankMatch({
      matchId: `final-linked-${count}-${repairId}`, seed: `final-linked-${count}-${repairId}`,
      players: players(count), truthPacketId: "movement_true", caseDefinition: bankAlSahaV1,
    });
    const answers = initial.players.flatMap(({ id }) => {
      const assignment = initial.assignments[id]!;
      const first = assignment.firstQuestion.options.find(({ id: optionId }) =>
        optionId === BANK_LINKED_CANONICAL_SELECTION[count].first[assignment.firstQuestion.id])!;
      const forensicQuestion = assignment.forensicQuestions[repairId];
      const forensic = forensicQuestion.options.find(({ id: optionId }) =>
        optionId === BANK_LINKED_CANONICAL_SELECTION[count][repairId][forensicQuestion.id])!;
      return [
        { playerId: id, phase: "first_investigation" as const, questionId: assignment.firstQuestion.id, optionId: first.id, normalizedFacts: first.normalizedFacts },
        { playerId: id, phase: "forensic_investigation" as const, questionId: forensicQuestion.id, optionId: forensic.id, normalizedFacts: forensic.normalizedFacts },
      ];
    });
    const state = { ...initial, selectedRepairId: repairId, answers };
    const completeChecks = deriveBankScoreChecks(state);
    for (const [ownerIndex, owner] of initial.players.entries()) {
      const ownerQuestion = initial.assignments[owner.id]!.forensicQuestions[repairId];
      const { finalLinkedRef: ref, linkedOptionMatches } = ownerQuestion.checks;
      expect(ref).toMatch(/^linked\.(saud|yazid|fahad|rakan|nawaf|joud)$/);
      const targetIndex = ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"].indexOf(ref!.slice("linked.".length));
      expect(targetIndex).toBeGreaterThanOrEqual(0);
      expect(targetIndex).toBeLessThan(count);
      expect(targetIndex).not.toBe(ownerIndex);
      const targetId = initial.players[targetIndex]!.id;
      const targetQuestion = initial.assignments[targetId]!.forensicQuestions[repairId];
      const semanticCompatibility = BANK_LINKED_OPTION_COMPATIBILITY[ownerQuestion.id]!;
      expect(linkedOptionMatches).toEqual(semanticCompatibility);
      const withPair = (ownerOption: typeof ownerQuestion.options[number], targetOption: typeof targetQuestion.options[number]) => ({ ...state, answers: answers.map((answer) => {
        if (answer.phase !== "forensic_investigation") return answer;
        if (answer.playerId === owner.id) return { ...answer, optionId: ownerOption.id, normalizedFacts: ownerOption.normalizedFacts };
        if (answer.playerId === targetId) return { ...answer, optionId: targetOption.id, normalizedFacts: targetOption.normalizedFacts };
        return answer;
      }) });
      for (const ownerOption of ownerQuestion.options) {
        const allowed = semanticCompatibility[ownerOption.id] ?? [];
        for (const targetOption of targetQuestion.options) {
          const expectedFit = allowed.includes(targetOption.id) ? 1 : 0;
          expect(deriveBankScoreChecks(withPair(ownerOption, targetOption))[owner.id]?.forensicLinkedFit?.fit).toBe(expectedFit);
        }
      }
      const withoutTarget = { ...state, answers: answers.filter((answer) =>
        answer.phase !== "forensic_investigation" || answer.playerId !== targetId) };
      expect(deriveBankScoreChecks(withoutTarget)[owner.id]).not.toHaveProperty("forensicLinkedFit");
    }
    expect(initial.players.every(({ id }) => completeChecks[id]?.forensicLinkedFit?.fit === 1)).toBe(true);
  });

  it("rejects the cited 4-player parking-no-key versus petrol-station pair", () => {
    const initial = createBankMatch({
      matchId: "semantic-pair-regression", seed: "semantic-pair-regression", players: players(4),
      truthPacketId: "movement_true", caseDefinition: bankAlSahaV1,
    });
    const answers = initial.players.flatMap(({ id }, index) => {
      const assignment = initial.assignments[id]!;
      const first = assignment.firstQuestion.options.find(({ id: optionId }) =>
        index === 0 ? optionId === "parking-no-key" : index === 1 ? optionId === "station" : true)!;
      const forensic = assignment.forensicQuestions.movement.options[0]!;
      return [
        { playerId: id, phase: "first_investigation" as const, questionId: assignment.firstQuestion.id, optionId: first.id, normalizedFacts: first.normalizedFacts },
        { playerId: id, phase: "forensic_investigation" as const, questionId: assignment.forensicQuestions.movement.id, optionId: forensic.id, normalizedFacts: forensic.normalizedFacts },
      ];
    });
    const checks = deriveBankScoreChecks({ ...initial, selectedRepairId: "movement", answers });
    expect(checks["player-1"]?.firstLinkedFit?.fit).toBe(0);
  });

  it("omits a fact-disjoint link when its authored option predicate is absent", () => {
    const definition = structuredClone(bankAlSahaV1);
    delete definition.questionMatrix[4].first[2]!.checks.linkedOptionMatches;
    const initial = createBankMatch({
      matchId: "missing-link-predicate", seed: "missing-link-predicate", players: players(4),
      truthPacketId: "movement_true", caseDefinition: definition,
    });
    const answers = initial.players.flatMap(({ id }) => {
      const assignment = initial.assignments[id]!;
      const first = assignment.firstQuestion.options[0]!;
      const forensic = assignment.forensicQuestions.movement.options[0]!;
      return [
        { playerId: id, phase: "first_investigation" as const, questionId: assignment.firstQuestion.id, optionId: first.id, normalizedFacts: first.normalizedFacts },
        { playerId: id, phase: "forensic_investigation" as const, questionId: assignment.forensicQuestions.movement.id, optionId: forensic.id, normalizedFacts: forensic.normalizedFacts },
      ];
    });
    const checks = deriveBankScoreChecks({ ...initial, selectedRepairId: "movement", answers });
    expect(checks["player-3"]).not.toHaveProperty("firstLinkedFit");
    expect(scoreBankPlayer({ playerId: "player-3", checks: checks["player-3"]! }).status).toBe("incomplete");
  });

  it.each([undefined, "story.saud", "linked.unknown", "linked.saud"])(
    "omits a missing or miswired first linked check (%s)",
    (firstLinkedRef) => {
      const definition = structuredClone(bankAlSahaV1);
      definition.questionMatrix[4].first[0]!.checks.firstLinkedRef = firstLinkedRef;
      const initial = createBankMatch({
        matchId: "bad-linked-ref", seed: "bad-linked-ref", players: players(4),
        truthPacketId: "movement_true", caseDefinition: definition,
      });
      const answers = initial.players.flatMap(({ id }) => {
        const assignment = initial.assignments[id]!;
        const first = assignment.firstQuestion.options[0]!;
        const forensic = assignment.forensicQuestions.movement.options[0]!;
        return [
          { playerId: id, phase: "first_investigation" as const, questionId: assignment.firstQuestion.id, optionId: first.id, normalizedFacts: first.normalizedFacts },
          { playerId: id, phase: "forensic_investigation" as const, questionId: assignment.forensicQuestions.movement.id, optionId: forensic.id, normalizedFacts: forensic.normalizedFacts },
        ];
      });
      const checks = deriveBankScoreChecks({ ...initial, selectedRepairId: "movement", answers });
      expect(checks["player-1"]).not.toHaveProperty("firstLinkedFit");
      expect(scoreBankPlayer({ playerId: "player-1", checks: checks["player-1"]! }).status).toBe("incomplete");
    },
  );
});

describe("causal verdict recap", () => {
  it("keeps the story → reveal → repair → evidence → verdict chain in recorded order", () => {
    const recap = buildCausalRecap({
      storyEventId: "story-locked",
      revealEventId: "saud-location-conflict",
      repairEventId: "movement-adopted",
      evidenceEventId: "camera-chain-revealed",
      verdictEventId: "verdict-37",
      reasons: {
        reveal: "مكان سعود تعارض في نفس وقت الإنذار.",
        evidence: "فتشوا الكاميرا لأنكم قلتوا سعود تحرك.",
        verdict: "الكاميرا أثبتت الحركة، لكن المسار بقي مخالفًا.",
      },
    });

    expect(recap.steps.map(({ kind }) => kind)).toEqual([
      "story",
      "reveal",
      "repair",
      "evidence",
      "verdict",
    ]);
    expect(recap.steps[3]?.causedBy).toBe("movement-adopted");
    expect(recap.steps[4]?.causedBy).toBe("camera-chain-revealed");
    expect(recap.summaryLines).toEqual([
      "مكان سعود تعارض في نفس وقت الإنذار.",
      "فتشوا الكاميرا لأنكم قلتوا سعود تحرك.",
      "الكاميرا أثبتت الحركة، لكن المسار بقي مخالفًا.",
    ]);
  });
});
