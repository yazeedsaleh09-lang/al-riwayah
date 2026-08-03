import { describe, expect, it } from "vitest";
import {
  BANK_LINKED_CANONICAL_SELECTION,
  BANK_SCORING_CANONICAL_SELECTION,
  BANK_LINKED_OPTION_COMPATIBILITY,
  BANK_STORY_OPTION_FITS,
  BANK_EVIDENCE_OPTION_FITS_BY_PACKET,
  BANK_AL_SAHA_CASE_ID,
  DEFAULT_CASE_ID,
  bankAlSahaV1,
  getCase,
  publicCaseSummaries,
  validateBankAlSahaCase,
} from "../src/index";
import { areBankLinkedOptionsCompatible } from "../src/cases/bank-al-saha-question-options";

const playerCounts = [4, 5, 6] as const;
const forbiddenLaunchLabels = /\b(?:experimental|beta|preview|V2|test case)\b/i;
const internalSeatCode = /\bP[1-6]\b/;
const playerRoles = ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"] as const;

function visibleCopy(value: unknown, path = "root"): string[] {
  if (typeof value === "string") return path.endsWith(".ar") ? [value] : [];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => visibleCopy(entry, `${path}.${index}`));
  }
  return Object.entries(value).flatMap(([key, entry]) => visibleCopy(entry, `${path}.${key}`));
}

