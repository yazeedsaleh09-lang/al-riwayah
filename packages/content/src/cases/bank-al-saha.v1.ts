import {
  areBankLinkedOptionsCompatible,
  bagHolderOptions,
  bankOptionSemanticFacts,
  firstOptions,
  identityOptions,
  isBankCanonicalLinkedOption,
  movementOptions,
  peopleOptions,
  peopleOptionsFor,
  question,
  saudOpeningOptions,
} from "./bank-al-saha-question-options";

export const BANK_AL_SAHA_CASE_ID = "case.bank-al-saha.v1";

export type BankPlayerCount = 4 | 5 | 6;
export type BankQuestionSet = "first" | "movement" | "identity";
export type BankRepairId = "movement" | "identity";
export type BankTruthPacketId = "movement_true" | "identity_true" | "ambiguous";

export interface ArabicCopy {
  ar: string;
}

export interface BankQuestionChecks {
  storyRef?: string;
  firstLinkedRef?: string;
  repairRef?: string;
  evidenceRef?: string;
  finalLinkedRef?: string;
  linkedOptionMatches?: Record<string, string[]>;
  storyOptionFits?: {
    referenceFactKey: string;
    byOptionId: Record<string, Record<string, 0 | 0.5 | 1>>;
  };
  evidenceOptionFitsByPacket?: Record<
    BankTruthPacketId,
    Record<string, 0 | 0.5 | 1>
  >;
}

export interface BankContentQuestion {
  id: string;
  seatKey: string;
  set: BankQuestionSet;
  prompt: ArabicCopy;
  options: Array<{ id: string; label: ArabicCopy; normalizedFacts: Record<string, string> }>;
  factKeys: string[];
  comparisonRefs: string[];
  checks: BankQuestionChecks;
}

export interface BankRepairBranch {
  id: BankRepairId;
  title: ArabicCopy;
  officialTruth: ArabicCopy;
  resolves: ArabicCopy;
  exposes: ArabicCopy;
  officialFacts: Array<{ factKey: string; value: string }>;
  evidenceRequestId: string;
  forensicQuestionSet: Exclude<BankQuestionSet, "first">;
}

export interface BankEvidenceRequest {
  id: string;
  causedByRepairId: BankRepairId;
  arrivalReason: ArabicCopy;
  summary: ArabicCopy;
  timestamp: string;
}

export interface BankTruthPacket {
  id: BankTruthPacketId;
  lockAt: "match_creation";
  repairOutcomes: Record<BankRepairId, "proven" | "gap" | "refuted">;
  evidenceByRequest: Record<string, { visual: ArabicCopy; relevance: ArabicCopy }>;
}

export interface BankAlSahaCaseDefinition {
  id: string;
  version: string;
  title: ArabicCopy;
  pitch: ArabicCopy;
  complexity: ArabicCopy;
  supportedPlayerCounts: BankPlayerCount[];
  durationMinutes: [number, number];
  opening: {
    title: ArabicCopy;
    lines: ArabicCopy[];
    initialSuspicion: number;
    initialSuspicionReason: ArabicCopy;
  };
  scene: {
    objective: ArabicCopy;
    locations: Array<{ id: string; label: ArabicCopy }>;
    requiredFacts: Array<{
      id:
        | "near_bank_reason"
        | "alarm_location"
        | "vehicle_key_holder"
        | "suspicious_object_holder"
        | "departure_plan"
        | "cafe_door_witness"
        | "parking_camera_sightline";
      prompt: ArabicCopy;
      options?: Array<{ id: string; label: ArabicCopy }>;
    }>;
  };
  questionMatrix: Record<BankPlayerCount, Record<BankQuestionSet, BankContentQuestion[]>>;
  repairPrompt: ArabicCopy;
  repairBranches: Record<BankRepairId, BankRepairBranch>;
  evidenceRequests: Record<string, BankEvidenceRequest>;
  truthPackets: Record<BankTruthPacketId, BankTruthPacket>;
  suspicionBands: Array<{ min: number; max: number; label: ArabicCopy }>;
  scoringWeights: {
    firstStoryFit: 25;
    firstLinkedFit: 20;
    forensicRepairFit: 20;
    forensicEvidenceFit: 25;
    forensicLinkedFit: 10;
  };
  resultCopy: {
    verdictTitle: ArabicCopy;
    rankingTitle: ArabicCopy;
    rankingIntro: ArabicCopy;
    replay: ArabicCopy;
  };
}

