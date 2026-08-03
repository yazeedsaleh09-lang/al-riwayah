/** Canonical authored Bank Al-Saha rules and authoritative transitions. */
export const BANK_PHASES = [
  "OPENING",
  "STORY_BUILDING",
  "FIRST_QUESTION",
  "ISSUE_REVEAL",
  "REPAIR_VOTE",
  "STORY_UPDATE",
  "FORENSIC_QUESTION",
  "GROUP_VERDICT",
  "PLAYER_RANKING",
] as const;

export type BankPhase = (typeof BANK_PHASES)[number];
export type BankRepairId = "movement" | "identity";
export type BankTruthPacketId = "movement_true" | "identity_true" | "ambiguous";
export type BankAnswerPhase = "first_investigation" | "forensic_investigation";
export type BankFactValue = string | number | boolean | null;

export interface BankPlayerInput {
  id: string;
  name: string;
  joinOrder: number;
  isHost: boolean;
}

export interface BankQuestionChecks {
  storyRef?: string;
  storyOptionFits?: Readonly<{
    referenceFactKey: string;
    byOptionId: Readonly<Record<string, Readonly<Record<string, BankFit>>>>;
  }>;
  firstLinkedRef?: string;
  repairRef?: string;
  evidenceRef?: string;
  evidenceOptionFitsByPacket?: Readonly<Record<BankTruthPacketId, Readonly<Record<string, BankFit>>>>;
  finalLinkedRef?: string;
  linkedOptionMatches?: Readonly<Record<string, readonly string[]>>;
}

export interface BankQuestion {
  id: string;
  prompt: string;
  factKeys: readonly string[];
  checks: BankQuestionChecks;
  options: readonly BankAnswerOption[];
}

export interface BankAnswerOption {
  id: string;
  label: string;
  normalizedFacts: Readonly<Record<string, BankFactValue>>;
}

export interface BankQuestionAssignment {
  playerId: string;
  displayName: string;
  roleLabel: string;
  firstQuestion: BankQuestion;
  forensicQuestions: Readonly<Record<BankRepairId, BankQuestion>>;
}

export interface BankRuntimeQuestion {
    id: string;
    prompt: { ar: string };
    options: readonly { id: string; label: { ar: string }; normalizedFacts: Readonly<Record<string, string>> }[];
    factKeys: readonly string[];
    checks: BankQuestionChecks;
}

export interface BankRuntimeCaseDefinition {
  id: string;
  questionMatrix: Readonly<Record<4 | 5 | 6, Readonly<Record<"first" | BankRepairId, readonly BankRuntimeQuestion[]>>>>;
  repairBranches: Readonly<Record<BankRepairId, {
    id: BankRepairId;
    title: { ar: string };
    resolves: { ar: string };
    officialFacts: readonly { factKey: string; value: string }[];
    evidenceRequestId: string;
    forensicQuestionSet: BankRepairId;
  }>>;
  evidenceRequests: Readonly<Record<string, {
    id: string;
    timestamp: string;
    summary: { ar: string };
  }>>;
  truthPackets: Readonly<Record<BankTruthPacketId, {
    id: BankTruthPacketId;
    repairOutcomes: Readonly<Record<BankRepairId, "proven" | "gap" | "refuted">>;
    evidenceByRequest: Readonly<Record<string, { visual: { ar: string }; relevance: { ar: string } }>>;
  }>>;
}

const ROLE_LABELS = [
  "السيارة والمفتاح",
  "شاهد المقهى",
  "الشنطة والإيصال",
  "الزقاق والمسار",
  "باب المقهى",
  "المواقف وخط الكاميرا",
] as const;
const FIRST_LINKED_REFS = [
  "linked.yazid", "linked.saud", "linked.rakan", "linked.saud", "linked.yazid", "linked.nawaf",
] as const;

const FIRST_QUESTION_BLUEPRINTS = [
  ["وين كنت وقت اشتغل الإنذار، ووش كان معك؟", ["location:saud:11:42", "key:11:42"]],
  ["وين شفت سعود وقت اشتغل الإنذار؟", ["location:saud:11:42"]],
  ["وين كانت الشنطة السودا وقت الإنذار؟", ["black_bag_location"]],
  ["مين كان معه مفتاح السيارة؟", ["vehicle_key_holder"]],
  ["مين كان واقف عند باب المقهى؟", ["doorway_witness"]],
  ["وش كان يبان من كاميرا المواقف؟", ["parking_camera_sightline"]],
] as const;