describe("Bank Al-Saha canonical authored content", () => {
  it("is the only public and default 10–15 minute case", () => {
    expect(bankAlSahaV1.id).toBe(BANK_AL_SAHA_CASE_ID);
    expect(bankAlSahaV1.title.ar).toBe("قضية بنك الساحة");
    expect(bankAlSahaV1.durationMinutes).toEqual([10, 15]);
    expect(DEFAULT_CASE_ID).toBe(BANK_AL_SAHA_CASE_ID);
    expect(getCase(DEFAULT_CASE_ID)).toBe(bankAlSahaV1);
    expect(publicCaseSummaries()).toEqual([
      expect.objectContaining({
        id: BANK_AL_SAHA_CASE_ID,
        title: { ar: "قضية بنك الساحة" },
        playerCounts: [4, 5, 6],
        durationMinutes: [10, 15],
        status: "available",
      }),
    ]);
  });

  it.each(playerCounts)(
    "authors one first and two genuinely branch-specific questions for every one of %i players",
    (count) => {
      const matrix = bankAlSahaV1.questionMatrix[count];

      expect(matrix.first).toHaveLength(count);
      expect(matrix.movement).toHaveLength(count);
      expect(matrix.identity).toHaveLength(count);
      expect(new Set(matrix.first.map(({ seatKey }) => seatKey)).size).toBe(count);
      expect(new Set(matrix.movement.map(({ seatKey }) => seatKey)).size).toBe(count);
      expect(new Set(matrix.identity.map(({ seatKey }) => seatKey)).size).toBe(count);
      expect(matrix.movement.map(({ id }) => id)).not.toEqual(matrix.identity.map(({ id }) => id));

      for (const question of [...matrix.first, ...matrix.movement, ...matrix.identity]) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.factKeys.length).toBeGreaterThan(0);
        expect(question.comparisonRefs.length).toBeGreaterThan(0);
      }
      for (const question of matrix.first) {
        expect(question.checks.storyRef).toBeTruthy();
        expect(question.checks.firstLinkedRef).toBeTruthy();
      }
      for (const question of [...matrix.movement, ...matrix.identity]) {
        expect(question.checks.repairRef).toBeTruthy();
        expect(question.checks.evidenceRef).toBeTruthy();
        expect(question.checks.finalLinkedRef).toBeTruthy();
      }
    },
  );

  it.each(playerCounts)(
    "gives every %i-player first question one explicit, existing, non-self linked target",
    (count) => {
      const availableRoles: readonly string[] = playerRoles.slice(0, count);
      for (const [index, question] of bankAlSahaV1.questionMatrix[count].first.entries()) {
        const linkedRefs = question.comparisonRefs.filter((ref) => ref.startsWith("linked."));
        expect(linkedRefs).toEqual([question.checks.firstLinkedRef]);
        const target = question.checks.firstLinkedRef!.slice("linked.".length);
        expect(availableRoles).toContain(target);
        expect(target).not.toBe(playerRoles[index]);
      }
    },
  );

  it.each(playerCounts)(
    "gives every %i-player forensic question one explicit, existing, non-self linked target",
    (count) => {
      const availableRoles: readonly string[] = playerRoles.slice(0, count);
      for (const set of ["movement", "identity"] as const) {
        for (const [index, question] of bankAlSahaV1.questionMatrix[count][set].entries()) {
          const linkedRefs = question.comparisonRefs.filter((ref) => ref.startsWith("linked."));
          expect(linkedRefs).toEqual([question.checks.finalLinkedRef]);
          const target = question.checks.finalLinkedRef!.slice("linked.".length);
          expect(availableRoles).toContain(target);
          expect(target).not.toBe(playerRoles[index]);
        }
      }
    },
  );

  it.each(playerCounts)(
    "authors real matching and mismatching option pairs for every %i-player linked check",
    (count) => {
      const rolesForCount: readonly string[] = playerRoles.slice(0, count);
      for (const set of ["first", "movement", "identity"] as const) {
        for (const question of bankAlSahaV1.questionMatrix[count][set]) {
          const ref = set === "first" ? question.checks.firstLinkedRef! : question.checks.finalLinkedRef!;
          const targetIndex = rolesForCount.indexOf(ref.slice("linked.".length));
          const target = bankAlSahaV1.questionMatrix[count][set][targetIndex]!;
          const mapping = question.checks.linkedOptionMatches!;
          expect(mapping).toEqual(BANK_LINKED_OPTION_COMPATIBILITY[question.id]);
          expect(Object.keys(mapping).sort()).toEqual(question.options.map(({ id }) => id).sort());
          const selectedOwnerId = BANK_LINKED_CANONICAL_SELECTION[count][set][question.id]!;
          const selectedTargetId = BANK_LINKED_CANONICAL_SELECTION[count][set][target.id]!;
          expect(mapping[selectedOwnerId]).toContain(selectedTargetId);
          for (const option of question.options) {
            expect(mapping[option.id]!.length).toBeGreaterThan(0);
            expect(mapping[option.id]!.every((id) => target.options.some(({ id: targetId }) => targetId === id))).toBe(true);
            expect(target.options.some(({ id }) => !mapping[option.id]!.includes(id))).toBe(true);
            for (const targetOption of target.options) {
              expect(mapping[option.id]!.includes(targetOption.id)).toBe(
                areBankLinkedOptionsCompatible(set, option, targetOption),
              );
            }
          }
          expect(BANK_LINKED_CANONICAL_SELECTION[count][set][question.id]).toBeTruthy();
        }
      }
    },
  );

  it("keeps parking without the key compatible with parking, never the petrol station", () => {
    const owner = bankAlSahaV1.questionMatrix[4].first[0]!;
    const target = bankAlSahaV1.questionMatrix[4].first[1]!;
    expect(owner.checks.linkedOptionMatches?.["parking-no-key"]).toContain("parking");
    expect(owner.checks.linkedOptionMatches?.["parking-no-key"]).not.toContain("station");
    expect(areBankLinkedOptionsCompatible(
      "first",
      owner.options.find(({ id }) => id === "parking-no-key")!,
      target.options.find(({ id }) => id === "station")!,
    )).toBe(false);
  });

  it.each(playerCounts)("authors exhaustive story and packet-evidence outcomes for %i players", (count) => {
    for (const question of bankAlSahaV1.questionMatrix[count].first) {
      const predicate = question.checks.storyOptionFits!;
      expect(predicate).toEqual(BANK_STORY_OPTION_FITS[question.id]);
      expect(Object.keys(predicate.byOptionId).sort()).toEqual(question.options.map(({ id }) => id).sort());
      const allOutcomes: Array<0 | 0.5 | 1> = [];
      for (const option of question.options) {
        const outcomes = Object.values(predicate.byOptionId[option.id]!);
        allOutcomes.push(...outcomes);
        expect(outcomes).not.toContain(0.5);
      }
      expect(allOutcomes).toContain(1);
      expect(allOutcomes).toContain(0);
    }
    for (const set of ["movement", "identity"] as const) {
      for (const question of bankAlSahaV1.questionMatrix[count][set]) {
        const predicate = question.checks.evidenceOptionFitsByPacket!;
        expect(predicate).toEqual(BANK_EVIDENCE_OPTION_FITS_BY_PACKET[question.id]);
        for (const packet of ["movement_true", "identity_true"] as const) {
          expect(Object.values(predicate[packet]).every((fit) => fit === 0 || fit === 1)).toBe(true);
        }
        const decisiveOutcomes = [
          ...Object.values(predicate.movement_true),
          ...Object.values(predicate.identity_true),
        ];
        expect(decisiveOutcomes).toContain(1);
        expect(decisiveOutcomes).toContain(0);
        expect(new Set(Object.values(predicate.ambiguous))).toEqual(new Set([0.5]));
      }
    }
  });

  it("makes the 5-player doorway marker packet-specific and the 6-player crossing story-specific", () => {
    const marker = bankAlSahaV1.questionMatrix[5].identity[1]!.checks.evidenceOptionFitsByPacket!;
    expect(marker.movement_true).toMatchObject({ jacket: 0, "key-tag": 1 });
    expect(marker.identity_true).toMatchObject({ jacket: 1, "key-tag": 0 });
    expect(marker.ambiguous).toMatchObject({ jacket: 0.5, "key-tag": 0.5 });

    const crossing = bankAlSahaV1.questionMatrix[6].first[4]!.checks.storyOptionFits!;
    expect(crossing.referenceFactKey).toBe("door_witness");
    expect(crossing.byOptionId.saud).toMatchObject({ saud: 1, nawaf: 0 });
    expect(crossing.byOptionId.nawaf).toMatchObject({ saud: 0, nawaf: 1 });
  });

  it.each(playerCounts)("provides one explicit coherent end-to-end scoring selection for %i players", (count) => {
    const selection = BANK_SCORING_CANONICAL_SELECTION[count];
    const matrix = bankAlSahaV1.questionMatrix[count];
    expect(selection.truthPacketId).toBe("movement_true");
    expect(selection.repairId).toBe("movement");

    for (const question of matrix.first) {
      const optionId = selection.firstOptionByQuestionId[question.id]!;
      expect(question.options.some(({ id }) => id === optionId)).toBe(true);
      const story = question.checks.storyOptionFits!;
      expect(story.byOptionId[optionId]![selection.storyFacts[story.referenceFactKey]!]).toBe(1);
    }
    for (const question of matrix.movement) {
      const optionId = selection.forensicOptionByQuestionId[question.id]!;
      expect(question.options.some(({ id }) => id === optionId)).toBe(true);
      expect(question.checks.evidenceOptionFitsByPacket!.movement_true[optionId]).toBe(1);
    }
    for (const set of ["first", "movement"] as const) {
      const selected = set === "first"
        ? selection.firstOptionByQuestionId
        : selection.forensicOptionByQuestionId;
      for (const question of matrix[set]) {
        const targetRole = (set === "first"
          ? question.checks.firstLinkedRef
          : question.checks.finalLinkedRef)!.slice("linked.".length);
        const target = matrix[set][playerRoles.slice(0, count).indexOf(targetRole)]!;
        expect(question.checks.linkedOptionMatches![selected[question.id]!]).toContain(selected[target.id]);
      }
    }
  });

  it("defines exactly two repairs whose evidence and final questions are causally distinct", () => {
    expect(Object.keys(bankAlSahaV1.repairBranches).sort()).toEqual(["identity", "movement"]);
    const { movement, identity } = bankAlSahaV1.repairBranches;

    expect(movement.evidenceRequestId).not.toBe(identity.evidenceRequestId);
    expect(movement.forensicQuestionSet).toBe("movement");
    expect(identity.forensicQuestionSet).toBe("identity");
    expect(movement.officialFacts).toContainEqual({
      factKey: "location:saud:11:44",
      value: "cafe_entrance",
    });
    expect(identity.officialFacts).toContainEqual({
      factKey: "doorway_figure:11:44",
      value: "nawaf",
    });
    expect(bankAlSahaV1.evidenceRequests[movement.evidenceRequestId]?.causedByRepairId).toBe(
      "movement",
    );
    expect(bankAlSahaV1.evidenceRequests[identity.evidenceRequestId]?.causedByRepairId).toBe(
      "identity",
    );
  });

  it("authors every shared-account fact needed by the causal 4–6 player scene", () => {
    expect(bankAlSahaV1.scene.requiredFacts.map(({ id }) => id)).toEqual([
      "near_bank_reason",
      "alarm_location",
      "vehicle_key_holder",
      "suspicious_object_holder",
      "departure_plan",
      "cafe_door_witness",
      "parking_camera_sightline",
    ]);
  });

  it("ships exactly three pre-authored truth packets without post-vote truth selection", () => {
    expect(Object.keys(bankAlSahaV1.truthPackets).sort()).toEqual([
      "ambiguous",
      "identity_true",
      "movement_true",
    ]);
    for (const packet of Object.values(bankAlSahaV1.truthPackets)) {
      expect(packet.lockAt).toBe("match_creation");
      expect(packet.repairOutcomes.movement).toBeDefined();
      expect(packet.repairOutcomes.identity).toBeDefined();
      expect(packet.evidenceByRequest["parking-cafe-camera-chain"]).toBeTruthy();
      expect(packet.evidenceByRequest["doorway-identity-enhancement"]).toBeTruthy();
    }
  });

  it("contains no banned launch labels or internal P1–P6 codes in visible copy", () => {
    const copy = visibleCopy(bankAlSahaV1);
    expect(copy.length).toBeGreaterThan(50);
    expect(copy.filter((value) => forbiddenLaunchLabels.test(value))).toEqual([]);
    expect(copy.filter((value) => internalSeatCode.test(value))).toEqual([]);
  });

  it("passes the Bank validator", () => {
    expect(validateBankAlSahaCase(bankAlSahaV1)).toEqual({ ok: true, errors: [] });
  });

  it("rejects incomplete matrices, non-causal evidence and malformed truth packets", () => {
    const invalid = structuredClone(bankAlSahaV1);
    invalid.questionMatrix[4].identity.pop();
    invalid.evidenceRequests["parking-cafe-camera-chain"]!.causedByRepairId = "identity";
    delete invalid.truthPackets.ambiguous.evidenceByRequest["doorway-identity-enhancement"];

    expect(validateBankAlSahaCase(invalid)).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        "Question set identity has 3 questions for 4 players; expected 4.",
        "Evidence request parking-cafe-camera-chain is not caused by repair movement.",
        "Truth packet ambiguous has no evidence for doorway-identity-enhancement.",
      ]),
    });
  });

  it("rejects evidence map keys and packet evidence that drift from authored ids", () => {
    const invalid = structuredClone(bankAlSahaV1);
    invalid.evidenceRequests["parking-cafe-camera-chain"]!.id = "runtime_camera_chain";
    invalid.truthPackets.ambiguous.evidenceByRequest.unvalidated_extra = {
      visual: { ar: "ط¯ظ„ظٹظ„ ط²ط§ط¦ط¯" },
      relevance: { ar: "ظ…ط§ ظ„ظ‡ ظ…طµط¯ط± ظ…ط¤ظ„ظپ" },
    };

    expect(validateBankAlSahaCase(invalid)).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        "Evidence request map key parking-cafe-camera-chain does not match id runtime_camera_chain.",
        "Truth packet ambiguous has unknown evidence unvalidated_extra.",
      ]),
    });
  });

  it("rejects missing, unknown, and self-referential first linked targets", () => {
    const invalid = structuredClone(bankAlSahaV1);
    invalid.questionMatrix[4].first[0]!.checks.firstLinkedRef = undefined;
    invalid.questionMatrix[5].first[1]!.checks.firstLinkedRef = "linked.joud";
    invalid.questionMatrix[6].first[2]!.checks.firstLinkedRef = "linked.fahad";

    expect(validateBankAlSahaCase(invalid)).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        "First question bank.4.first.seat-1 has no explicit linked.* target.",
        "First question bank.5.first.seat-2 links to unavailable role joud.",
        "First question bank.6.first.seat-3 links to its own role fahad.",
      ]),
    });
  });

  it("rejects missing, unknown, and self-referential forensic linked targets", () => {
    const invalid = structuredClone(bankAlSahaV1);
    invalid.questionMatrix[4].movement[0]!.checks.finalLinkedRef = undefined;
    invalid.questionMatrix[5].identity[1]!.checks.finalLinkedRef = "linked.joud";
    invalid.questionMatrix[6].movement[2]!.checks.finalLinkedRef = "linked.fahad";

    expect(validateBankAlSahaCase(invalid)).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        "Forensic question bank.4.movement.seat-1 has no explicit linked.* target.",
        "Forensic question bank.5.identity.seat-2 links to unavailable role joud.",
        "Forensic question bank.6.movement.seat-3 links to its own role fahad.",
      ]),
    });
  });

  it("rejects incomplete linked option predicates and unknown target options", () => {
    const invalid = structuredClone(bankAlSahaV1);
    const question = invalid.questionMatrix[4].first[0]!;
    question.checks.linkedOptionMatches = {
      [question.options[0]!.id]: ["not-a-real-target-option"],
    };

    expect(validateBankAlSahaCase(invalid)).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        `Question ${question.id} linked option predicate does not cover every owner option.`,
        `Question ${question.id} maps to unknown target option not-a-real-target-option.`,
      ]),
    });
  });

  it("rejects incomplete story domains and unauthored half-credit in decisive packets", () => {
    const invalid = structuredClone(bankAlSahaV1);
    delete invalid.questionMatrix[4].first[0]!.checks.storyOptionFits!
      .byOptionId[invalid.questionMatrix[4].first[0]!.options[1]!.id]!.parking;
    invalid.questionMatrix[5].identity[1]!.checks.evidenceOptionFitsByPacket!
      .movement_true.jacket = 0.5;

    expect(validateBankAlSahaCase(invalid)).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        "First question bank.4.first.seat-1 story predicate has inconsistent reference values for cafe-key.",
        "Forensic question bank.5.identity.seat-2 uses unjustified ambiguous evidence credit for movement_true.",
      ]),
    });
  });
});