const matrix4: Record<BankQuestionSet, BankContentQuestion[]> = {
  first: [
    question(
      4,
      "first",
      1,
      "وين كنت وقت الإنذار، ووش كان معك؟",
      ["location:saud:11:42", "key:11:42"],
      ["story.saud", "linked.yazid"],
      saudOpeningOptions,
    ),
    question(
      4,
      "first",
      2,
      "وين شفت سعود وقت اشتغل الإنذار؟",
      ["observed-location:saud:11:42"],
      ["linked.saud", "story.map"],
      firstOptions.saudLocation,
    ),
    question(
      4,
      "first",
      3,
      "وين كانت الشنطة وقت الإنذار؟",
      ["bag:11:42"],
      ["story.bag", "linked.rakan", "evidence.receipt"],
      firstOptions.bag,
    ),
    question(
      4,
      "first",
      4,
      "مين كان واقف عند باب المقهى؟",
      ["door-witness:11:42", "visible-route"],
      ["linked.yazid", "story.map"],
      firstOptions.doorway,
    ),
  ],
  movement: [
    question(
      4,
      "movement",
      1,
      "أي مسار مشيت يوم رحت لباب المقهى؟",
      ["route:saud", "arrival:11:44"],
      ["evidence.camera-chain", "linked.rakan"],
      movementOptions.route,
    ),
    question(
      4,
      "movement",
      2,
      "مين دخل المقهى الساعة 11:44؟",
      ["doorway-figure:11:44"],
      ["evidence.cafe-door", "linked.fahad"],
      movementOptions.entrant,
    ),
    question(
      4,
      "movement",
      3,
      "الشنطة بقيت معك، ولا دخلت مع سعود؟",
      ["bag:11:44"],
      ["evidence.bag-photo", "linked.yazid"],
      movementOptions.bag,
    ),
    question(
      4,
      "movement",
      4,
      "من أي جهة وصل سعود لباب المقهى؟",
      ["route:saud"],
      ["evidence.camera-chain", "linked.saud"],
      movementOptions.route,
    ),
  ],
  identity: [
    question(
      4,
      "identity",
      1,
      "وين كنت يوم التقطت كاميرا الباب الصورة؟",
      ["saud-moved-before:11:44"],
      ["evidence.car-sensor", "linked.rakan"],
      identityOptions.stayed,
    ),
    question(
      4,
      "identity",
      2,
      "اللي شفته عند الباب: سعود ولا نواف؟",
      ["doorway-figure:11:44"],
      ["evidence.doorway", "linked.rakan"],
      movementOptions.entrant,
    ),
    question(
      4,
      "identity",
      3,
      "كانت الشنطة معك وقت صورة الباب؟",
      ["bag:11:44"],
      ["evidence.bag-photo", "linked.yazid"],
      movementOptions.bag,
    ),
    question(
      4,
      "identity",
      4,
      "بقيت عند الباب، ولا جيت له من المواقف؟",
      ["nawaf-door-stay"],
      ["evidence.doorway", "linked.saud"],
      identityOptions.doorStay,
    ),
  ],
};

