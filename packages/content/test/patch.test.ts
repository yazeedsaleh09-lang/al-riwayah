import { describe, it, expect } from "vitest";
import {
  advancePhase,
  applyIntent,
  buildDetectionContext,
  selectNextContradiction,
} from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE } from "../src/index";
import { buildState, ans } from "./util";

const NOW = 1_000_000;

describe("patch application (ENG-006, ENG-007)", () => {
  it("ENG-006: applying a patch resolves the contradiction and creates a commitment", () => {
    // Arrange a state at the phase just before the first reveal, with a
    // driver contradiction present in the accumulated answers.
    const state = buildState(CASE, {
      phase: "INTERROGATION_NO_GOOD_ANSWER",
      answers: [ans("p1", "driver", "p3"), ans("p2", "driver", "p4")],
      answeredThisPhase: ["p1", "p2", "p3", "p4"],
    });

    // Enter CONTRADICTION_REVEAL_1 → a contradiction is released + scored.
    advancePhase(state, CASE, NOW, { forced: true });
    expect(state.phase).toBe("CONTRADICTION_REVEAL_1");
    expect(state.releasedContradictionIds).toHaveLength(1);
    const consistencyPenalty = state.scoreLedger.filter((e) => e.axis === "consistency");
    expect(consistencyPenalty.length).toBeGreaterThan(0);

    // Enter PATCH_1 and vote.
    advancePhase(state, CASE, NOW, { forced: true });
    expect(state.phase).toBe("PATCH_1");
    const patch = CASE.patches.find((p) => p.resolvesCategories.includes("DIRECT_IMPOSSIBILITY"))!;
    for (const pid of ["p1", "p2", "p3", "p4"]) {
      const r = applyIntent(state, CASE, { type: "PATCH_VOTE", playerId: pid, patchId: patch.id }, NOW);
      expect(r.ok).toBe(true);
    }

    // Exit PATCH_1 → patch resolves, commitment + selected patch recorded.
    const commitmentsBefore = state.commitments.length;
    advancePhase(state, CASE, NOW, { forced: true });
    expect(state.selectedPatches).toHaveLength(1);
    expect(state.commitments.length).toBeGreaterThan(commitmentsBefore);
    // A patch always costs stability.
    expect(state.scoreLedger.some((e) => e.reasonCode === "stability.patch_applied")).toBe(true);
  });

  it("ENG-007: a follow-up answer that breaks a commitment creates a new contradiction", () => {
    const state = buildState(CASE, {
      commitments: [
        {
          id: "c1",
          factKey: "storage.return_time",
          value: "before_2348",
          fromPatchId: "patch.storage_charger_admission.v1",
          playerId: "p1",
          label: { ar: "رجع قبل ١١:٤٨" },
        },
      ],
      answers: [ans("p1", "returned_before_wifi_event", "no")],
    });
    const ctx = buildDetectionContext(state, CASE);
    const c = selectNextContradiction(ctx, CASE, []);
    expect(c?.ruleId).toBe("contradiction.followup.commitment_break.v1");
    expect(c?.involvedPlayers).toEqual(["p1"]);
  });

  it("a patch is only offered for the released contradiction's category", () => {
    const state = buildState(CASE, {
      phase: "INTERROGATION_NO_GOOD_ANSWER",
      privateEvidenceByPlayer: { p1: ["pe.own_device_wifi"], p2: [], p3: [], p4: [] },
      answers: [ans("p1", "storage_visit", "no")],
      answeredThisPhase: ["p1", "p2", "p3", "p4"],
    });
    advancePhase(state, CASE, NOW, { forced: true }); // reveal (evidence collision)
    advancePhase(state, CASE, NOW, { forced: true }); // patch_1
    const patchable = CASE.patches.filter((p) => p.resolvesCategories.includes("EVIDENCE_COLLISION"));
    // Voting a non-applicable patch is rejected.
    const bad = CASE.patches.find((p) => !p.resolvesCategories.includes("EVIDENCE_COLLISION"))!;
    const r = applyIntent(state, CASE, { type: "PATCH_VOTE", playerId: "p1", patchId: bad.id }, NOW);
    expect(r.ok).toBe(false);
    const good = applyIntent(state, CASE, { type: "PATCH_VOTE", playerId: "p1", patchId: patchable[0]!.id }, NOW);
    expect(good.ok).toBe(true);
  });
});
