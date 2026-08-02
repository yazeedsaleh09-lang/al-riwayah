import type {
  WarehouseAnswerKind,
  WarehouseCaseDefinition,
  WarehouseChapterDefinition,
  WarehouseIssueDefinition,
  WarehousePatchOption,
  WarehouseQuestionDefinition,
} from "@al-riwayah/game-engine";

const ar = (text: string) => ({ ar: text });

export const WAREHOUSE_CASE_ID = "case.warehouse.v1";

export type WarehouseChapter = "power" | "device" | "car";
export type WarehouseLaterChapter = WarehouseChapter | "result";
export type WarehouseIssueType =
  "DIRECT_CONTRADICTION" | "EVIDENCE_CONFLICT" | "STORY_GAP" | "UNEXPLAINED_EVIDENCE";
export type WarehouseAnswerType =
  | "PLAYER_PICK"
  | "PLAYER_OR_ALONE"
  | "LOCATION_PICK"
  | "YES_NO"
  | "ORDERING"
  | "ROUTE_PICK"
  | "EXPLANATION_PICK";

export interface WarehouseOption {
  id: string;
  label: { ar: string };
}

export interface WarehouseContentQuestion {
  id: string;
  chapter: WarehouseChapter;
  seat: `P${number}`;
  prompt: { ar: string };
  answerType: WarehouseAnswerType;
  options: WarehouseOption[];
  outputFactKey: string;
  comparisonTargets: string[];
  compatibility: string;
  conflict: string;
  relevance: string;
}

export interface WarehouseContentPatch {
  id: string;
  chapter: WarehouseChapter;
  label: { ar: string };
  resolves: { ar: string };
  storyChange: { ar: string };
  laterPressure: { ar: string };
  resolvesIssueTypes: WarehouseIssueType[];
  availability?: {
    factKey: string;
    allowedValues: Array<string | boolean>;
  };
  factsAfter: Array<{ key: string; value: string | boolean }>;
  commitments: Array<{
    id: string;
    factKey: string;
    expectedValue: string | boolean;
    testChapter: WarehouseLaterChapter;
  }>;
  laterEffects: Array<{
    chapter: WarehouseLaterChapter;
    selectorKey: string;
  }>;
}

export interface WarehouseCaseContentDefinition {
  id: string;
  version: string;
  title: { ar: string; en: string };
  pitch: { ar: string };
  premise: { ar: string };
  complexity: { ar: string; en: string };
  playerCounts: number[];
  durationMinutes: [number, number];
  worldFacts: Record<string, string | boolean>;
  storyOptions: {
    entryReason: WarehouseOption[];
    entryRoute: WarehouseOption[];
    locations: WarehouseOption[];
    carPurpose: WarehouseOption[];
    carDepartureExpected: WarehouseOption[];
  };
  questionMatrices: Record<4 | 5 | 6, Record<WarehouseChapter, WarehouseContentQuestion[]>>;
  evidence: Array<{
    id: string;
    chapter: WarehouseChapter;
    title: { ar: string };
    detail: { ar: string };
    timestamp: string;
    asserts: Array<{ key: string; value: string | boolean }>;
  }>;
  issueTypes: WarehouseIssueType[];
  issueDefinitions: Record<
    WarehouseIssueType,
    { label: { ar: string }; explanation: { ar: string }; priority: number }
  >;
  patches: WarehouseContentPatch[];
}

const locations: WarehouseOption[] = [
  { id: "inventory_room", label: ar("غرفة المخزون") },
  { id: "electrical_corridor", label: ar("ممر الكهرباء") },
  { id: "admin_office", label: ar("مكتب الإدارة") },
  { id: "loading_area", label: ar("منطقة التحميل") },
  { id: "parking", label: ar("المواقف") },
  { id: "main_aisle", label: ar("الممر الرئيسي") },
];

const playerOptions: WarehouseOption[] = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `P${index + 1}`,
    label: ar(`اللاعب P${index + 1}`),
  })),
  { id: "alone", label: ar("كان وحده") },
];

const yesNo: WarehouseOption[] = [
  { id: "yes", label: ar("نعم") },
  { id: "no", label: ar("لا") },
];

const explanations = {
  device: [
    { id: "shared_tablet", label: ar("جهاز المستودع المشترك") },
    { id: "auto_connected_phone", label: ar("هاتف اتصل تلقائيًا") },
    { id: "device_in_car", label: ar("جهاز كان داخل السيارة") },
  ],
  departure: [
    { id: "tool_run", label: ar("إحضار أداة أو قطعة") },
    { id: "move_goods", label: ar("نقل الشحنة أو المعدات") },
    { id: "clear_gate", label: ar("إخلاء بوابة التحميل") },
  ],
  cargo: [
    { id: "people", label: ar("أشخاص") },
    { id: "equipment", label: ar("معدات") },
    { id: "shipment", label: ar("شحنة") },
    { id: "nothing", label: ar("لم تحمل شيئًا") },
  ],
};

