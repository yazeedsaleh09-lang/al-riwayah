import { describe, expect, it } from "vitest";
import {
  BANK_EVIDENCE_OPTION_FITS_BY_PACKET,
  BANK_SCORING_CANONICAL_SELECTION,
  BANK_STORY_OPTION_FITS,
  bankAlSahaV1,
} from "../../content/src/index";
import {
  createBankMatch,
  deriveBankScoreChecks,
  finalizeBankMatch,
  type BankAnswerPhase,
  type BankMatchState,
  type BankPlayerInput,
  type BankRepairId,
  type BankTruthPacketId,
} from "../src/bank-al-saha";

const NAMES = ["Saud", "Yazid", "Fahad", "Rakan", "Nawaf", "Joud"] as const;
const ROLES = ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"] as const;

function players(count: 4 | 5 | 6): BankPlayerInput[] {
  return NAMES.slice(0, count).map((name, joinOrder) => ({
    id: `player-${joinOrder + 1}`, name, joinOrder, isHost: joinOrder === 0,
  }));
}

function scoringState(
  count: 4 | 5 | 6,
  repairId: BankRepairId,
  truthPacketId: BankTruthPacketId,
): BankMatchState {
  const initial = createBankMatch({
    matchId: `predicate-${count}-${repairId}-${truthPacketId}`,
    seed: "predicate", players: players(count), truthPacketId, caseDefinition: bankAlSahaV1,
  });
  const answers = initial.players.flatMap(({ id }) => {
    const assignment = initial.assignments[id]!;
    const first = assignment.firstQuestion.options[0]!;
    const forensicQuestion = assignment.forensicQuestions[repairId];
    const forensic = forensicQuestion.options[0]!;
    return [
      { playerId: id, phase: "first_investigation" as const, questionId: assignment.firstQuestion.id, optionId: first.id, normalizedFacts: first.normalizedFacts },
      { playerId: id, phase: "forensic_investigation" as const, questionId: forensicQuestion.id, optionId: forensic.id, normalizedFacts: forensic.normalizedFacts },
    ];
  });
  return { ...initial, selectedRepairId: repairId, answers };
}

function replaceAnswer(
  state: BankMatchState,
  playerId: string,
  phase: BankAnswerPhase,
  option: { id: string; normalizedFacts: Readonly<Record<string, string | number | boolean | null>> },
): BankMatchState {
  return {
    ...state,
    answers: state.answers.map((answer) => answer.playerId === playerId && answer.phase === phase
      ? { ...answer, optionId: option.id, normalizedFacts: option.normalizedFacts }
      : answer),
  };
}

const STORY_FACT_KEYS = {
  saud_location: (state: BankMatchState) => `alarm_location:${state.players[0]!.id}`,
  key_holder: () => "vehicle_key_holder",
  bag_holder: () => "suspicious_object_holder",
  door_witness: () => "cafe_door_witness",
  parking_sightline: () => "parking_camera_sightline",
} as const;

function normalizedStoryValue(state: BankMatchState, referenceFactKey: keyof typeof STORY_FACT_KEYS, value: string): string {
  if (referenceFactKey === "saud_location") {
    return value === "parking_vehicle" ? "parking" : value === "cafe_counter" ? "cafe" : value;
  }
  const roleIndex = state.players.findIndex(({ id }) => id === value);
  return ROLES[roleIndex] ?? value;
}