const matrix5: Record<BankQuestionSet, BankContentQuestion[]> = {
  first: [
    question(
      5,
      "first",
      1,
      "أول ما اشتغل الإنذار، وين كنت؟",
      ["location:saud:11:42"],
      ["linked.yazid", "story.map"],
      firstOptions.saudLocation,
    ),
    question(
      5,
      "first",
      2,
      "وين شفت سعود وقت الإنذار؟",
      ["observed-location:saud:11:42"],
      ["linked.saud", "story.map"],
      firstOptions.saudLocation,
    ),
    question(
      5,
      "first",
      3,
      "وين كانت الشنطة السودا وقت الإنذار؟",
      ["bag:11:42"],
      ["story.bag", "linked.rakan", "evidence.receipt"],
      firstOptions.bag,
    ),
    question(
      5,
      "first",
      4,
      "مين كان معه مفتاح السيارة؟",
      ["key:11:42"],
      ["linked.saud", "story.key"],
      firstOptions.key,
    ),
    question(
      5,
      "first",
      5,
      "مين كان واقف عند باب المقهى؟",
      ["door-witness:11:42"],
      ["linked.yazid", "story.map"],
      firstOptions.doorway,
    ),
  ],
  movement: [
    question(
      5,
      "movement",
      1,
      "وش كان معك يوم دخلت المقهى؟",
      ["saud-carry:11:44"],
      ["evidence.key-tag", "linked.fahad"],
      movementOptions.carried,
    ),
    question(
      5,
      "movement",
      2,
      "مين دخل المقهى الساعة 11:44؟",
      ["doorway-figure:11:44"],
      ["evidence.cafe-door", "linked.saud"],
      movementOptions.entrant,
    ),
    question(
      5,
      "movement",
      3,
      "وين كانت الشنطة الساعة 11:44؟",
      ["bag:11:44"],
      ["evidence.bag-photo", "linked.saud"],
      movementOptions.bag,
    ),
    question(
      5,
      "movement",
      4,
      "أي طريق أخذه سعود من السيارة للمقهى؟",
      ["route:saud"],
      ["evidence.camera-chain", "linked.nawaf"],
      movementOptions.route,
    ),
    question(
      5,
      "movement",
      5,
      "مين بقي عند باب المقهى لين وصل سعود؟",
      ["door-witness:11:44"],
      ["evidence.cafe-door", "linked.yazid"],
      movementOptions.doorWait,
    ),
  ],
  identity: [
    question(
      5,
      "identity",
      1,
      "هل تركت السيارة قبل 11:44؟",
      ["saud-moved-before:11:44"],
      ["evidence.car-sensor", "linked.nawaf"],
      identityOptions.stayed,
    ),
    question(
      5,
      "identity",
      2,
      "وش العلامة اللي خلتك تقول إن الشخص نواف؟",
      ["doorway-marker"],
      ["evidence.doorway", "linked.nawaf"],
      identityOptions.marker,
    ),
    question(
      5,
      "identity",
      3,
      "مين كان ممكن يحمل العلاقة العاكسة؟",
      ["reflective-tag-owner"],
      ["evidence.key-tag", "linked.saud"],
      identityOptions.keyOwner,
    ),
    question(
      5,
      "identity",
      4,
      "من أي طريق وصل الشخص لباب المقهى؟",
      ["doorway-route"],
      ["evidence.camera-chain", "linked.nawaf"],
      identityOptions.route,
    ),
    question(
      5,
      "identity",
      5,
      "هل بقيت عند الباب طول فترة الإنذار؟",
      ["nawaf-door-stay"],
      ["evidence.doorway", "linked.saud"],
      identityOptions.doorStay,
    ),
  ],
};

const matrix6: Record<BankQuestionSet, BankContentQuestion[]> = {
  first: [
    question(
      6,
      "first",
      1,
      "وين كنت وقت الإنذار، ومين معه المفتاح؟",
      ["location:saud:11:42", "key:11:42"],
      ["linked.yazid", "story.key"],
      saudOpeningOptions,
    ),
    question(
      6,
      "first",
      2,
      "وين شفت سعود وقت الإنذار؟",
      ["observed-location:saud:11:42"],
      ["linked.saud", "story.map"],
      firstOptions.saudLocation,
    ),
    question(
      6,
      "first",
      3,
      "وين كانت الشنطة وقت الإنذار؟",
      ["bag:11:42"],
      ["linked.rakan", "story.bag"],
      bagHolderOptions,
    ),
    question(
      6,
      "first",
      4,
      "مين كان جايب الشنطة من جهة المحطة؟",
      ["bag-holder:11:42", "bag-route"],
      ["linked.fahad", "story.bag"],
      peopleOptionsFor("bag-holder:11:42"),
    ),
    question(
      6,
      "first",
      5,
      "مين شفته بين المواقف وباب المقهى؟",
      ["crossing-person:11:42"],
      ["linked.joud", "story.map"],
      peopleOptionsFor("crossing-person:11:42"),
    ),
    question(
      6,
      "first",
      6,
      "مين كان ظاهر عند السيارة من جهة المواقف؟",
      ["parking_camera_sightline"],
      ["linked.nawaf", "story.map"],
      peopleOptionsFor("parking_camera_sightline"),
    ),
  ],
  movement: [
    question(
      6,
      "movement",
      1,
      "متى تركت السيارة، ومن أي جهة مشيت؟",
      ["saud_departure", "route:saud"],
      ["evidence.camera-chain", "linked.joud"],
      movementOptions.route,
    ),
    question(
      6,
      "movement",
      2,
      "مين دخل المقهى 11:44، وهل كان معه شيء؟",
      ["doorway-figure:11:44", "entrant-carry"],
      ["evidence.cafe-door", "linked.fahad"],
      movementOptions.entrant,
    ),
    question(
      6,
      "movement",
      3,
      "الحقيبة بقيت معك، ولا تحركت مع الداخل؟",
      ["bag:11:44"],
      ["evidence.bag-photo", "linked.yazid"],
      movementOptions.bag,
    ),
    question(
      6,
      "movement",
      4,
      "هل مر سعود من الزقاق أو من ممشى المواقف؟",
      ["route:saud"],
      ["evidence.camera-chain", "linked.nawaf"],
      movementOptions.route,
    ),
    question(
      6,
      "movement",
      5,
      "من وصل باب المقهى، ومن أي جهة؟",
      ["arrival-person:11:44", "arrival-route"],
      ["evidence.cafe-door", "linked.rakan"],
      movementOptions.entrant,
    ),
    question(
      6,
      "movement",
      6,
      "مين ابتعد عن السيارة في صورة 11:43؟",
      ["saud_departure"],
      ["evidence.parking-camera", "linked.saud"],
      peopleOptions,
    ),
  ],
  identity: [
    question(
      6,
      "identity",
      1,
      "وين كنت يوم التقطت صورة الباب؟",
      ["saud_stayed_at_car"],
      ["evidence.car-sensor", "linked.joud"],
      identityOptions.stayed,
    ),
    question(
      6,
      "identity",
      2,
      "اللي دخل: سعود ولا نواف؟",
      ["doorway-figure:11:44"],
      ["evidence.doorway", "linked.fahad"],
      movementOptions.entrant,
    ),
    question(
      6,
      "identity",
      3,
      "الحقيبة كانت معك وقت دخول نواف؟",
      ["bag:11:44"],
      ["evidence.bag-photo", "linked.yazid"],
      movementOptions.bag,
    ),
    question(
      6,
      "identity",
      4,
      "أي طريق استخدم نواف للوصول للباب؟",
      ["doorway-route"],
      ["evidence.doorway", "linked.nawaf"],
      identityOptions.route,
    ),
    question(
      6,
      "identity",
      5,
      "جيت للباب من المواقف أو كنت عنده من البداية؟",
      ["nawaf-door-stay"],
      ["evidence.doorway", "linked.rakan"],
      identityOptions.doorStay,
    ),
    question(
      6,
      "identity",
      6,
      "مين بقي عند السيارة بينما تحرك نواف؟",
      ["saud_stayed_at_car"],
      ["evidence.car-sensor", "linked.saud"],
      peopleOptions,
    ),
  ],
};