const orderingOptions: WarehouseOption[] = [
  { id: "first_before_second", label: ar("الأول سبق الثاني") },
  { id: "second_before_first", label: ar("الثاني سبق الأول") },
  { id: "same_window", label: ar("حدثا في النافذة نفسها") },
];

const routeOptions: WarehouseOption[] = [
  { id: "main_aisle_to_office", label: ar("الممر الرئيسي إلى المكتب") },
  { id: "loading_area_to_office", label: ar("منطقة التحميل إلى المكتب") },
  { id: "parking_to_office", label: ar("المواقف إلى المكتب") },
];

type QuestionSeed = Omit<WarehouseContentQuestion, "id" | "chapter" | "seat">;

function question(
  count: 4 | 5 | 6,
  chapter: WarehouseChapter,
  seatNumber: number,
  seed: QuestionSeed,
): WarehouseContentQuestion {
  return {
    id: `warehouse.${chapter}.${count}.P${seatNumber}`,
    chapter,
    seat: `P${seatNumber}`,
    ...seed,
  };
}

function matrix(
  count: 4 | 5 | 6,
  chapter: WarehouseChapter,
  seeds: QuestionSeed[],
): WarehouseContentQuestion[] {
  return seeds.map((seed, index) => question(count, chapter, index + 1, seed));
}

const q = (
  prompt: string,
  answerType: WarehouseAnswerType,
  options: WarehouseOption[],
  outputFactKey: string,
  comparisonTargets: string[],
  compatibility: string,
  conflict: string,
  relevance: string,
): QuestionSeed => ({
  prompt: ar(prompt),
  answerType,
  options,
  outputFactKey,
  comparisonTargets,
  compatibility,
  conflict,
  relevance,
});

const power4 = [
  q(
    "أين كان P2 وقت الانقطاع؟",
    "LOCATION_PICK",
    locations,
    "reported_location.P2.2346",
    ["self_location.P2.2346", "story.location2346.P2"],
    "same_location",
    "different_location",
    "power_location_consistency",
  ),
  q(
    "أين كنت وقت الانقطاع؟",
    "LOCATION_PICK",
    locations,
    "self_location.P2.2346",
    ["reported_location.P2.2346", "story.location2346.P2"],
    "same_location",
    "different_location",
    "power_location_consistency",
  ),
  q(
    "من كان مع P4 وقت الانقطاع؟",
    "PLAYER_OR_ALONE",
    playerOptions,
    "reported_companion.P4.2346",
    ["self_companion.P4.2346", "story.location2346"],
    "reciprocal_companion",
    "incompatible_companion",
    "power_colocation_consistency",
  ),
  q(
    "من كان معك وقت الانقطاع؟",
    "PLAYER_OR_ALONE",
    playerOptions,
    "self_companion.P4.2346",
    ["reported_companion.P4.2346", "story.location2346"],
    "reciprocal_companion",
    "incompatible_companion",
    "power_colocation_consistency",
  ),
];

const power6 = [
  q(
    "أين كان P2 وقت الانقطاع؟",
    "LOCATION_PICK",
    locations,
    "reported_location.P2.2346",
    ["self_location.P2.2346", "story.location2346.P2"],
    "same_location",
    "different_location",
    "power_location_consistency",
  ),
  q(
    "أين كنت وقت الانقطاع؟",
    "LOCATION_PICK",
    locations,
    "self_location.P2.2346",
    ["reported_location.P2.2346", "story.location2346.P2"],
    "same_location",
    "different_location",
    "power_location_consistency",
  ),
  q(
    "أين كان P4 وقت الانقطاع؟",
    "LOCATION_PICK",
    locations,
    "reported_location.P4.2346",
    ["self_location.P4.2346", "story.location2346.P4"],
    "same_location",
    "different_location",
    "power_location_consistency",
  ),
  q(
    "أين كنت وقت الانقطاع؟",
    "LOCATION_PICK",
    locations,
    "self_location.P4.2346",
    ["reported_location.P4.2346", "story.location2346.P4"],
    "same_location",
    "different_location",
    "power_location_consistency",
  ),
  q(
    "من كان مع P6 وقت الانقطاع؟",
    "PLAYER_OR_ALONE",
    playerOptions,
    "reported_companion.P6.2346",
    ["self_companion.P6.2346", "story.location2346"],
    "reciprocal_companion",
    "incompatible_companion",
    "power_colocation_consistency",
  ),
  q(
    "من كان معك وقت الانقطاع؟",
    "PLAYER_OR_ALONE",
    playerOptions,
    "self_companion.P6.2346",
    ["reported_companion.P6.2346", "story.location2346"],
    "reciprocal_companion",
    "incompatible_companion",
    "power_colocation_consistency",
  ),
];