const MOVEMENT_QUESTION_BLUEPRINTS = [
  ["أي مسار مشيت، ومتى وصلت باب المقهى؟", ["saud_departure", "saud_route"]],
  ["مين دخل المقهى الساعة 11:44؟", ["cafe_entry_identity"]],
  ["وين كانت الشنطة الساعة 11:44؟", ["black_bag_location_1144"]],
  ["أي طريق أخذه سعود من السيارة للمقهى؟", ["saud_route"]],
  ["مين بقي عند الباب لين وصل سعود؟", ["doorway_witness_1144"]],
  ["متى ابتعد سعود عن السيارة، ومن أي جهة؟", ["saud_departure", "parking_camera_sightline"]],
] as const;

const IDENTITY_QUESTION_BLUEPRINTS = [
  ["هل تركت السيارة قبل 11:44؟", ["saud_stayed_at_car"]],
  ["وش العلامة اللي خلتك تعرف الشخص عند الباب؟", ["doorway_identity_marker"]],
  ["مين كان ممكن يحمل علاقة المفتاح العاكسة؟", ["reflective_key_tag"]],
  ["من أي طريق وصل الشخص لباب المقهى؟", ["doorway_route"]],
  ["هل بقيت عند الباب طول فترة الإنذار؟", ["nawaf_doorway_position"]],
  ["هل سجلت كاميرا السيارة سعود وهو يغادر؟", ["saud_stayed_at_car", "parking_camera_sightline"]],
] as const;

void FIRST_QUESTION_BLUEPRINTS;
void MOVEMENT_QUESTION_BLUEPRINTS;
void IDENTITY_QUESTION_BLUEPRINTS;

function question(
  id: string,
  blueprint: readonly [string, readonly string[]],
  checks: BankQuestionChecks,
  options: readonly BankAnswerOption[],
): BankQuestion {
  return {
    id,
    prompt: blueprint[0],
    factKeys: [...blueprint[1]],
    checks: { ...checks },
    options: options.map((option) => alignOptionFacts(option, blueprint[1])),
  };
}

function alignOptionFacts(
  option: BankAnswerOption,
  factKeys: readonly string[],
): BankAnswerOption {
  const matching = Object.entries(option.normalizedFacts).filter(([key]) => factKeys.includes(key));
  const firstValue = Object.values(option.normalizedFacts)[0];
  return {
    ...option,
    normalizedFacts: matching.length > 0
      ? Object.fromEntries(matching)
      : firstValue === undefined ? {} : { [factKeys[0]!]: firstValue },
  };
}

const answer = (id: string, label: string, factKey: string, value: string): BankAnswerOption => ({
  id, label, normalizedFacts: { [factKey]: value },
});