describe("Bank Al-Saha authored story and evidence scoring predicates", () => {
  it.each([4, 5, 6] as const)("scores real story matches and mismatches for every %i-player first question", (count) => {
    const base = scoringState(count, "movement", "movement_true");
    for (const owner of base.players) {
      const question = base.assignments[owner.id]!.firstQuestion;
      const predicate = BANK_STORY_OPTION_FITS[question.id]!;
      expect(question.checks.storyOptionFits).toEqual(predicate);
      const referenceFactKey = predicate.referenceFactKey as keyof typeof STORY_FACT_KEYS;
      const factKey = STORY_FACT_KEYS[referenceFactKey](base);
      const storyAssignment = base.storyAssignments.find((assignment) => assignment.factKey === factKey)!;
      const observed = new Set<number>();
      for (const option of question.options) {
        for (const storyOption of storyAssignment.options) {
          const storyValue = normalizedStoryValue(base, referenceFactKey, String(storyOption.value));
          const expected = predicate.byOptionId[option.id]?.[storyValue];
          const state = replaceAnswer({
            ...base, storyFacts: { ...base.storyFacts, [factKey]: storyOption.value },
          }, owner.id, "first_investigation", option);
          expect(deriveBankScoreChecks(state)[owner.id]?.firstStoryFit?.fit).toBe(expected);
          if (expected !== undefined) observed.add(expected);
        }
      }
      expect(observed.has(1)).toBe(true);
      expect(observed.has(0)).toBe(true);
    }
  });

  it.each([
    [4, "movement"], [4, "identity"], [5, "movement"], [5, "identity"],
    [6, "movement"], [6, "identity"],
  ] as const)("scores real evidence matches and mismatches for every %i-player %s question", (count, repairId) => {
    for (const owner of players(count)) {
      const observed = new Set<number>();
      for (const packet of ["movement_true", "identity_true", "ambiguous"] as const) {
        const base = scoringState(count, repairId, packet);
        const question = base.assignments[owner.id]!.forensicQuestions[repairId];
        const oracle = BANK_EVIDENCE_OPTION_FITS_BY_PACKET[question.id]!;
        expect(question.checks.evidenceOptionFitsByPacket).toEqual(oracle);
        for (const option of question.options) {
          const state = replaceAnswer(base, owner.id, "forensic_investigation", option);
          const expected = oracle[packet]![option.id];
          expect(deriveBankScoreChecks(state)[owner.id]?.forensicEvidenceFit?.fit).toBe(expected);
          if (expected !== undefined) observed.add(expected);
        }
      }
      expect(observed.has(1)).toBe(true);
      expect(observed.has(0)).toBe(true);
      expect(observed.has(0.5)).toBe(true);
    }
  });

  it("varies the cited 5-player doorway marker by marker and truth packet", () => {
    const fits = (packet: BankTruthPacketId, optionId: "jacket" | "key-tag") => {
      const state = scoringState(5, "identity", packet);
      const question = state.assignments["player-2"]!.forensicQuestions.identity;
      const option = question.options.find(({ id }) => id === optionId)!;
      return deriveBankScoreChecks(replaceAnswer(state, "player-2", "forensic_investigation", option))["player-2"]?.forensicEvidenceFit?.fit;
    };
    expect([fits("movement_true", "jacket"), fits("movement_true", "key-tag")]).toEqual([0, 1]);
    expect([fits("identity_true", "jacket"), fits("identity_true", "key-tag")]).toEqual([1, 0]);
    expect(fits("ambiguous", "jacket")).toBe(0.5);
  });

  it("varies the cited 6-player crossing-person answer with the locked story", () => {
    const base = scoringState(6, "movement", "movement_true");
    const question = base.assignments["player-5"]!.firstQuestion;
    const answer = question.options.find(({ id }) => id === "saud")!;
    const story = base.storyAssignments.find(({ factKey }) => factKey === "cafe_door_witness")!;
    const fit = (storyOptionId: string) => {
      const choice = story.options.find(({ id }) => id === storyOptionId)!;
      const state = replaceAnswer({ ...base, storyFacts: { ...base.storyFacts, [story.factKey]: choice.value } }, "player-5", "first_investigation", answer);
      return deriveBankScoreChecks(state)["player-5"]?.firstStoryFit?.fit;
    };
    expect(fit("player-1")).toBe(1);
    expect(fit("player-2")).toBe(0);
  });

  it.each([4, 5, 6] as const)(
    "keeps the deliberately authored %i-player canonical ranking complete",
    (count) => {
      const selection = BANK_SCORING_CANONICAL_SELECTION[count];
      let state = scoringState(count, selection.repairId, selection.truthPacketId);
      for (const owner of state.players) {
        const assignment = state.assignments[owner.id]!;
        const first = assignment.firstQuestion.options.find(({ id }) =>
          id === selection.firstOptionByQuestionId[assignment.firstQuestion.id])!;
        const forensicQuestion = assignment.forensicQuestions[selection.repairId];
        const forensic = forensicQuestion.options.find(({ id }) =>
          id === selection.forensicOptionByQuestionId[forensicQuestion.id])!;
        state = replaceAnswer(replaceAnswer(state, owner.id, "first_investigation", first), owner.id, "forensic_investigation", forensic);
      }
      for (const [key, semanticValue] of Object.entries(selection.storyFacts)) {
        const referenceFactKey = key as keyof typeof STORY_FACT_KEYS;
        const factKey = STORY_FACT_KEYS[referenceFactKey](state);
        const storyAssignment = state.storyAssignments.find((assignment) => assignment.factKey === factKey)!;
        const choice = storyAssignment.options.find(({ value }) =>
          normalizedStoryValue(state, referenceFactKey, String(value)) === semanticValue)!;
        state = { ...state, storyFacts: { ...state.storyFacts, [factKey]: choice.value } };
      }
      const checks = deriveBankScoreChecks(state);
      expect(finalizeBankMatch({ ...state, phase: "GROUP_VERDICT" }, checks).rankingStatus).toBe("complete");
    },
  );

  it("omits story and evidence checks when neither a predicate nor comparable facts exist", () => {
    const definition = structuredClone(bankAlSahaV1);
    delete definition.questionMatrix[6].first[4]!.checks.storyOptionFits;
    delete definition.questionMatrix[5].identity[1]!.checks.evidenceOptionFitsByPacket;
    const storyState = scoringState(6, "movement", "movement_true");
    const evidenceState = scoringState(5, "identity", "identity_true");
    const withoutStoryPredicate = createBankMatch({ matchId: "no-story", seed: "no-story", players: players(6), truthPacketId: "movement_true", caseDefinition: definition });
    expect(withoutStoryPredicate.assignments["player-5"]!.firstQuestion.checks.storyOptionFits).toBeUndefined();
    const withoutEvidencePredicate = createBankMatch({ matchId: "no-evidence", seed: "no-evidence", players: players(5), truthPacketId: "identity_true", caseDefinition: definition });
    const storyChecks = deriveBankScoreChecks({ ...storyState, assignments: withoutStoryPredicate.assignments });
    const evidenceChecks = deriveBankScoreChecks({ ...evidenceState, assignments: withoutEvidencePredicate.assignments });
    expect(storyChecks["player-5"]).not.toHaveProperty("firstStoryFit");
    expect(evidenceChecks["player-2"]).not.toHaveProperty("forensicEvidenceFit");
  });
});