const device4 = [
  q(
    "أين كان الجهاز عند 23:48؟",
    "LOCATION_PICK",
    locations,
    "device_location.2348",
    ["nearest_player.2348", "evidence.device_access_point", "derived.movement"],
    "location_reachable",
    "location_unreachable",
    "device_evidence_fit",
  ),
  q(
    "من كان الأقرب إلى الجهاز؟",
    "PLAYER_PICK",
    playerOptions.slice(0, 6),
    "nearest_player.2348",
    ["device_location.2348", "story.location2346", "derived.movement"],
    "player_near_location",
    "player_cannot_reach",
    "device_actor_gap",
  ),
  q(
    "هل كان فتح شاشة المخزون ضمن روايتكم؟",
    "YES_NO",
    yesNo,
    "inventory_screen_expected",
    ["device_explanation", "story.entryReason"],
    "intent_matches_explanation",
    "intent_conflicts_explanation",
    "inventory_access_fit",
  ),
  q(
    "ما أقرب تفسير لاتصال الجهاز؟",
    "EXPLANATION_PICK",
    explanations.device,
    "device_explanation",
    ["inventory_screen_expected", "evidence.device_connection"],
    "explanation_fits_intent",
    "explanation_conflicts_evidence",
    "device_evidence_fit",
  ),
];

const device6 = [
  ...device4,
  q(
    "هل تسمح الحركة بالوصول للمكتب قبل 23:48؟",
    "YES_NO",
    yesNo,
    "office_reachable_before_2348",
    ["device_route", "derived.movement"],
    "route_reachable",
    "route_unreachable",
    "prior_patch_commitment",
  ),
  q(
    "أي مسار استُخدم للوصول إلى نقطة الاتصال؟",
    "ROUTE_PICK",
    routeOptions,
    "device_route",
    ["office_reachable_before_2348", "derived.movement"],
    "route_matches_reachability",
    "route_breaks_movement",
    "prior_patch_later_effect",
  ),
];

const car4 = [
  q(
    "هل كانت مغادرة السيارة متوقعة؟",
    "YES_NO",
    yesNo,
    "car_departure_expected.0001",
    ["car_departure_reason", "story.carDepartureExpected"],
    "expectation_matches_story",
    "expectation_conflicts_story",
    "car_evidence_fit",
  ),
  q(
    "ما سبب مغادرة السيارة؟",
    "EXPLANATION_PICK",
    explanations.departure,
    "car_departure_reason",
    ["car_departure_expected.0001", "story.carPurpose"],
    "reason_matches_purpose",
    "reason_conflicts_purpose",
    "car_evidence_fit",
  ),
  q(
    "من كان يجب أن يملك المفتاح عند الخروج؟",
    "PLAYER_PICK",
    playerOptions.slice(0, 6),
    "key_holder.0001",
    ["car_companion.0001", "derived.patch_commitments"],
    "key_holder_available",
    "key_holder_unavailable",
    "key_commitment_fit",
  ),
  q(
    "من كان مع السيارة عند 00:01؟",
    "PLAYER_OR_ALONE",
    playerOptions,
    "car_companion.0001",
    ["key_holder.0001", "derived.movement"],
    "companion_reachable",
    "companion_unreachable",
    "car_actor_gap",
  ),
];

const car6 = [
  ...car4,
  q(
    "ماذا كانت السيارة تحمل؟",
    "EXPLANATION_PICK",
    explanations.cargo,
    "car_cargo",
    ["car_timing_order", "story.entryReason", "story.carPurpose"],
    "cargo_matches_story",
    "cargo_conflicts_story",
    "car_purpose_fit",
  ),
  q(
    "أيهما سبق: اتصال الجهاز أم تجهيز السيارة؟",
    "ORDERING",
    orderingOptions,
    "car_timing_order",
    ["car_cargo", "derived.device_linked_to_car"],
    "ordering_supports_cargo",
    "ordering_breaks_device_link",
    "device_patch_later_effect",
  ),
];

const p5Power = q(
  "من كان يحمل المفتاح وقت الانقطاع؟",
  "PLAYER_PICK",
  playerOptions.slice(0, 6),
  "key_holder.2346",
  ["story.keyHolderInitial", "derived.gate_open_reason"],
  "same_key_holder",
  "different_key_holder",
  "gate_open_explanation",
);
const p5Device = q(
  "رتب: فتح البوابة، انتقال أقرب لاعب، اتصال الجهاز",
  "ORDERING",
  orderingOptions,
  "device_event_order",
  ["derived.movement", "evidence.gate_opened_at", "evidence.device_connected_at"],
  "ordering_respects_timestamps",
  "ordering_impossible",
  "power_patch_later_effect",
);
const p5Car = q(
  "ماذا كانت السيارة تحمل؟",
  "EXPLANATION_PICK",
  explanations.cargo,
  "car_cargo",
  ["story.entryReason", "story.carPurpose", "derived.device_linked_to_car"],
  "cargo_matches_story",
  "cargo_conflicts_story",
  "car_evidence_fit",
);