const QUESTION_OPTIONS = {
  saudOpening: [
    answer("parking_key", "عند السيارة والمفتاح معي", "location:saud:11:42", "parking"),
    answer("cafe_key", "داخل المقهى والمفتاح معي", "location:saud:11:42", "cafe"),
    answer("parking_no_key", "عند السيارة والمفتاح مع غيري", "location:saud:11:42", "parking_no_key"),
  ],
  saudLocation: [
    answer("saud_at_parking", "عند السيارة", "location:saud:11:42", "parking"),
    answer("saud_at_cafe", "داخل المقهى", "location:saud:11:42", "cafe"),
    answer("saud_at_station", "عند محطة البنزين", "location:saud:11:42", "petrol_station"),
  ],
  bag: [
    answer("bag_with_fahad", "مع فهد في المحطة", "bag:time", "fahad"),
    answer("bag_in_car", "داخل السيارة", "bag:time", "car"),
    answer("bag_with_saud", "مع سعود", "bag:time", "saud"),
  ],
  key: [
    answer("key_with_saud", "مع سعود", "key:11:42", "saud"),
    answer("key_with_rakan", "مع راكان", "key:11:42", "rakan"),
    answer("key_with_nawaf", "مع نواف", "key:11:42", "nawaf"),
  ],
  doorway: [
    answer("door_nawaf", "نواف", "door-witness:11:42", "nawaf"),
    answer("door_saud", "سعود", "door-witness:11:42", "saud"),
    answer("door_yazid", "يزيد", "door-witness:11:42", "yazid"),
  ],
  people: [
    answer("person_saud", "سعود", "person", "saud"),
    answer("person_yazid", "يزيد", "person", "yazid"),
    answer("person_fahad", "فهد", "person", "fahad"),
    answer("person_rakan", "راكان", "person", "rakan"),
    answer("person_nawaf", "نواف", "person", "nawaf"),
    answer("person_joud", "جود", "person", "joud"),
  ],
  route: [
    answer("route_sidewalk", "ممر المواقف", "route:saud", "sidewalk"),
    answer("route_alley", "الزقاق", "route:saud", "alley"),
    answer("route_back_street", "الشارع الخلفي", "route:saud", "back_street"),
  ],
  entrant: [
    answer("entrant_saud", "سعود", "doorway-figure:11:44", "saud"),
    answer("entrant_nawaf", "نواف", "doorway-figure:11:44", "nawaf"),
    answer("entrant_rakan", "راكان", "doorway-figure:11:44", "rakan"),
  ],
  carried: [
    answer("carry_key_only", "المفتاح فقط", "saud-carry:11:44", "key_only"),
    answer("carry_bag", "الشنطة", "saud-carry:11:44", "bag"),
    answer("carry_nothing", "ولا شي", "saud-carry:11:44", "nothing"),
  ],
  doorWait: [
    answer("wait_nawaf", "نواف", "door-witness:11:44", "nawaf"),
    answer("wait_yazid", "يزيد", "door-witness:11:44", "yazid"),
    answer("wait_none", "محد", "door-witness:11:44", "none"),
  ],
  stayed: [
    answer("saud_stayed", "بقيت عند السيارة", "saud-moved-before:11:44", "no"),
    answer("saud_left", "تركت السيارة", "saud-moved-before:11:44", "yes"),
  ],
  marker: [
    answer("marker_jacket", "تفاصيل الجاكيت", "doorway-marker", "jacket"),
    answer("marker_key_tag", "لمعة علاقة المفتاح", "doorway-marker", "key_tag"),
  ],
  keyOwner: [
    answer("tag_saud", "سعود", "reflective-tag-owner", "saud"),
    answer("tag_nawaf", "نواف", "reflective-tag-owner", "nawaf"),
    answer("tag_unknown", "ما قدرت أحدد", "reflective-tag-owner", "unknown"),
  ],
  identityRoute: [
    answer("identity_no_movement", "ما جاء من المواقف", "doorway-route", "no_parking_movement"),
    answer("identity_sidewalk", "جاء من ممر المواقف", "doorway-route", "sidewalk"),
    answer("identity_alley", "جاء من الزقاق", "doorway-route", "alley"),
  ],
  doorStay: [
    answer("nawaf_stayed", "بقيت عند الباب", "nawaf-door-stay", "yes"),
    answer("nawaf_arrived", "جيت من المواقف", "nawaf-door-stay", "no"),
  ],
} as const satisfies Readonly<Record<string, readonly BankAnswerOption[]>>;

function optionsFor(count: number, set: "first" | BankRepairId, index: number): readonly BankAnswerOption[] {
  const first = count === 4
    ? [QUESTION_OPTIONS.saudOpening, QUESTION_OPTIONS.saudLocation, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.doorway]
    : count === 5
      ? [QUESTION_OPTIONS.saudLocation, QUESTION_OPTIONS.saudLocation, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.key, QUESTION_OPTIONS.doorway]
      : [QUESTION_OPTIONS.saudOpening, QUESTION_OPTIONS.saudLocation, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.people, QUESTION_OPTIONS.people, QUESTION_OPTIONS.people];
  const movement = count === 4
    ? [QUESTION_OPTIONS.route, QUESTION_OPTIONS.entrant, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.route]
    : count === 5
      ? [QUESTION_OPTIONS.carried, QUESTION_OPTIONS.entrant, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.route, QUESTION_OPTIONS.doorWait]
      : [QUESTION_OPTIONS.route, QUESTION_OPTIONS.entrant, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.route, QUESTION_OPTIONS.entrant, QUESTION_OPTIONS.people];
  const identity = count === 4
    ? [QUESTION_OPTIONS.stayed, QUESTION_OPTIONS.entrant, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.doorStay]
    : count === 5
      ? [QUESTION_OPTIONS.stayed, QUESTION_OPTIONS.marker, QUESTION_OPTIONS.keyOwner, QUESTION_OPTIONS.identityRoute, QUESTION_OPTIONS.doorStay]
      : [QUESTION_OPTIONS.stayed, QUESTION_OPTIONS.entrant, QUESTION_OPTIONS.bag, QUESTION_OPTIONS.identityRoute, QUESTION_OPTIONS.doorStay, QUESTION_OPTIONS.people];
  return (set === "first" ? first : set === "movement" ? movement : identity)[index]!;
}

