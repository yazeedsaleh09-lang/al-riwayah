import { describe, expect, it } from "vitest";
import { missingPayrollEnvelopeV1 as CASE } from "../../content/src";
import {
  applyPatch,
  contradictionKey,
  createRng,
  detectAll,
  fillLocalized,
  fillTemplate,
  initializeMatch,
  rankContradictions,
  resolvePatchVote,
  resolveText,
  selectNextContradiction,
  toPrivateView,
  toPublicView,
  type DetectedContradiction,
  type DetectionContext,
  type GameCase,
  type MatchState,
  type PatchDefinition,
  type PhaseId,
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

function state(overrides: Partial<MatchState> = {}): MatchState {
  return {
    ...initializeMatch({
      matchId: "branch-coverage",
      seed: "branch-coverage",
      gameCase: CASE,
      players,
      now: 1_000,
    }),
    ...overrides,
  };
}

function contradiction(
  ruleId: string,
  overrides: Partial<DetectedContradiction> = {},
): DetectedContradiction {
  return {
    ruleId,
    category: "DIRECT_IMPOSSIBILITY",
    severity: 5,
    narrativeImportance: 5,
    involvedPlayers: ["p1"],
    params: {},
    playerParams: [],
    explanation: { ar: ruleId },
    ...overrides,
  };
}

function patch(id: string, effects: PatchDefinition["scoreEffects"]): PatchDefinition {
  return {
    id,
    archetype: "partial_admission",
    resolvesCategories: ["DIRECT_IMPOSSIBILITY"],
    publicLabel: { ar: id },
    description: { ar: `description:${id}` },
    commitments: [{ factKey: `fact:${id}`, value: "fixed", label: { ar: id } }],
    scoreEffects: effects,
    followUpQuestionIds: [],
  };
}

describe("localization branch behavior", () => {
  it("falls back to Arabic when English is absent", () => {
    expect(resolveText({ ar: "عربي" })).toBe("عربي");
    expect(resolveText({ ar: "عربي", en: "English" }, "en")).toBe("English");
    expect(resolveText({ ar: "عربي" }, "en")).toBe("عربي");
  });

  it("fills owned dotted tokens and preserves missing tokens", () => {
    expect(fillTemplate("{{ user.name }} / {{missing}}", { "user.name": "Yazed" })).toBe(
      "Yazed / {{missing}}",
    );
    expect(fillTemplate("plain", {})).toBe("plain");
  });

  it("fills both locales only when English copy exists", () => {
    expect(fillLocalized({ ar: "يا {{name}}" }, { name: "يزيد" })).toEqual({
      ar: "يا يزيد",
    });
    expect(fillLocalized({ ar: "يا {{name}}", en: "Hi {{name}}" }, { name: "Yazed" })).toEqual({
      ar: "يا Yazed",
      en: "Hi Yazed",
    });
  });
});

describe("RNG boundary behavior", () => {
  it("supports numeric seeds and non-positive integer bounds", () => {
    expect(createRng(42).next()).toBe(createRng(42).next());
    expect(createRng("bounds").int(0)).toBe(0);
    expect(createRng("bounds").int(-3)).toBe(0);
  });

  it("normalizes reversed inclusive ranges", () => {
    const normal = createRng("between").between(2, 5);
    const reversed = createRng("between").between(5, 2);
    expect(normal).toBeGreaterThanOrEqual(2);
    expect(normal).toBeLessThanOrEqual(5);
    expect(reversed).toBe(normal);
  });

  it("picks values, rejects empty input, and clamps sample sizes", () => {
    expect([1, 2]).toContain(createRng("pick").pick([1, 2]));
    expect(() => createRng("pick").pick([])).toThrow("empty array");
    expect(createRng("sample-low").sample([1, 2], -1)).toEqual([]);
    expect(createRng("sample-high").sample([1, 2], 20)).toHaveLength(2);
    expect(createRng("shuffle-empty").shuffle([])).toEqual([]);
  });
});

describe("contradiction selection branches", () => {
  it("uses every documented ranking tie-break in order", () => {
    const base = contradiction("z");
    const evidence = contradiction("e", { category: "EVIDENCE_COLLISION" });
    expect(rankContradictions([base, evidence])[0]).toBe(evidence);

    const severe = contradiction("severe", { severity: 9 });
    expect(rankContradictions([base, severe])[0]).toBe(severe);

    const important = contradiction("important", { narrativeImportance: 9 });
    expect(rankContradictions([base, important])[0]).toBe(important);

    const manyPlayers = contradiction("many", { involvedPlayers: ["p1", "p2"] });
    expect(rankContradictions([manyPlayers, base])[0]).toBe(base);

    const alpha = contradiction("a");
    expect(rankContradictions([base, alpha])[0]).toBe(alpha);
  });

  it("deduplicates by key, keeps the strongest instance, and skips releases", () => {
    const low = contradiction("same", { severity: 1 });
    const high = contradiction("same", { severity: 9 });
    const other = contradiction("other", { category: "COLOCATION" });
    const gameCase = {
      ...CASE,
      contradictionRules: [
        {
          id: "test-rule",
          category: "DIRECT_IMPOSSIBILITY" as const,
          severity: 1,
          narrativeImportance: 1,
          detect: () => [low, high, other],
        },
      ],
    };
    const context = {} as DetectionContext;

    expect(detectAll(context, gameCase)).toEqual([low, high, other]);
    expect(selectNextContradiction(context, gameCase, [])).toBe(high);
    expect(selectNextContradiction(context, gameCase, [contradictionKey(high)])).toBe(other);
    expect(
      selectNextContradiction(context, gameCase, [contradictionKey(high), contradictionKey(other)]),
    ).toBeNull();
  });

  it("handles a case with no contradiction candidates", () => {
    const gameCase = { ...CASE, contradictionRules: [] };
    expect(detectAll({} as DetectionContext, gameCase)).toEqual([]);
    expect(selectNextContradiction({} as DetectionContext, gameCase, [])).toBeNull();
  });
});

describe("patch application and vote branches", () => {
  it("resolves primary, secondary, and static commitments with score filtering", () => {
    const selected: PatchDefinition = {
      ...patch("patch.coverage", {
        consistency: -2,
        plausibility: 0,
        stability: undefined,
      }),
      commitments: [
        {
          factKey: "primary",
          fromContradiction: "primaryPlayer",
          label: { ar: "{{player}} / {{A}}" },
        },
        {
          factKey: "secondary",
          fromContradiction: "secondaryPlayer",
          label: { ar: "{{player}} / {{B}}" },
        },
        { factKey: "static", value: "known", label: { ar: "static" } },
        { factKey: "empty", label: { ar: "empty" } },
      ],
      followUpQuestionIds: ["q.followup"],
    };
    const detected = contradiction("patch-rule", {
      involvedPlayers: ["p1", "p2"],
    });

    const applied = applyPatch(selected, detected, CASE, (id) => `name:${id}`);

    expect(applied.commitments.map(({ value }) => value)).toEqual(["p1", "p2", "known", ""]);
    expect(applied.commitments[0]).toMatchObject({
      playerId: "p1",
      label: { ar: "name:p1 / name:p1" },
    });
    expect(applied.ledgerAdditions.map(({ reasonCode }) => reasonCode)).toEqual([
      "patch.patch.coverage",
      "stability.patch_applied",
    ]);
    expect(applied.followUpQuestionIds).toEqual(["q.followup"]);
  });

  it("handles contradictions without player references", () => {
    const selected = patch("patch.no-player", {});
    selected.commitments = [
      {
        factKey: "none",
        fromContradiction: "primaryPlayer",
        label: { ar: "{{player}}" },
      },
    ];
    const applied = applyPatch(
      selected,
      contradiction("no-player", { involvedPlayers: [] }),
      CASE,
      (id) => id,
    );
    expect(applied.commitments[0]).not.toHaveProperty("playerId");
    expect(applied.commitments[0]!.value).toBe("");
  });

  it("resolves votes by count, then cost, then stable id", () => {
    const costly = patch("b-costly", { consistency: -8 });
    const cheap = patch("c-cheap", { consistency: -1, evasion: 2 });
    const sameCostEarlier = patch("a-cheap", { consistency: -1 });

    expect(resolvePatchVote({}, [])).toBeNull();
    expect(resolvePatchVote({ p1: costly.id, p2: costly.id, p3: cheap.id }, [cheap, costly])).toBe(
      costly.id,
    );
    expect(resolvePatchVote({ p1: costly.id, p2: cheap.id }, [costly, cheap])).toBe(cheap.id);
    expect(resolvePatchVote({}, [cheap, sameCostEarlier])).toBe(sameCostEarlier.id);
  });

  it("filters applicable patch categories", () => {
    const detected = contradiction("category", { category: "COLOCATION" });
    const gameCase = {
      ...CASE,
      patches: [
        patch("direct", {}),
        { ...patch("colocation", {}), resolvesCategories: ["COLOCATION" as const] },
      ],
    };
    expect(
      gameCase.patches
        .filter((candidate) => candidate.resolvesCategories.includes(detected.category))
        .map(({ id }) => id),
    ).toEqual(["colocation"]);
  });
});

describe("public and private view branches", () => {
  const question = {
    instanceId: "instance:p1",
    questionId: "q.coverage",
    tag: "coverage",
    family: "gaps" as const,
    prompt: { ar: "سؤال" },
    options: [{ id: "yes", label: { ar: "نعم" }, normalized: "yes" }],
  };

  it("maps every allowed-action phase family and lock branch", () => {
    const phases: [PhaseId, string[]][] = [
      ["CASE_BRIEF", ["ACKNOWLEDGE"]],
      ["PLAN_REASON", ["STORY_PROPOSE", "STORY_CONFIRM"]],
      ["INTERROGATION_GAPS", ["ANSWER"]],
      ["PATCH_1", ["PATCH_VOTE"]],
      ["CONTRADICTION_REVEAL_1", ["WAIT"]],
    ];
    for (const [phase, allowedActions] of phases) {
      const privateView = toPrivateView(
        state({
          phase,
          questionsByPlayer: { p1: question },
          acknowledgedThisPhase: [],
          answeredThisPhase: [],
        }),
        CASE,
        "p1",
      );
      expect(privateView.allowedActions).toEqual(allowedActions);
    }

    expect(
      toPrivateView(state({ phase: "CASE_BRIEF", acknowledgedThisPhase: ["p1"] }), CASE, "p1")
        .allowedActions,
    ).toEqual(["WAIT"]);
    expect(
      toPrivateView(
        state({
          phase: "INTERROGATION_GAPS",
          questionsByPlayer: { p1: question },
          answeredThisPhase: ["p1"],
        }),
        CASE,
        "p1",
      ).allowedActions,
    ).toEqual(["WAIT"]);
  });

  it("handles missing evidence, hidden questions, missing submissions, and unknown players", () => {
    const noEvidence = toPrivateView(
      state({
        phase: "PLAN_REASON",
        privateEvidenceByPlayer: { p1: ["unknown-evidence"] },
        questionsByPlayer: { p1: question },
      }),
      CASE,
      "p1",
    );
    expect(noEvidence.privateEvidence).toBeNull();
    expect(noEvidence.currentQuestion).toBeNull();

    const noSubmission = toPrivateView(
      state({
        phase: "INTERROGATION_GAPS",
        questionsByPlayer: { p1: question },
        answeredThisPhase: ["p1"],
        answers: [],
      }),
      CASE,
      "p1",
    );
    expect(noSubmission.answerLocked).toBe(false);
    expect(() => toPrivateView(state(), CASE, "missing")).toThrow("unknown player");
  });

  it("projects released contradiction fallbacks, patch choices, and evidence timestamps", () => {
    const detected = contradiction("released", {
      involvedPlayers: ["p1", "missing-player"],
      params: { owner: "p1", absent: "missing-player" },
      playerParams: ["owner", "absent", "unset"],
      explanation: { ar: "{{owner}} / {{absent}}" },
    });
    const releasedKey = contradictionKey(detected);
    const gameCase: GameCase = {
      ...CASE,
      immutableEvidence: [
        ...CASE.immutableEvidence,
        { id: "no-time", title: { ar: "بلا وقت" }, detail: { ar: "تفصيل" } },
      ],
    };
    const publicView = toPublicView(
      state({
        phase: "PATCH_1",
        detectedContradictions: [detected],
        releasedContradictionIds: [releasedKey],
        releasedContradictionByPhase: { CONTRADICTION_REVEAL_1: releasedKey },
        revealedEvidenceIds: [CASE.immutableEvidence[0]!.id, "no-time", CASE.surpriseEvidence.id],
      }),
      gameCase,
      "ABCD",
      5_000,
    );

    expect(publicView.releasedContradiction).toMatchObject({
      statementA: { ar: "Player 1 / missing-player" },
      involvedPlayerNames: ["Player 1", "missing-player"],
    });
    expect(publicView.patchOptions).not.toBeNull();
    expect(publicView.evidence.some(({ id }) => id === "no-time")).toBe(true);
  });

  it("uses explicit contradiction copy and hides a release key with no candidate", () => {
    const detected = contradiction("explicit", {
      statementA: { ar: "أ" },
      statementB: { ar: "ب" },
      rule: { ar: "قاعدة" },
    });
    const explicit = toPublicView(
      state({
        phase: "CONTRADICTION_REVEAL_2",
        detectedContradictions: [detected],
        releasedContradictionIds: [contradictionKey(detected)],
        releasedContradictionByPhase: {
          CONTRADICTION_REVEAL_2: contradictionKey(detected),
        },
      }),
      CASE,
      "ABCD",
      5_000,
    );
    expect(explicit.releasedContradiction).toMatchObject({
      statementA: { ar: "أ" },
      statementB: { ar: "ب" },
      rule: { ar: "قاعدة" },
    });

    const missing = toPublicView(
      state({
        phase: "PATCH_2",
        detectedContradictions: [],
        releasedContradictionIds: ["missing"],
      }),
      CASE,
      "ABCD",
      5_000,
    );
    expect(missing.releasedContradiction).toBeNull();
    expect(missing.patchOptions).toBeNull();
  });

  it("sanitizes result factors and resolves available names and patches", () => {
    const detected = contradiction("first");
    const firstKey = contradictionKey(detected);
    const firstPatch = CASE.patches[0]!;
    const secondPatch = CASE.patches[1]!;
    const resultState = state({
      phase: "RESULTS",
      detectedContradictions: [detected],
      releasedContradictionIds: [firstKey],
      releasedContradictionByPhase: { CONTRADICTION_REVEAL_1: firstKey },
      selectedPatches: [
        { patchId: firstPatch.id, phase: "PATCH_1", contradictionKey: firstKey },
        { patchId: "missing-patch", phase: "PATCH_1", contradictionKey: firstKey },
        { patchId: secondPatch.id, phase: "PATCH_2", contradictionKey: firstKey },
      ],
      verdict: {
        band: "B",
        label: { ar: "ب" },
        summary: { ar: "ملخص" },
        composite: 80,
        scores: { consistency: 80, plausibility: 80, stability: 80, evasion: 0 },
        decisiveFactors: [
          { ar: "عامل" },
          { ar: "عامل" },
          { ar: "{{unresolved}}" },
          { ar: "عامل إنجليزي", en: "{{missing}}" },
        ],
        mostConsistentPlayerId: "p1",
        primarySuspectPlayerId: "missing-player",
        evaluationStatus: "complete",
        diagnosticCode: null,
      },
    });

    const publicView = toPublicView(resultState, CASE, "ABCD", 5_000);
    expect(publicView.result).toMatchObject({
      decisiveFactors: [{ ar: "عامل" }],
      mostConsistentPlayerName: "Player 1",
      primarySuspectPlayerName: null,
    });
    expect(publicView.result!.firstFracture).not.toBeNull();
    expect(publicView.result!.strongestPatch).not.toBeNull();
    expect(publicView.result!.costliestPatch).not.toBeNull();
  });

  it("covers result null attribution and both private result-note outcomes", () => {
    const verdict = {
      band: "C" as const,
      label: { ar: "ج" },
      summary: { ar: "ملخص" },
      composite: 60,
      scores: { consistency: 60, plausibility: 60, stability: 60, evasion: 0 },
      decisiveFactors: [],
      mostConsistentPlayerId: "p1",
      primarySuspectPlayerId: "p2",
      evaluationStatus: "complete" as const,
      diagnosticCode: null,
    };
    const resultState = state({ phase: "VERDICT", verdict });
    expect(toPrivateView(resultState, CASE, "p1").ownResultNote).not.toBeNull();
    expect(toPrivateView(resultState, CASE, "p2").ownResultNote).not.toBeNull();
    expect(toPrivateView(resultState, CASE, "p3").ownResultNote).toBeNull();

    const publicView = toPublicView(
      state({
        phase: "VERDICT",
        verdict: {
          ...verdict,
          mostConsistentPlayerId: null,
          primarySuspectPlayerId: null,
        },
      }),
      CASE,
      "ABCD",
      5_000,
    );
    expect(publicView.result).toMatchObject({
      firstFracture: null,
      strongestPatch: null,
      costliestPatch: null,
      mostConsistentPlayerName: null,
      primarySuspectPlayerName: null,
    });
  });
});