const questionMatrices: WarehouseCaseContentDefinition["questionMatrices"] = {
  4: {
    power: matrix(4, "power", power4),
    device: matrix(4, "device", device4),
    car: matrix(4, "car", car4),
  },
  5: {
    power: matrix(5, "power", [...power4, p5Power]),
    device: matrix(5, "device", [...device4, p5Device]),
    car: matrix(5, "car", [...car4, p5Car]),
  },
  6: {
    power: matrix(6, "power", power6),
    device: matrix(6, "device", device6),
    car: matrix(6, "car", car6),
  },
};

const patches: WarehouseContentPatch[] = [
  {
    id: "P1_FETCH_TOOL",
    chapter: "power",
    label: ar("خرج أحدنا لإحضار مصباح أو أداة"),
    resolves: ar("يفسر فتح بوابة التحميل بعد الانقطاع."),
    storyChange: ar("تضيف الرواية حركة لاعب مختار إلى منطقة التحميل بين 23:46 و23:48."),
    laterPressure: ar("تُختبر الحركة وصلتها بالسيارة واتصال الجهاز في الفصل التالي."),
    resolvesIssueTypes: ["UNEXPLAINED_EVIDENCE"],
    factsAfter: [
      { key: "gate_open_reason", value: "fetch_tool" },
      { key: "movement.selectedPlayer", value: "to_loading_area_2346_2348" },
      { key: "car_is_relevant", value: true },
    ],
    commitments: [
      {
        id: "commit.fetch_tool_movement",
        factKey: "movement.selectedPlayer",
        expectedValue: "to_loading_area_2346_2348",
        testChapter: "device",
      },
    ],
    laterEffects: [{ chapter: "device", selectorKey: "movement.selectedPlayer" }],
  },
  {
    id: "P1_MANUAL_GATE_RESET",
    chapter: "power",
    label: ar("أعدنا ضبط البوابة يدويًا"),
    resolves: ar("يفسر فتح البوابة بعد انقطاع الكهرباء."),
    storyChange: ar("تثبت الرواية استخدام المفتاح بعد الانقطاع وتربط لاعبًا بإعادة الضبط."),
    laterPressure: ar("يُختبر ترتيب إعادة الضبط واتصال الجهاز."),
    resolvesIssueTypes: ["DIRECT_CONTRADICTION", "UNEXPLAINED_EVIDENCE"],
    factsAfter: [
      { key: "gate_open_reason", value: "manual_reset" },
      { key: "key_used_after_outage", value: true },
      { key: "gate_reset_actor", value: "selected_player" },
    ],
    commitments: [
      {
        id: "commit.manual_reset_key",
        factKey: "key_used_after_outage",
        expectedValue: true,
        testChapter: "device",
      },
    ],
    laterEffects: [{ chapter: "device", selectorKey: "key_used_after_outage" }],
  },
  {
    id: "P1_CHECK_SHIPMENT",
    chapter: "power",
    label: ar("فتحنا البوابة لفحص الشحنة أو المعدات"),
    resolves: ar("يربط فتح البوابة بسبب الدخول الجماعي."),
    storyChange: ar("تجعل الرواية فحص البضائع وشاشة المخزون أمرين متوقعين."),
    laterPressure: ar("يجب تفسير مستخدم الجهاز في الفصل التالي."),
    resolvesIssueTypes: ["DIRECT_CONTRADICTION", "UNEXPLAINED_EVIDENCE"],
    factsAfter: [
      { key: "gate_open_reason", value: "check_goods" },
      { key: "loading_check_expected", value: true },
      { key: "inventory_screen_expected", value: true },
    ],
    commitments: [
      {
        id: "commit.inventory_screen_expected",
        factKey: "inventory_screen_expected",
        expectedValue: true,
        testChapter: "device",
      },
    ],
    laterEffects: [{ chapter: "device", selectorKey: "inventory_screen_expected" }],
  },
  {
    id: "P2_SHARED_TABLET",
    chapter: "device",
    label: ar("استخدمنا جهاز المستودع المشترك"),
    resolves: ar("يفسر اتصال الجهاز وفتح سجل المخزون."),
    storyChange: ar("تثبت الرواية وجود الجهاز في مكتب الإدارة وأن الوصول للمخزون مقصود."),
    laterPressure: ar("يجب أن تسمح الحركة بوصول لاعب إلى المكتب ضمن الوقت."),
    resolvesIssueTypes: ["EVIDENCE_CONFLICT", "STORY_GAP"],
    factsAfter: [
      { key: "device_explanation", value: "shared_tablet" },
      { key: "device_location_2348", value: "admin_office" },
      { key: "inventory_access_intentional", value: true },
    ],
    commitments: [
      {
        id: "commit.shared_tablet_office",
        factKey: "device_location_2348",
        expectedValue: "admin_office",
        testChapter: "car",
      },
    ],
    laterEffects: [{ chapter: "car", selectorKey: "device_location_2348" }],
  },
  {
    id: "P2_PHONE_AUTO_CONNECT",
    chapter: "device",
    label: ar("اتصل هاتف تلقائيًا قرب المكتب"),
    resolves: ar("يفسر ظهور الجهاز غير المسجل على الشبكة."),
    storyChange: ar("تثبت الرواية مرور هاتف قرب المكتب دون قصد فتح السجل."),
    laterPressure: ar("يجب أن يطابق مسار الحركة هذا المرور."),
    resolvesIssueTypes: ["EVIDENCE_CONFLICT"],
    factsAfter: [
      { key: "device_explanation", value: "auto_connected_phone" },
      { key: "device_location_2348", value: "admin_office_range" },
      { key: "inventory_access_intentional", value: false },
    ],
    commitments: [
      {
        id: "commit.phone_office_route",
        factKey: "device_location_2348",
        expectedValue: "admin_office_range",
        testChapter: "car",
      },
    ],
    laterEffects: [{ chapter: "car", selectorKey: "device_location_2348" }],
  },
  {
    id: "P2_DEVICE_IN_CAR",
    chapter: "device",
    label: ar("كان الجهاز داخل السيارة"),
    resolves: ar("يفسر الاتصال القريب من نقطة الوصول ومراجعة الشحنة."),
    storyChange: ar("تربط الرواية الجهاز بالسيارة قبل مغادرتها."),
    laterPressure: ar("يجب تفسير مستخدم الجهاز وسبب مغادرة السيارة."),
    resolvesIssueTypes: ["STORY_GAP"],
    availability: { factKey: "car_is_relevant", allowedValues: [true] },
    factsAfter: [
      { key: "device_explanation", value: "device_in_car" },
      { key: "device_location_2348", value: "parking_near_admin" },
      { key: "device_linked_to_car", value: true },
    ],
    commitments: [
      {
        id: "commit.device_car_link",
        factKey: "device_linked_to_car",
        expectedValue: true,
        testChapter: "car",
      },
    ],
    laterEffects: [{ chapter: "car", selectorKey: "device_linked_to_car" }],
  },
  {
    id: "P3_PLANNED_TOOL_RUN",
    chapter: "car",
    label: ar("غادرت السيارة لإحضار أداة ثم العودة"),
    resolves: ar("يفسر مغادرة السيارة عند 00:01."),
    storyChange: ar("تثبت الرواية أن المغادرة مؤقتة ومقصودة."),
    laterPressure: ar("يظهر هذا الالتزام في تفسير النتيجة الجماعية."),
    resolvesIssueTypes: ["EVIDENCE_CONFLICT", "UNEXPLAINED_EVIDENCE"],
    factsAfter: [
      { key: "car_departure_reason", value: "tool_run" },
      { key: "car_departure_temporary", value: true },
    ],
    commitments: [],
    laterEffects: [{ chapter: "result", selectorKey: "car_departure_reason" }],
  },
  {
    id: "P3_MOVE_GOODS_TO_SAFE_LOCATION",
    chapter: "car",
    label: ar("نقلنا الشحنة أو المعدات إلى مكان آمن"),
    resolves: ar("يفسر المغادرة وحمولة السيارة."),
    storyChange: ar("تثبت الرواية أن السيارة حملت البضائع وغادرت عمدًا."),
    laterPressure: ar("يُقيّم تطابق القرار مع سبب الدخول في النتيجة."),
    resolvesIssueTypes: ["EVIDENCE_CONFLICT"],
    factsAfter: [
      { key: "car_departure_reason", value: "move_goods" },
      { key: "car_cargo", value: "goods" },
      { key: "departure_intentional", value: true },
    ],
    commitments: [],
    laterEffects: [{ chapter: "result", selectorKey: "car_cargo" }],
  },
  {
    id: "P3_CLEAR_LOADING_GATE",
    chapter: "car",
    label: ar("حرّكنا السيارة لأنها تعيق البوابة"),
    resolves: ar("يفسر عبور السيارة من بوابة التحميل."),
    storyChange: ar("تثبت الرواية أن السيارة لم تحمل شيئًا وأن الحركة محدودة."),
    laterPressure: ar("يُقيّم اتساق هذا التفسير مع غرض السيارة في النتيجة."),
    resolvesIssueTypes: ["UNEXPLAINED_EVIDENCE"],
    factsAfter: [
      { key: "car_departure_reason", value: "clear_gate" },
      { key: "car_cargo", value: "none" },
      { key: "departure_intentional", value: "limited" },
    ],
    commitments: [],
    laterEffects: [{ chapter: "result", selectorKey: "car_departure_reason" }],
  },
];