function blueprintFor(
  count: number,
  set: "first" | BankRepairId,
  index: number,
): readonly [string, readonly string[]] {
  const first = count === 4 ? [
    ["وين كنت وقت الإنذار، ووش كان معك؟", ["location:saud:11:42", "key:11:42"]],
    ["وين شفت سعود وقت الإنذار؟", ["location:saud:11:42"]],
    ["وين كانت الشنطة وقت الإنذار؟", ["bag:11:42"]],
    ["مين كان واقف عند باب المقهى؟", ["door-witness:11:42"]],
  ] : count === 5 ? [
    ["أول ما اشتغل الإنذار، وين كنت؟", ["location:saud:11:42"]],
    ["وين شفت سعود وقت الإنذار؟", ["location:saud:11:42"]],
    ["وين كانت الشنطة السودا وقت الإنذار؟", ["bag:11:42"]],
    ["مين كان معه مفتاح السيارة؟", ["key:11:42"]],
    ["مين كان واقف عند باب المقهى؟", ["door-witness:11:42"]],
  ] : [
    ["وين كنت وقت الإنذار، ومين معه المفتاح؟", ["location:saud:11:42", "key:11:42"]],
    ["وين شفت سعود وقت الإنذار؟", ["location:saud:11:42"]],
    ["وين كانت الشنطة وقت الإنذار؟", ["bag:11:42"]],
    ["مين كان جايب الشنطة من جهة المحطة؟", ["bag-holder:11:42"]],
    ["مين شفته بين المواقف وباب المقهى؟", ["crossing-person:11:42"]],
    ["مين كان ظاهر عند السيارة من جهة المواقف؟", ["parking_camera_sightline"]],
  ];
  const movement = count === 4 ? [
    ["أي مسار مشيت يوم رحت لباب المقهى؟", ["route:saud"]],
    ["مين دخل المقهى الساعة 11:44؟", ["doorway-figure:11:44"]],
    ["الشنطة بقيت معك، ولا دخلت مع سعود؟", ["bag:11:44"]],
    ["من أي جهة وصل سعود لباب المقهى؟", ["route:saud"]],
  ] : count === 5 ? [
    ["وش كان معك يوم دخلت المقهى؟", ["saud-carry:11:44"]],
    ["مين دخل المقهى الساعة 11:44؟", ["doorway-figure:11:44"]],
    ["وين كانت الشنطة الساعة 11:44؟", ["bag:11:44"]],
    ["أي طريق أخذه سعود من السيارة للمقهى؟", ["route:saud"]],
    ["مين بقي عند الباب لين وصل سعود؟", ["door-witness:11:44"]],
  ] : [
    ["متى تركت السيارة، ومن أي جهة مشيت؟", ["saud_departure", "route:saud"]],
    ["مين دخل المقهى 11:44؟", ["doorway-figure:11:44"]],
    ["الشنطة بقيت معك ولا تحركت؟", ["bag:11:44"]],
    ["مر سعود من الزقاق أو ممر المواقف؟", ["route:saud"]],
    ["من وصل باب المقهى؟", ["arrival-person:11:44"]],
    ["مين ابتعد عن السيارة في صورة 11:43؟", ["saud_departure"]],
  ];
  const identity = count === 4 ? [
    ["وين كنت وقت صورة الباب؟", ["saud-moved-before:11:44"]],
    ["اللي شفته عند الباب: سعود ولا نواف؟", ["doorway-figure:11:44"]],
    ["كانت الشنطة معك وقت الصورة؟", ["bag:11:44"]],
    ["بقيت عند الباب ولا جيت من المواقف؟", ["nawaf-door-stay"]],
  ] : count === 5 ? [
    ["هل تركت السيارة قبل 11:44؟", ["saud-moved-before:11:44"]],
    ["وش العلامة اللي عرفت منها الشخص؟", ["doorway-marker"]],
    ["مين كان ممكن يحمل العلاقة العاكسة؟", ["reflective-tag-owner"]],
    ["من أي طريق وصل الشخص للباب؟", ["doorway-route"]],
    ["هل بقيت عند الباب طول الإنذار؟", ["nawaf-door-stay"]],
  ] : [
    ["وين كنت وقت صورة الباب؟", ["saud_stayed_at_car"]],
    ["اللي دخل: سعود ولا نواف؟", ["doorway-figure:11:44"]],
    ["الشنطة كانت معك وقت دخول نواف؟", ["bag:11:44"]],
    ["أي طريق استخدم نواف للباب؟", ["doorway-route"]],
    ["جيت للباب من المواقف أو كنت عنده؟", ["nawaf-door-stay"]],
    ["مين بقي عند السيارة بينما تحرك نواف؟", ["saud_stayed_at_car"]],
  ];
  return (set === "first" ? first : set === "movement" ? movement : identity)[index] as unknown as readonly [string, readonly string[]];
}