const PLAYER_ROLES = ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"] as const;
const STORY_REFERENCE_KEYS: Record<BankPlayerCount, readonly string[]> = {
  4: ["saud_location", "saud_location", "bag_holder", "door_witness"],
  5: ["saud_location", "saud_location", "bag_holder", "key_holder", "door_witness"],
  6: ["saud_location", "saud_location", "bag_holder", "bag_holder", "door_witness", "parking_sightline"],
};
const STORY_REFERENCE_VALUES: Readonly<Record<string, readonly string[]>> = {
  saud_location: ["parking", "cafe", "petrol_station", "alley", "cafe_entrance", "nearby_street"],
  key_holder: PLAYER_ROLES,
  bag_holder: PLAYER_ROLES,
  door_witness: PLAYER_ROLES,
  parking_sightline: PLAYER_ROLES,
};

function storyOptionFits(
  count: BankPlayerCount,
  question: BankContentQuestion,
): NonNullable<BankQuestionChecks["storyOptionFits"]> {
  const seat = Number(question.seatKey.slice("seat-".length)) - 1;
  const referenceFactKey = STORY_REFERENCE_KEYS[count][seat]!;
  return {
    referenceFactKey,
    byOptionId: Object.fromEntries(question.options.map((option) => {
      const facts = bankOptionSemanticFacts(option);
      const answerValue = facts[referenceFactKey] ?? facts.person ?? Object.values(facts)[0];
      return [option.id, Object.fromEntries(
        STORY_REFERENCE_VALUES[referenceFactKey]!.map((storyValue) => [
          storyValue,
          answerValue === storyValue ? 1 : 0,
        ]),
      )];
    })),
  };
}

function evidenceReferenceFacts(
  set: Exclude<BankQuestionSet, "first">,
  packet: Exclude<BankTruthPacketId, "ambiguous">,
  questionId: string,
): Readonly<Record<string, string>> {
  const movementTrue = packet === "movement_true";
  if (questionId === "bank.5.identity.seat-2") {
    return { "doorway-marker": movementTrue ? "key_tag" : "jacket" };
  }
  if (questionId === "bank.6.movement.seat-6") return { person: movementTrue ? "saud" : "nawaf" };
  if (questionId === "bank.6.identity.seat-6") return { person: movementTrue ? "nawaf" : "saud" };
  if (set === "movement") return movementTrue
    ? { route: "sidewalk", doorway_person: "saud", bag_holder: "fahad", key_holder: "key_only", door_witness: "nawaf", saud_movement: "saud" }
    : { route: "no_parking_movement", doorway_person: "nawaf", bag_holder: "fahad", key_holder: "saud", door_witness: "yazid", saud_movement: "no" };
  return movementTrue
    ? { route: "sidewalk", doorway_person: "saud", bag_holder: "fahad", key_holder: "saud", door_witness: "no", saud_movement: "yes" }
    : { route: "no_parking_movement", doorway_person: "nawaf", bag_holder: "fahad", key_holder: "saud", door_witness: "yes", saud_movement: "no" };
}