const warehouseAuthoredContent: WarehouseCaseContentDefinition = {
  id: WAREHOUSE_CASE_ID,
  version: "1.0.0",
  title: { ar: "قضية المستودع", en: "The Warehouse" },
  pitch: ar("ابنوا رواية واحدة، اختبروا تماسكها، ثم أصلحوها قبل وصول الحارس."),
  premise: ar(
    "دخلتم المستودع بعد الإغلاق دون تسجيل دخول رسمي. قبل وصول الحارس، عليكم اعتماد رواية مشتركة تفسر وجودكم وما حدث في الداخل. عند 23:46 انقطعت الكهرباء. عند 23:48 اتصل جهاز بشبكة المستودع. عند 00:01 غادرت سيارة من المواقف. روايتكم يجب أن تفسر الأحداث الثلاثة دون أن تتعارض إجاباتكم أو تنهار أمام الأدلة الجديدة.",
  ),
  complexity: { ar: "متوسط", en: "Intermediate" },
  playerCounts: [4, 5, 6],
  durationMinutes: [25, 30],
  worldFacts: {
    WORLD_UNREGISTERED_ENTRY: true,
    WORLD_POWER_OUTAGE_2346: "23:46",
    WORLD_DEVICE_CONNECTED_2348: "23:48",
    WORLD_CAR_EXIT_0001: "00:01",
    WORLD_GUARD_APPROACHING: true,
  },
  storyOptions: {
    entryReason: [
      { id: "retrieve_misplaced_shipment", label: ar("استرجاع شحنة وصلت للمكان الخطأ") },
      { id: "check_inventory_mismatch", label: ar("مراجعة نقص ظهر في سجل المخزون") },
      { id: "return_equipment_before_audit", label: ar("إعادة معدات قبل جرد الصباح") },
    ],
    entryRoute: [
      { id: "side_door", label: ar("الباب الجانبي") },
      { id: "loading_gate", label: ar("بوابة التحميل") },
      { id: "delivery_vehicle", label: ar("دخلتم مع سيارة التوصيل") },
    ],
    locations,
    carPurpose: [
      { id: "transport_people", label: ar("نقل المجموعة") },
      { id: "carry_equipment", label: ar("نقل معدات") },
      { id: "collect_shipment", label: ar("استلام الشحنة") },
      { id: "temporary_parking", label: ar("توقف مؤقت فقط") },
    ],
    carDepartureExpected: [
      { id: "true", label: ar("نعم، كان مقررًا أن تغادر قبل 00:05") },
      { id: "false", label: ar("لا، كان يفترض أن تبقى حتى خروج الجميع") },
    ],
  },
  questionMatrices,
  evidence: [
    {
      id: "E_POWER_LOADING_GATE_2347",
      chapter: "power",
      title: ar("بوابة التحميل"),
      detail: ar("فُتحت بوابة التحميل عند 23:47، بعد انقطاع الكهرباء بدقيقة."),
      timestamp: "23:47",
      asserts: [{ key: "loading_gate_opened_at", value: "23:47" }],
    },
    {
      id: "E_DEVICE_ADMIN_AP_2348",
      chapter: "device",
      title: ar("اتصال الجهاز"),
      detail: ar(
        "اتصل جهاز غير مسجل عند 23:48 عبر نقطة الوصول القريبة من مكتب الإدارة، وفتح شاشة المخزون.",
      ),
      timestamp: "23:48",
      asserts: [
        { key: "device_connected_at", value: "23:48" },
        { key: "device_access_point", value: "admin_office" },
        { key: "inventory_screen_opened", value: true },
      ],
    },
    {
      id: "E_CAR_LOADING_GATE_0001",
      chapter: "car",
      title: ar("مغادرة السيارة"),
      detail: ar("غادرت السيارة عند 00:01 عبر بوابة التحميل."),
      timestamp: "00:01",
      asserts: [
        { key: "car_exited_at", value: "00:01" },
        { key: "car_exit_route", value: "loading_gate" },
      ],
    },
  ],
  issueTypes: ["DIRECT_CONTRADICTION", "EVIDENCE_CONFLICT", "STORY_GAP", "UNEXPLAINED_EVIDENCE"],
  issueDefinitions: {
    DIRECT_CONTRADICTION: {
      label: ar("إجابتان لا تركبان معًا"),
      explanation: ar("وصفت إجابتان اللحظة نفسها بحقيقتين لا يمكن اجتماعهما."),
      priority: 1,
    },
    EVIDENCE_CONFLICT: {
      label: ar("الرواية تصطدم بالدليل"),
      explanation: ar("الدليل يثبت حقيقة تنفيها الرواية الحالية."),
      priority: 0,
    },
    STORY_GAP: {
      label: ar("تفصيلة لازمة لم تُحسم"),
      explanation: ar("تحتاج الرواية إلى حقيقة إضافية كي تفسر الحدث."),
      priority: 2,
    },
    UNEXPLAINED_EVIDENCE: {
      label: ar("دليل بلا تفسير"),
      explanation: ar("وقع الحدث المثبت، لكن الرواية لا تشرح سببه بعد."),
      priority: 3,
    },
  },
  patches,
};