export function assignBankQuestions(
  inputPlayers: readonly BankPlayerInput[],
  caseDefinition?: BankRuntimeCaseDefinition,
): readonly BankQuestionAssignment[] {
  if (inputPlayers.length < 4 || inputPlayers.length > 6) {
    throw new Error("Bank Al-Saha requires 4, 5, or 6 players");
  }
  if (new Set(inputPlayers.map(({ id }) => id)).size !== inputPlayers.length) {
    throw new Error("Bank Al-Saha player ids must be unique");
  }
  return inputPlayers
    .slice()
    .sort((a, b) => a.joinOrder - b.joinOrder || a.id.localeCompare(b.id))
    .map((player, index) => {
      const authored = caseDefinition?.questionMatrix[inputPlayers.length as 4 | 5 | 6];
      const fromRuntime = (set: "first" | BankRepairId): BankQuestion | undefined => {
        const source = authored?.[set][index];
        return source ? {
          id: source.id,
          prompt: source.prompt.ar,
          factKeys: [...source.factKeys],
          checks: { ...source.checks },
          options: source.options.map((option) => alignOptionFacts({
            id: option.id,
            label: option.label.ar,
            normalizedFacts: { ...option.normalizedFacts },
          }, source.factKeys)),
        } : undefined;
      };
      return ({
      playerId: player.id,
      displayName: player.name,
      roleLabel: ROLE_LABELS[index]!,
      firstQuestion: fromRuntime("first") ?? question(`bank:first:${index + 1}`, blueprintFor(inputPlayers.length, "first", index), {
        storyRef: `story.seat_${index + 1}`,
        firstLinkedRef: FIRST_LINKED_REFS[index]!,
      }, optionsFor(inputPlayers.length, "first", index)),
      forensicQuestions: {
        movement: fromRuntime("movement") ?? question(
          `bank:forensic:movement:${index + 1}`,
          blueprintFor(inputPlayers.length, "movement", index),
          {
            repairRef: "repair.movement",
            evidenceRef: "evidence.parking_and_cafe_cameras",
            finalLinkedRef: FIRST_LINKED_REFS[index]!,
          }, optionsFor(inputPlayers.length, "movement", index),
        ),
        identity: fromRuntime("identity") ?? question(
          `bank:forensic:identity:${index + 1}`,
          blueprintFor(inputPlayers.length, "identity", index),
          {
            repairRef: "repair.identity",
            evidenceRef: "evidence.doorway_image",
            finalLinkedRef: FIRST_LINKED_REFS[index]!,
          }, optionsFor(inputPlayers.length, "identity", index),
        ),
      },
    });});
}

export interface BankRepairBranch {
  id: BankRepairId;
  title: string;
  officialFacts: readonly { factKey: string; value: BankFactValue }[];
  resolves: string;
  evidenceRequestId: string;
  forensicQuestionSetId: string;
  evidence: { id: string; timestamp: string; summary: string };
}

