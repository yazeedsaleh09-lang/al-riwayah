import { describe, expect, it } from "vitest";
import {
  createWarehouseCase,
  isWarehousePatchAvailable,
  validateWarehouseCaseDefinition,
} from "@al-riwayah/game-engine";
import {
  DEFAULT_CASE_ID,
  WAREHOUSE_CASE_ID,
  getCase,
  publicCaseSummaries,
  validateWarehouseCase,
  warehouseCaseCopy,
  warehouseCaseV1,
} from "../src/index";

const chapters = ["power", "device", "car"] as const;
const counts = [4, 5, 6] as const;

describe("Warehouse Case V1 authored content", () => {
  it("ships the locked Warehouse case as the validated default", () => {
    expect(warehouseCaseV1.id).toBe(WAREHOUSE_CASE_ID);
    expect(DEFAULT_CASE_ID).toBe(WAREHOUSE_CASE_ID);
    expect(getCase(DEFAULT_CASE_ID)).toBe(warehouseCaseV1);
    expect(warehouseCaseV1.supportedPlayerCounts).toEqual([4, 5, 6]);
    expect(warehouseCaseV1.durationMinutes).toEqual([25, 30]);
    expect(validateWarehouseCase(warehouseCaseV1)).toEqual({ ok: true, errors: [] });
    expect(publicCaseSummaries()).toEqual([
      expect.objectContaining({
        id: WAREHOUSE_CASE_ID,
        playerCounts: [4, 5, 6],
        durationMinutes: [25, 30],
        status: "available",
      }),
    ]);
  });

  it("contains the exact fixed world and shared-story option sets", () => {
    expect(warehouseCaseCopy.worldFacts).toEqual({
      WORLD_UNREGISTERED_ENTRY: true,
      WORLD_POWER_OUTAGE_2346: "23:46",
      WORLD_DEVICE_CONNECTED_2348: "23:48",
      WORLD_CAR_EXIT_0001: "00:01",
      WORLD_GUARD_APPROACHING: true,
    });
    expect(warehouseCaseV1.storyOptions.entryReasons.map((option) => option.id)).toEqual([
      "retrieve_misplaced_shipment",
      "check_inventory_mismatch",
      "return_equipment_before_audit",
    ]);
    expect(warehouseCaseV1.storyOptions.entryRoutes.map((option) => option.id)).toEqual([
      "side_door",
      "loading_gate",
      "delivery_vehicle",
    ]);
    expect(warehouseCaseV1.storyOptions.locations.map((option) => option.id)).toEqual([
      "inventory_room",
      "electrical_corridor",
      "admin_office",
      "loading_area",
      "parking",
      "main_aisle",
    ]);
    expect(warehouseCaseV1.storyOptions.carPurposes.map((option) => option.id)).toEqual([
      "transport_people",
      "carry_equipment",
      "collect_shipment",
      "temporary_parking",
    ]);
  });

  it.each(counts)(
    "assigns one structured question to every seat in every chapter for %i players",
    (count) => {
      for (const chapter of chapters) {
        const questions = warehouseCaseV1.questionMatrix[count][chapter];
        expect(questions).toHaveLength(count);
        expect(questions.map((question) => question.seat)).toEqual(
          Array.from({ length: count }, (_, index) => `P${index + 1}`),
        );
        for (const question of questions) {
          expect(question.outputFactKey).not.toBe("");
          expect(question.comparisonTargets.length).toBeGreaterThan(0);
          expect(question.compatibilityRule).not.toBe("");
          expect(question.conflictRule).not.toBe("");
          expect(question.relevance.length).toBeGreaterThan(0);
          expect(question.options.length).toBeGreaterThan(1);
        }
      }
    },
  );

  it.each(counts)(
    "is accepted by the engine and creates a deterministic %i-seat assignment",
    (count) => {
      expect(validateWarehouseCaseDefinition(warehouseCaseV1)).toEqual({ valid: true, errors: [] });
      const players = Array.from({ length: count }, (_, index) => ({
        id: `p${index + 1}`,
        name: `لاعب ${index + 1}`,
        joinOrder: index,
        connected: true,
      }));
      const state = createWarehouseCase({
        definition: warehouseCaseV1,
        sessionId: `content-${count}`,
        players,
        sharedStory: {
          entryReason: "check_inventory_mismatch",
          entryRoute: "side_door",
          keyHolderInitial: "p1",
          location2346: Object.fromEntries(
            players.map((player) => [player.id, "main_aisle" as const]),
          ),
          carPurpose: "collect_shipment",
          carDepartureExpected: true,
        },
        now: 1_000,
      });

      expect(Object.values(state.questionAssignments)).toHaveLength(count * chapters.length);
      expect(
        Object.values(state.questionAssignments).every((assignment) =>
          assignment.options.every(
            (option) => !/^P\d$/.test(option.id) || Number(option.id.slice(1)) <= count,
          ),
        ),
      ).toBe(true);
    },
  );

  it("authors exactly three chapter evidence items and all four issue types", () => {
    expect(
      chapters.map((chapter) => [
        warehouseCaseV1.chapters[chapter].evidence.chapter,
        warehouseCaseV1.chapters[chapter].evidence.timestamp,
      ]),
    ).toEqual([
      ["power", "23:47"],
      ["device", "23:48"],
      ["car", "00:01"],
    ]);
    expect([...new Set(warehouseCaseV1.issues.map((issue) => issue.type))].sort()).toEqual(
      ["DIRECT_CONTRADICTION", "EVIDENCE_CONFLICT", "STORY_GAP", "UNEXPLAINED_EVIDENCE"].sort(),
    );
  });

  it("provides at least two valid patches per chapter and deterministic later effects", () => {
    for (const chapter of chapters) {
      const patches = warehouseCaseV1.patchOptions.filter((patch) => patch.chapter === chapter);
      expect(patches.length).toBeGreaterThanOrEqual(2);
      for (const patch of patches) {
        expect(patch.resolvesIssueIds.length).toBeGreaterThan(0);
        expect(patch.factsAfter.length).toBeGreaterThan(0);
        if (chapter !== "car") expect(patch.commitments.length).toBeGreaterThan(0);
        if (chapter !== "car") expect(patch.laterEffects.length).toBeGreaterThan(0);
        for (const effect of patch.laterEffects) {
          expect(effect.selectorKey).not.toBe("");
          expect(effect.chapter).not.toBe(chapter);
        }
      }
    }
  });

  it("keeps two valid ballot options in every chapter state and gates the car-linked device patch", () => {
    const story = {
      entryReason: "check_inventory_mismatch" as const,
      entryRoute: "side_door" as const,
      keyHolderInitial: "p1",
      location2346: {
        p1: "main_aisle" as const,
        p2: "main_aisle" as const,
        p3: "main_aisle" as const,
        p4: "main_aisle" as const,
      },
      carPurpose: "temporary_parking" as const,
      carDepartureExpected: false,
    };
    const state = createWarehouseCase({
      definition: warehouseCaseV1,
      sessionId: "availability",
      players: Array.from({ length: 4 }, (_, index) => ({
        id: `p${index + 1}`,
        name: `لاعب ${index + 1}`,
        joinOrder: index,
        connected: true,
      })),
      sharedStory: story,
      now: 1_000,
    });
    const powerPatches = warehouseCaseV1.patchOptions.filter((patch) => patch.chapter === "power");
    expect(powerPatches.filter((patch) => isWarehousePatchAvailable(state, patch))).toHaveLength(3);

    const devicePatches = warehouseCaseV1.patchOptions.filter(
      (patch) => patch.chapter === "device",
    );
    expect(devicePatches.filter((patch) => isWarehousePatchAvailable(state, patch))).toHaveLength(
      2,
    );
    const carRelevantState = {
      ...state,
      derivedFacts: { ...state.derivedFacts, car_is_relevant: true },
    };
    expect(
      devicePatches.filter((patch) => isWarehousePatchAvailable(carRelevantState, patch)),
    ).toHaveLength(3);
  });

  it("rejects empty comparisons, one-option ballots, and non-deterministic later effects", () => {
    const emptyComparison = structuredClone(warehouseCaseV1);
    emptyComparison.questionMatrix[4].power[0]!.comparisonTargets = [];
    expect(validateWarehouseCase(emptyComparison).errors).toContain(
      "Question warehouse.power.4.P1 has no comparison target.",
    );

    const onePatch = structuredClone(warehouseCaseV1);
    onePatch.chapters.power.patchOptionIds = ["P1_FETCH_TOOL"];
    expect(validateWarehouseCase(onePatch).errors).toContain(
      "Chapter power has fewer than two unconditional valid patches.",
    );

    const missingEffect = structuredClone(warehouseCaseV1);
    missingEffect.patchOptions[0]!.laterEffects = [];
    expect(validateWarehouseCase(missingEffect).errors).toContain(
      "Patch P1_FETCH_TOOL has no deterministic later effect.",
    );
  });

  it("reports every locked Warehouse contract boundary without throwing", () => {
    const invalid = structuredClone(warehouseCaseV1);
    invalid.id = "wrong-case";
    invalid.version = "0.0.0";
    invalid.supportedPlayerCounts = [4];
    invalid.durationMinutes = [1, 2];
    invalid.storyOptions.entryReasons[0]!.label.ar = "";

    const question = invalid.questionMatrix[4].power[0]!;
    question.chapter = "device";
    question.prompt.ar = "";
    question.options = [question.options[0]!];
    question.outputFactKey = "";
    question.comparisonTargets = [];
    question.compatibilityRule = "";
    question.conflictRule = "";
    question.relevance = "";
    invalid.questionMatrix[4].power[1]!.seat = question.seat;

    invalid.chapters.power.evidence.chapter = "device";
    invalid.chapters.power.evidence.timestamp = "00:00";
    invalid.chapters.power.evidence.factKey = "";
    invalid.chapters.power.issueIds = ["missing-issue"];
    invalid.chapters.power.patchOptionIds = ["missing-patch"];

    const issue = invalid.issues[0]!;
    issue.factRefs = [];
    issue.patchOptionIds = ["missing-patch"];
    issue.publicTitle.ar = "";
    issue.publicExplanation.ar = "";

    const patch = invalid.patchOptions[0]!;
    patch.resolvesIssueIds = ["missing-issue"];
    patch.factsAfter = [];
    patch.commitments = [];
    patch.laterEffects = [
      { chapter: patch.chapter, selectorKey: "" },
      { chapter: "result", selectorKey: "missing-selector" },
    ];
    invalid.scoreBands = [{ min: 3, max: 50, label: { ar: "ناقص" } }];

    const result = validateWarehouseCase(invalid);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(20);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Warehouse case must use stable id case.warehouse.v1.",
        "Warehouse case must use locked version 1.0.0.",
        "Question warehouse.power.4.P1 has no comparison target.",
        "Chapter power references unknown issue missing-issue.",
        "Patch P1_FETCH_TOOL has no factsAfter.",
      ]),
    );
  });

  it("contains no roles, missions, private evidence, suspicion, or individual scoring semantics", () => {
    const serialized = JSON.stringify(warehouseCaseV1);
    for (const forbidden of [
      "roles",
      "missions",
      "privateEvidence",
      "suspicion",
      "suspect",
      "individualScore",
      "ranking",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