const canonicalQuestionMatrix = Object.fromEntries(
  ([4, 5, 6] as const).map((count) => [
    count,
    Object.fromEntries(
      (["power", "device", "car"] as const).map((chapter) => [
        chapter,
        warehouseAuthoredContent.questionMatrices[count][chapter].map(
          (question): WarehouseQuestionDefinition => ({
            id: question.id,
            chapter: question.chapter,
            seat: question.seat as WarehouseQuestionDefinition["seat"],
            answerKind: (question.answerType === "PLAYER_OR_ALONE"
              ? "PLAYER_PICK"
              : question.answerType) as WarehouseAnswerKind,
            prompt: question.prompt,
            options: question.options
              .filter((option) => {
                const seatNumber = /^P(\d)$/.exec(option.id)?.[1];
                return seatNumber === undefined || Number(seatNumber) <= count;
              })
              .map((option) => ({
                id: option.id,
                value: option.id,
                label: option.label,
              })),
            outputFactKey: question.outputFactKey,
            comparisonTargets: question.comparisonTargets,
            compatibilityRule: question.compatibility,
            conflictRule: question.conflict,
            relevance: ["evidence", "patch", "result"],
            ...(
              {
                "device:P1": { laterEffectSelector: "movement.selectedPlayer" },
                "device:P3": { laterEffectSelector: "inventory_screen_expected" },
                "device:P4": { laterEffectSelector: "key_used_after_outage" },
                "car:P2": { laterEffectSelector: "device_linked_to_car" },
                "car:P4": { laterEffectSelector: "device_location_2348" },
              } as Record<string, { laterEffectSelector: string }>
            )[`${question.chapter}:${question.seat}`],
          }),
        ),
      ]),
    ),
  ]),
) as unknown as WarehouseCaseDefinition["questionMatrix"];