export const BANK_REPAIR_BRANCHES: Readonly<Record<BankRepairId, BankRepairBranch>> = {
  movement: {
    id: "movement",
    title: "يزيد لخبط في الوقت",
    officialFacts: [
      { factKey: "location:saud:11:42", value: "parking" },
      { factKey: "location:saud:11:44", value: "cafe_entrance" },
    ],
    resolves: "كلام سعود ويزيد يقدر يكون صحيح.",
    evidenceRequestId: "parking_cafe_camera_chain",
    forensicQuestionSetId: "movement_forensic_questions",
    evidence: {
      id: "parking_cafe_camera_chain",
      timestamp: "11:43:48–11:44",
      summary: "كاميرا المواقف وباب المقهى تختبر حركة سعود وتوقيتها.",
    },
  },
  identity: {
    id: "identity",
    title: "يزيد خلط بين سعود ونواف",
    officialFacts: [
      { factKey: "location:saud:11:44", value: "parking" },
      { factKey: "doorway_figure:11:44", value: "nawaf" },
    ],
    resolves: "سعود يبقى عند السيارة، والشخص عند الباب هو نواف.",
    evidenceRequestId: "doorway_jacket_keytag_image",
    forensicQuestionSetId: "identity_forensic_questions",
    evidence: {
      id: "doorway_jacket_keytag_image",
      timestamp: "11:44",
      summary: "صورة الباب تختبر الجاكيت وعلاقة المفتاح وهوية الشخص.",
    },
  },
};

export const BANK_TRUTH_PACKETS = {
  movement_true: {
    id: "movement_true", movement: "proven", identity: "refuted",
    evidence: {
      movement: { id: "parking_cafe_camera_chain", timestamp: "11:44:10", summary: "باب السائق انقفل، وبعدها ظهر الشخص نفسه داخل المقهى والمفتاح بيده." },
      identity: { id: "doorway_jacket_keytag_image", timestamp: "11:44:10", summary: "التكبير أظهر علاقة مفتاح سعود ومسارًا متصلًا من المواقف." },
    },
  },
  identity_true: {
    id: "identity_true", movement: "refuted", identity: "proven",
    evidence: {
      movement: { id: "parking_cafe_camera_chain", timestamp: "11:44:10", summary: "ما ظهر مسار من المواقف، وحساس السيارة أبقى المفتاح قريبًا منها." },
      identity: { id: "doorway_jacket_keytag_image", timestamp: "11:44:10", summary: "التكبير أظهر سحاب جاكيت نواف، والمفتاح بقي قرب السيارة." },
    },
  },
  ambiguous: {
    id: "ambiguous", movement: "gap", identity: "gap",
    evidence: {
      movement: { id: "parking_cafe_camera_chain", timestamp: "11:44:10", summary: "ظل ابتعد عن السيارة، لكن الوجه وعلامة اليد ما كانوا واضحين." },
      identity: { id: "doorway_jacket_keytag_image", timestamp: "11:44:10", summary: "الجاكيت واللمعة ظهروا مع بعض، ولا واحدة حسمت هوية الشخص." },
    },
  },
} as const satisfies Readonly<
  Record<BankTruthPacketId, {
    id: BankTruthPacketId;
    movement: "proven" | "gap" | "refuted";
    identity: "proven" | "gap" | "refuted";
    evidence: Readonly<Record<BankRepairId, BankRepairBranch["evidence"]>>;
  }>
>;

export function getBankRuntimeEvidence(
  truthPacketId: BankTruthPacketId,
  repairId: BankRepairId,
): BankRepairBranch["evidence"] {
  return { ...BANK_TRUTH_PACKETS[truthPacketId].evidence[repairId] };
}

export function evaluateRepairAgainstTruth(
  repairId: BankRepairId,
  truthPacketId: BankTruthPacketId,
): { outcome: "proven" | "gap" | "refuted"; delta: -8 | 10 | 24; reason: string } {
  const outcome = BANK_TRUTH_PACKETS[truthPacketId][repairId];
  if (outcome === "proven") {
    return { outcome, delta: -8, reason: "الدليل ثبت التفسير اللي اخترتوه." };
  }
  if (outcome === "refuted") {
    return { outcome, delta: 24, reason: "الدليل نفى التفسير اللي اخترتوه." };
  }
  return { outcome: "gap", delta: 10, reason: "التفسير بقي ممكن، لكن فيه فجوة." };
}