function evidenceOptionFits(
  set: Exclude<BankQuestionSet, "first">,
  question: BankContentQuestion,
): NonNullable<BankQuestionChecks["evidenceOptionFitsByPacket"]> {
  return Object.fromEntries((["movement_true", "identity_true", "ambiguous"] as const).map((packet) => [
    packet,
    Object.fromEntries(question.options.map((option) => {
      if (packet === "ambiguous") return [option.id, 0.5];
      const facts = bankOptionSemanticFacts(option);
      const reference = evidenceReferenceFacts(set, packet, question.id);
      const shared = Object.keys(facts).filter((key) => Object.hasOwn(reference, key));
      return [option.id, shared.length > 0 && shared.every((key) => facts[key] === reference[key]) ? 1 : 0];
    })),
  ])) as NonNullable<BankQuestionChecks["evidenceOptionFitsByPacket"]>;
}

/**
 * Materialize the authored semantic predicate as explicit runtime option ids.
 * This never relies on array position: shared fact domains compare values, and
 * cross-domain links compare their phase-specific causal meaning.
 */
function withLinkedOptionPredicates(
  count: BankPlayerCount,
  matrix: Record<BankQuestionSet, BankContentQuestion[]>,
): Record<BankQuestionSet, BankContentQuestion[]> {
  return Object.fromEntries(
    (Object.keys(matrix) as BankQuestionSet[]).map((set) => [
      set,
      matrix[set].map((question) => {
        const linkedRef = set === "first"
          ? question.checks.firstLinkedRef
          : question.checks.finalLinkedRef;
        const targetIndex = PLAYER_ROLES.indexOf(
          linkedRef?.slice("linked.".length) as (typeof PLAYER_ROLES)[number],
        );
        const target = matrix[set][targetIndex];
        const linkedOptionMatches = Object.fromEntries(question.options.map((option) => [
          option.id,
          target
            ? target.options
                .filter((targetOption) => areBankLinkedOptionsCompatible(set, option, targetOption))
                .map(({ id }) => id)
            : [],
        ]));
        return {
          ...question,
          checks: {
            ...question.checks,
            linkedOptionMatches,
            ...(set === "first"
              ? { storyOptionFits: storyOptionFits(count, question) }
              : { evidenceOptionFitsByPacket: evidenceOptionFits(set, question) }),
          },
        };
      }),
    ]),
  ) as Record<BankQuestionSet, BankContentQuestion[]>;
}

const authoredMatrix4 = withLinkedOptionPredicates(4, matrix4);
const authoredMatrix5 = withLinkedOptionPredicates(5, matrix5);
const authoredMatrix6 = withLinkedOptionPredicates(6, matrix6);

export const BANK_LINKED_OPTION_COMPATIBILITY: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = Object.fromEntries(
  [authoredMatrix4, authoredMatrix5, authoredMatrix6].flatMap((matrix) =>
    (Object.keys(matrix) as BankQuestionSet[]).flatMap((set) =>
      matrix[set].map((question) => [question.id, question.checks.linkedOptionMatches!] as const),
    ),
  ),
);

export const BANK_STORY_OPTION_FITS = Object.fromEntries(
  [authoredMatrix4, authoredMatrix5, authoredMatrix6].flatMap((matrix) =>
    matrix.first.map((question) => [question.id, question.checks.storyOptionFits!] as const),
  ),
) as Readonly<Record<string, NonNullable<BankQuestionChecks["storyOptionFits"]>>>;

export const BANK_EVIDENCE_OPTION_FITS_BY_PACKET = Object.fromEntries(
  [authoredMatrix4, authoredMatrix5, authoredMatrix6].flatMap((matrix) =>
    [...matrix.movement, ...matrix.identity].map((question) => [
      question.id,
      question.checks.evidenceOptionFitsByPacket!,
    ] as const),
  ),
) as Readonly<
  Record<string, NonNullable<BankQuestionChecks["evidenceOptionFitsByPacket"]>>
>;

export const BANK_LINKED_CANONICAL_SELECTION: Readonly<
  Record<BankPlayerCount, Readonly<Record<BankQuestionSet, Readonly<Record<string, string>>>>>