const issueTypesByChapter = {
  power: ["DIRECT_CONTRADICTION", "UNEXPLAINED_EVIDENCE"],
  device: ["EVIDENCE_CONFLICT", "STORY_GAP"],
  car: ["EVIDENCE_CONFLICT", "UNEXPLAINED_EVIDENCE"],
} as const satisfies Record<WarehouseChapter, readonly WarehouseIssueType[]>;

const canonicalIssues: WarehouseIssueDefinition[] = (["power", "device", "car"] as const).flatMap(
  (chapter) =>
    issueTypesByChapter[chapter].map((type, index) => ({
      id: `issue.${chapter}.${type.toLowerCase()}`,
      chapter,
      type,
      severity: 8 - index,
      independentKey: `${chapter}.${type.toLowerCase()}`,
      factRefs: [
        warehouseAuthoredContent.evidence.find((item) => item.chapter === chapter)!.asserts[0]!.key,
        `${chapter}.answer_fact`,
      ],
      patchOptionIds: warehouseAuthoredContent.patches
        .filter((patch) => patch.chapter === chapter && patch.resolvesIssueTypes.includes(type))
        .map((patch) => patch.id),
      publicTitle: warehouseAuthoredContent.issueDefinitions[type].label,
      publicExplanation: warehouseAuthoredContent.issueDefinitions[type].explanation,
    })),
);

const canonicalPatches: WarehousePatchOption[] = warehouseAuthoredContent.patches.map((patch) => ({
  id: patch.id,
  chapter: patch.chapter,
  resolvesIssueIds: canonicalIssues
    .filter(
      (issue) => issue.chapter === patch.chapter && patch.resolvesIssueTypes.includes(issue.type),
    )
    .map((issue) => issue.id),
  factsAfter: patch.factsAfter,
  ...(patch.availability ? { availability: patch.availability } : {}),
  commitments: patch.commitments.map((commitment) => ({
    ...commitment,
    testChapter: commitment.testChapter === "result" ? "car" : commitment.testChapter,
    status: "pending" as const,
  })),
  laterEffects: patch.laterEffects
    .filter(
      (
        effect,
      ): effect is {
        chapter: WarehouseChapter;
        selectorKey: string;
      } => effect.chapter !== "result",
    )
    .map((effect) => ({
      chapter: effect.chapter,
      selectorKey: effect.selectorKey,
    })),
  newFactCount: patch.factsAfter.length,
  changedFactCount: 0,
  publicLabel: patch.label,
  description: patch.storyChange,
  solves: patch.resolves,
  nextPressure: patch.laterPressure,
}));