export interface BankClaim {
  sourceId: string;
  factKey: string;
  value: BankFactValue;
  statement: string;
}

export type BankFirstReveal =
  | { kind: "direct_contradiction"; delta: 15; sources: readonly string[]; explanation: string }
  | { kind: "unexplained_gap"; delta: 8; sources: readonly string[]; explanation: string }
  | { kind: "consistent"; delta: 0; sources: readonly string[]; explanation: string };

export function classifyFirstReveal(input: {
  claims: readonly BankClaim[];
  unexplainedFacts: readonly { factKey: string; explanation: string }[];
}): BankFirstReveal {
  for (let index = 0; index < input.claims.length; index += 1) {
    const first = input.claims[index]!;
    const second = input.claims.slice(index + 1).find(
      (candidate) => candidate.factKey === first.factKey && candidate.value !== first.value,
    );
    if (second) {
      return {
        kind: "direct_contradiction",
        delta: 15,
        sources: [first.sourceId, second.sourceId],
        explanation: `${first.statement} ${second.statement} الكلامين ما يقدرون يكونون صحيحين بنفس اللحظة.`,
      };
    }
  }
  const gap = input.unexplainedFacts[0];
  return gap
    ? { kind: "unexplained_gap", delta: 8, sources: [], explanation: gap.explanation }
    : { kind: "consistent", delta: 0, sources: [], explanation: "ما ظهر تناقض مباشر." };
}

export type BankRepairVoteResolution =
  | { status: "pending"; required: number }
  | {
      status: "locked";
      repairId: BankRepairId;
      required: number;
      decidedBy: "strict_majority";
    };

export function resolveRepairVote(input: {
  playerIds: readonly string[];
  votes: Readonly<Partial<Record<string, BankRepairId>>>;
}): BankRepairVoteResolution {
  const required = Math.floor(input.playerIds.length / 2) + 1;
  const validVotes = input.playerIds.flatMap((id) => {
    const vote = input.votes[id];
    return vote ? [vote] : [];
  });
  const movement = validVotes.filter((vote) => vote === "movement").length;
  const identity = validVotes.length - movement;
  if (movement >= required || identity >= required) {
    return {
      status: "locked",
      repairId: movement >= required ? "movement" : "identity",
      required,
      decidedBy: "strict_majority",
    };
  }
  return { status: "pending", required };
}

export type BankSuspicionBasket =
  | "first_reveal"
  | "repair_test"
  | "forensic_answers"
  | "residual_evidence";

export interface BankSuspicionEntry {
  basket: BankSuspicionBasket;
  delta: number;
  applied: boolean;
  reasonCode: string;
}

export function scoreSuspicionBaskets(input: {
  initialSuspicion: number;
  firstReveal: {
    outcome: "consistent" | "unexplained_gap" | "direct_contradiction" | "evidence_impossibility";
    factKey: string;
  };
  repairTest: { outcome: "proven" | "gap" | "refuted"; evidenceIds: readonly string[] };
  forensicAnswers: { issues: readonly { independentFactKey: string; sourceId: string }[] };
  residualEvidence: {
    outcome: "explained" | "gap" | "direct_conflict";
    evidenceIds: readonly string[];
  };
}): { initialSuspicion: number; entries: readonly BankSuspicionEntry[]; finalSuspicion: number } {
  const firstDelta = {
    consistent: 0,
    unexplained_gap: 8,
    direct_contradiction: 15,
    evidence_impossibility: 20,
  }[input.firstReveal.outcome];
  const repairDelta = { proven: -8, gap: 10, refuted: 24 }[input.repairTest.outcome];
  const issueCount = new Set(input.forensicAnswers.issues.map(({ independentFactKey }) => independentFactKey)).size;
  const forensicDelta = issueCount === 0 ? -10 : issueCount === 1 ? 10 : 18;
  const evidenceReused = input.residualEvidence.evidenceIds.some((id) =>
    input.repairTest.evidenceIds.includes(id),
  );
  const residualDelta = evidenceReused
    ? 0
    : { explained: -4, gap: 8, direct_conflict: 16 }[input.residualEvidence.outcome];
  const entries: readonly BankSuspicionEntry[] = [
    { basket: "first_reveal", delta: firstDelta, applied: true, reasonCode: input.firstReveal.outcome },
    { basket: "repair_test", delta: repairDelta, applied: true, reasonCode: input.repairTest.outcome },
    { basket: "forensic_answers", delta: forensicDelta, applied: true, reasonCode: `independent_issues_${issueCount}` },
    {
      basket: "residual_evidence",
      delta: residualDelta,
      applied: !evidenceReused,
      reasonCode: evidenceReused ? "evidence_already_scored" : input.residualEvidence.outcome,
    },
  ];
  const rawTotal = input.initialSuspicion + entries.reduce((sum, entry) => sum + entry.delta, 0);
  return {
    initialSuspicion: input.initialSuspicion,
    entries,
    finalSuspicion: Math.max(0, Math.min(100, rawTotal)),
  };
}