> = Object.fromEntries(
  ([4, 5, 6] as const).map((count) => {
    const matrix = count === 4 ? authoredMatrix4 : count === 5 ? authoredMatrix5 : authoredMatrix6;
    return [count, Object.fromEntries((Object.keys(matrix) as BankQuestionSet[]).map((set) => [
      set,
      Object.fromEntries(matrix[set].map((question) => {
        const selected = question.options.find((option) => isBankCanonicalLinkedOption(set, option));
        if (!selected) throw new Error(`Question ${question.id} has no canonical linked option.`);
        return [question.id, selected.id];
      })),
    ]))];
  }),
) as Record<BankPlayerCount, Record<BankQuestionSet, Record<string, string>>>;

type BankScoringCanonicalSelection = {
  truthPacketId: "movement_true";
  repairId: "movement";
  storyFacts: Readonly<Record<string, string>>;
  firstOptionByQuestionId: Readonly<Record<string, string>>;
  forensicOptionByQuestionId: Readonly<Record<string, string>>;
};

/**
 * A stable, authored end-to-end scoring sample for each supported table size.
 * These ids are deliberately explicit: validation proves that every first answer
 * matches the same story, every forensic answer matches movement_true, and all
 * linked pairs agree. Changing question semantics therefore requires an
 * intentional fixture update instead of silently selecting a different option.
 */
export const BANK_SCORING_CANONICAL_SELECTION: Readonly<
  Record<BankPlayerCount, BankScoringCanonicalSelection>
> = {
  4: {
    truthPacketId: "movement_true",
    repairId: "movement",
    storyFacts: { saud_location: "cafe", bag_holder: "saud", door_witness: "saud" },
    firstOptionByQuestionId: {
      "bank.4.first.seat-1": "cafe-key",
      "bank.4.first.seat-2": "cafe",
      "bank.4.first.seat-3": "with-saud",
      "bank.4.first.seat-4": "saud",
    },
    forensicOptionByQuestionId: {
      "bank.4.movement.seat-1": "sidewalk",
      "bank.4.movement.seat-2": "saud",
      "bank.4.movement.seat-3": "with-fahad",
      "bank.4.movement.seat-4": "sidewalk",
    },
  },
  5: {
    truthPacketId: "movement_true",
    repairId: "movement",
    storyFacts: {
      saud_location: "parking",
      bag_holder: "fahad",
      key_holder: "saud",
      door_witness: "nawaf",
    },
    firstOptionByQuestionId: {
      "bank.5.first.seat-1": "parking",
      "bank.5.first.seat-2": "parking",
      "bank.5.first.seat-3": "with-fahad",
      "bank.5.first.seat-4": "with-saud",
      "bank.5.first.seat-5": "nawaf",
    },
    forensicOptionByQuestionId: {
      "bank.5.movement.seat-1": "key-only",
      "bank.5.movement.seat-2": "saud",
      "bank.5.movement.seat-3": "with-fahad",
      "bank.5.movement.seat-4": "sidewalk",
      "bank.5.movement.seat-5": "nawaf",
    },
  },
  6: {
    truthPacketId: "movement_true",
    repairId: "movement",
    storyFacts: {
      saud_location: "parking",
      bag_holder: "fahad",
      door_witness: "saud",
      parking_sightline: "saud",
    },
    firstOptionByQuestionId: {
      "bank.6.first.seat-1": "parking-key",
      "bank.6.first.seat-2": "parking",
      "bank.6.first.seat-3": "fahad",
      "bank.6.first.seat-4": "fahad",
      "bank.6.first.seat-5": "saud",
      "bank.6.first.seat-6": "saud",
    },
    forensicOptionByQuestionId: {
      "bank.6.movement.seat-1": "sidewalk",
      "bank.6.movement.seat-2": "saud",
      "bank.6.movement.seat-3": "with-fahad",
      "bank.6.movement.seat-4": "sidewalk",
      "bank.6.movement.seat-5": "saud",
      "bank.6.movement.seat-6": "saud",
    },
  },
};

const evidenceRequests: Record<string, BankEvidenceRequest> = {
  "parking-cafe-camera-chain": {
    id: "parking-cafe-camera-chain",
    causedByRepairId: "movement",
    arrivalReason: { ar: "فتشوا كاميرا المواقف لأنكم قلتوا سعود تحرك بعد الإنذار." },
    summary: { ar: "التسجيل يختبر حركة سعود، ومساره، والمفتاح والشنطة." },
    timestamp: "11:44:10",
  },
  "doorway-identity-enhancement": {
    id: "doorway-identity-enhancement",
    causedByRepairId: "identity",
    arrivalReason: { ar: "كبروا لقطة الباب لأنكم قلتوا يزيد خلط بين شخصين." },
    summary: { ar: "الصورة تختبر الجاكيت، وعلامة المفتاح، ومكان نواف." },
    timestamp: "11:44:10",
  },
};