const canonicalChapters = Object.fromEntries(
  (["power", "device", "car"] as const).map((chapter) => {
    const evidence = warehouseAuthoredContent.evidence.find((item) => item.chapter === chapter)!;
    const definition: WarehouseChapterDefinition = {
      id: chapter,
      evidence: {
        id: evidence.id,
        chapter,
        title: evidence.title,
        detail: evidence.detail,
        timestamp: evidence.timestamp,
        factKey: evidence.asserts[0]!.key,
        value: evidence.asserts[0]!.value,
        pressureKey: `pressure.${chapter}`,
      },
      issueIds: canonicalIssues
        .filter((issue) => issue.chapter === chapter)
        .map((issue) => issue.id),
      patchOptionIds: canonicalPatches
        .filter((patch) => patch.chapter === chapter)
        .map((patch) => patch.id),
    };
    return [chapter, definition];
  }),
) as unknown as WarehouseCaseDefinition["chapters"];

/** Canonical, engine-consumable Warehouse definition. */
export const warehouseCaseV1: WarehouseCaseDefinition = {
  id: warehouseAuthoredContent.id,
  version: warehouseAuthoredContent.version,
  title: warehouseAuthoredContent.title,
  pitch: warehouseAuthoredContent.pitch,
  premise: warehouseAuthoredContent.premise,
  complexity: warehouseAuthoredContent.complexity,
  durationMinutes: warehouseAuthoredContent.durationMinutes,
  supportedPlayerCounts: [4, 5, 6],
  storyOptions: {
    entryReasons: warehouseAuthoredContent.storyOptions
      .entryReason as WarehouseCaseDefinition["storyOptions"]["entryReasons"],
    entryRoutes: warehouseAuthoredContent.storyOptions
      .entryRoute as WarehouseCaseDefinition["storyOptions"]["entryRoutes"],
    locations: warehouseAuthoredContent.storyOptions
      .locations as WarehouseCaseDefinition["storyOptions"]["locations"],
    carPurposes: warehouseAuthoredContent.storyOptions
      .carPurpose as WarehouseCaseDefinition["storyOptions"]["carPurposes"],
  },
  chapters: canonicalChapters,
  questionMatrix: canonicalQuestionMatrix,
  issues: canonicalIssues,
  patchOptions: canonicalPatches,
  resultBands: [
    {
      id: "needs_repair",
      min: 0,
      max: 59,
      label: ar("الرواية تحتاج إصلاحًا"),
      summary: ar("بقيت فجوات أو تعارضات مؤثرة في تفسير الأحداث."),
    },
    {
      id: "defensible",
      min: 60,
      max: 84,
      label: ar("رواية قابلة للدفاع"),
      summary: ar("فسرت الرواية معظم الأدلة مع بعض الالتزامات الضعيفة."),
    },
    {
      id: "coherent",
      min: 85,
      max: 100,
      label: ar("رواية متماسكة"),
      summary: ar("توافقت الإجابات وفُسرت الأدلة وثبتت الترقيعات."),
    },
  ],
  copy: {
    silentPhaseIntro: ar("مرحلة الصمت — لا تناقشوا الأسئلة حتى يثبت الجميع إجاباتهم."),
    advisoryWaiting: ar("خذ وقتك — بانتظار إجابتك."),
    fairScoreUnavailable: ar("تعذر حساب نتيجة عادلة لهذه الجولة."),
    noDirectContradiction: ar("لم يظهر تناقض مباشر؛ بقي الضغط في تفسير الأدلة والفجوات."),
  },
};

/** Localized, spoiler-free metadata retained for the existing public summary API. */
export const warehouseCaseMetadata = {
  title: warehouseAuthoredContent.title,
  pitch: warehouseAuthoredContent.pitch,
  premise: warehouseAuthoredContent.premise,
  complexity: warehouseAuthoredContent.complexity,
  playerCounts: warehouseAuthoredContent.playerCounts,
  durationMinutes: warehouseAuthoredContent.durationMinutes,
} as const;

/** Locked fixed facts and labels consumed by story-building UI/content surfaces. */
export const warehouseCaseCopy = {
  worldFacts: warehouseAuthoredContent.worldFacts,
  storyOptions: warehouseAuthoredContent.storyOptions,
  evidence: warehouseAuthoredContent.evidence,
  issueDefinitions: warehouseAuthoredContent.issueDefinitions,
  patches: warehouseAuthoredContent.patches.map(
    ({ id, availability, label, resolves, storyChange, laterPressure }) => ({
      id,
      availability,
      label,
      resolves,
      storyChange,
      laterPressure,
    }),
  ),
} as const;