export type BankFit = 0 | 0.5 | 1;
export type BankScoreCheckKey =
  | "firstStoryFit"
  | "firstLinkedFit"
  | "forensicRepairFit"
  | "forensicEvidenceFit"
  | "forensicLinkedFit";

const SCORE_WEIGHTS: Readonly<Record<BankScoreCheckKey, number>> = {
  firstStoryFit: 25,
  firstLinkedFit: 20,
  forensicRepairFit: 20,
  forensicEvidenceFit: 25,
  forensicLinkedFit: 10,
};

export interface BankScoreCheck { fit: BankFit; ref: string }

export function scoreBankPlayer(input: {
  playerId: string;
  checks: Partial<Record<BankScoreCheckKey, BankScoreCheck>>;
}):
  | { status: "incomplete"; playerId: string; score: null }
  | {
      status: "complete";
      playerId: string;
      score: number;
      strongestContribution: (BankScoreCheck & { check: BankScoreCheckKey; points: number }) | null;
      strongestDeduction: (BankScoreCheck & { check: BankScoreCheckKey; pointsLost: number }) | null;
    } {
  const keys = Object.keys(SCORE_WEIGHTS) as BankScoreCheckKey[];
  if (keys.some((key) => input.checks[key] === undefined)) {
    return { status: "incomplete", playerId: input.playerId, score: null };
  }
  const contributions = keys.map((check) => {
    const item = input.checks[check]!;
    return {
      ...item,
      check,
      points: SCORE_WEIGHTS[check] * item.fit,
      pointsLost: SCORE_WEIGHTS[check] * (1 - item.fit),
    };
  });
  const strongestContribution = contributions
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)[0] ?? null;
  const strongestDeduction = contributions
    .filter(({ pointsLost }) => pointsLost > 0)
    .sort((a, b) => b.pointsLost - a.pointsLost)[0] ?? null;
  return {
    status: "complete",
    playerId: input.playerId,
    score: Math.round(contributions.reduce((sum, { points }) => sum + points, 0)),
    strongestContribution: strongestContribution
      ? {
          fit: strongestContribution.fit,
          ref: strongestContribution.ref,
          check: strongestContribution.check,
          points: strongestContribution.points,
        }
      : null,
    strongestDeduction: strongestDeduction
      ? {
          fit: strongestDeduction.fit,
          ref: strongestDeduction.ref,
          check: strongestDeduction.check,
          pointsLost: strongestDeduction.pointsLost,
        }
      : null,
  };
}

export function buildCausalRecap(input: {
  storyEventId: string;
  revealEventId: string;
  repairEventId: string;
  evidenceEventId: string;
  verdictEventId: string;
  reasons: { reveal: string; evidence: string; verdict: string };
}): {
  steps: readonly { kind: "story" | "reveal" | "repair" | "evidence" | "verdict"; eventId: string; causedBy: string | null }[];
  summaryLines: readonly string[];
} {
  return {
    steps: [
      { kind: "story", eventId: input.storyEventId, causedBy: null },
      { kind: "reveal", eventId: input.revealEventId, causedBy: input.storyEventId },
      { kind: "repair", eventId: input.repairEventId, causedBy: input.revealEventId },
      { kind: "evidence", eventId: input.evidenceEventId, causedBy: input.repairEventId },
      { kind: "verdict", eventId: input.verdictEventId, causedBy: input.evidenceEventId },
    ],
    summaryLines: [input.reasons.reveal, input.reasons.evidence, input.reasons.verdict],
  };
}