const packetEvidence = (
  movementVisual: string,
  movementRelevance: string,
  identityVisual: string,
  identityRelevance: string,
): BankTruthPacket["evidenceByRequest"] => ({
  "parking-cafe-camera-chain": {
    visual: { ar: movementVisual },
    relevance: { ar: movementRelevance },
  },
  "doorway-identity-enhancement": {
    visual: { ar: identityVisual },
    relevance: { ar: identityRelevance },
  },
});

export const bankAlSahaV1: BankAlSahaCaseDefinition = {
  id: BANK_AL_SAHA_CASE_ID,
  version: "1.0.0",
  title: { ar: "قضية بنك الساحة" },
  pitch: { ar: "اضبطوا رواية وحدة قبل ما تكشف الأدلة تناقضكم." },
  complexity: { ar: "متوسطة" },
  supportedPlayerCounts: [4, 5, 6],
  durationMinutes: [10, 15],
  opening: {
    title: { ar: "البنك انسرق" },
    lines: [
      { ar: "بنك الساحة انسرق قبل 12 دقيقة." },
      { ar: "الشرطة وقفت سيارتكم قريب من المكان، وكل واحد فيكم بينسأل لحاله." },
      { ar: "الأدلة ناقصة، بس أي تناقض بيرفع الشبهة." },
      { ar: "اضبطوا رواية وحدة وخلوها تصمد." },
    ],
    initialSuspicion: 24,
    initialSuspicionReason: { ar: "لوحة سيارتكم ظهرت قريب من البنك." },
  },
  scene: {
    objective: { ar: "حددوا مكان كل واحد، والمفتاح، والشنطة، وطريق خروجكم." },
    locations: [
      ["bank", "البنك"],
      ["cafe", "المقهى"],
      ["parking", "المواقف"],
      ["vehicle", "السيارة"],
      ["alley", "الزقاق"],
      ["petrol-station", "محطة البنزين"],
      ["entrance", "المدخل"],
      ["nearby-street", "الشارع القريب"],
    ].map(([id, ar]) => ({ id: id!, label: { ar: ar! } })),
    requiredFacts: [
      {
        id: "near_bank_reason",
        prompt: { ar: "ليش كنتم قريب من البنك؟" },
        options: [
          { id: "cafe_before_road_trip", label: { ar: "تقابلنا في المقهى قبل طلعة طريق" } },
          { id: "petrol_stop", label: { ar: "وقفنا نعبي بنزين قبل نطلع" } },
          { id: "meet_near_cafe", label: { ar: "موعدنا كان عند المقهى" } },
        ],
      },
      {
        id: "alarm_location",
        prompt: { ar: "وين كان كل واحد وقت الإنذار؟" },
        options: [
          { id: "cafe_counter", label: { ar: "كاونتر المقهى" } },
          { id: "parking_vehicle", label: { ar: "عند السيارة" } },
          { id: "petrol_station", label: { ar: "محطة البنزين" } },
          { id: "alley", label: { ar: "الزقاق" } },
          { id: "cafe_entrance", label: { ar: "باب المقهى" } },
          { id: "nearby_street", label: { ar: "الشارع القريب" } },
        ],
      },
      { id: "vehicle_key_holder", prompt: { ar: "مين كان معه مفتاح السيارة؟" } },
      { id: "suspicious_object_holder", prompt: { ar: "مين كانت معه الشنطة السودا؟" } },
      {
        id: "departure_plan",
        prompt: { ar: "كيف كنتم بتطلعون من المكان؟" },
        options: [
          { id: "side_street", label: { ar: "نطلع من الشارع الجانبي" } },
          { id: "main_street", label: { ar: "نطلع من الشارع الرئيسي" } },
          { id: "return_to_cafe", label: { ar: "نتجمع عند المقهى أول" } },
        ],
      },
      { id: "cafe_door_witness", prompt: { ar: "مين كان يقدر يشوف باب المقهى؟" } },
      { id: "parking_camera_sightline", prompt: { ar: "مين كان في خط كاميرا المواقف؟" } },
    ],
  },
  questionMatrix: { 4: authoredMatrix4, 5: authoredMatrix5, 6: authoredMatrix6 },
  repairPrompt: {
    ar: "كيف بتفسرون التناقض للمحقق؟ اختاروا الاحتمال اللي تقدرون تحمونه قدام الدليل الجاي.",
  },
  repairBranches: {
    movement: {
      id: "movement",
      title: { ar: "سعود تحرك بعد بداية الإنذار" },
      officialTruth: { ar: "سعود كان عند السيارة الساعة 11:42، ودخل المقهى الساعة 11:44." },
      resolves: { ar: "يثبت جواب سعود، وينقل مشاهدة يزيد إلى 11:44." },
      exposes: { ar: "بيفتح عليكم مسار سعود، والكاميرات، ووش كان معه." },
      officialFacts: [
        { factKey: "location:saud:11:42", value: "parking" },
        { factKey: "location:saud:11:44", value: "cafe_entrance" },
        { factKey: "key-holder:11:44", value: "saud" },
        { factKey: "bag-holder:11:44", value: "fahad" },
      ],
      evidenceRequestId: "parking-cafe-camera-chain",
      forensicQuestionSet: "movement",
    },
    identity: {
      id: "identity",
      title: { ar: "يزيد خلط بين سعود ونواف" },
      officialTruth: { ar: "سعود بقي عند السيارة، والشخص عند باب المقهى كان نواف." },
      resolves: { ar: "يثبت مكان سعود ويفسر مشاهدة يزيد بالجاكيت الأسود." },
      exposes: { ar: "بيفتح عليكم تكبير الصورة، والجاكيت، وعلامة المفتاح." },
      officialFacts: [
        { factKey: "location:saud:11:44", value: "parking" },
        { factKey: "doorway_figure:11:44", value: "nawaf" },
        { factKey: "key-holder:11:44", value: "saud" },
      ],
      evidenceRequestId: "doorway-identity-enhancement",
      forensicQuestionSet: "identity",
    },
  },
  evidenceRequests,
  truthPackets: {
    movement_true: {
      id: "movement_true",
      lockAt: "match_creation",
      repairOutcomes: { movement: "proven", identity: "refuted" },
      evidenceByRequest: packetEvidence(
        "باب السائق انقفل 11:42، والشخص نفسه دخل المقهى 11:44 وعلاقة المفتاح بيده.",
        "التسجيل يدعم إن سعود تحرك من السيارة للمقهى.",
        "التكبير أظهر علاقة مفتاح سعود ومسارًا متصلًا من المواقف.",
        "الدليل ما ركب على تفسير تشابه الجاكيت.",
      ),
    },
    identity_true: {
      id: "identity_true",
      lockAt: "match_creation",
      repairOutcomes: { movement: "refuted", identity: "proven" },
      evidenceByRequest: packetEvidence(
        "ما ظهر مسار من المواقف، وحساس السيارة أبقى المفتاح قريب منها.",
        "التسجيل ما أثبت حركة سعود.",
        "التكبير أظهر سحاب جاكيت نواف، والمفتاح بقي قرب السيارة.",
        "الصورة تدعم إن الشخص عند الباب كان نواف.",
      ),
    },
    ambiguous: {
      id: "ambiguous",
      lockAt: "match_creation",
      repairOutcomes: { movement: "gap", identity: "gap" },
      evidenceByRequest: packetEvidence(
        "الظل ابتعد عن السيارة، لكن الوجه وعلامة اليد ما كانوا واضحين.",
        "الكاميرا تركت فجوة يحسمها تماسك إجاباتكم.",
        "الجاكيت واللمعة ظهروا مع بعض، ولا واحدة حسمت هوية الشخص.",
        "الصورة تركت الهوية معلقة على إجاباتكم الأخيرة.",
      ),
    },
  },
  suspicionBands: [
    { min: 0, max: 29, label: { ar: "روايتكم ماشية." } },
    { min: 30, max: 59, label: { ar: "المحقق بدأ يشك." } },
    { min: 60, max: 84, label: { ar: "الأدلة تضيق عليكم." } },
    { min: 85, max: 99, label: { ar: "باقي غلطة وتنفضحون." } },
    { min: 100, max: 100, label: { ar: "الرواية انكشفت." } },
  ],
  scoringWeights: {
    firstStoryFit: 25,
    firstLinkedFit: 20,
    forensicRepairFit: 20,
    forensicEvidenceFit: 25,
    forensicLinkedFit: 10,
  },
  resultCopy: {
    verdictTitle: { ar: "الحكم" },
    rankingTitle: { ar: "مين حفظ الرواية؟" },
    rankingIntro: { ar: "النتيجة جماعية، بس كل واحد له أثره في الرواية." },
    replay: { ar: "نفس القضية، رواية ثانية، وفضيحة جديدة." },
  },
};
