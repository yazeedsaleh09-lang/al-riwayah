import { describe, it, expect } from "vitest";
import {
  buildDetectionContext,
  selectNextContradiction,
  type DetectedContradiction,
} from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE } from "../src/index";
import { buildState, ans } from "./util";

function detect(state: Parameters<typeof buildDetectionContext>[0]): DetectedContradiction | null {
  const ctx = buildDetectionContext(state, CASE);
  return selectNextContradiction(ctx, CASE, state.releasedContradictionIds);
}

describe("contradiction detection (ENG-001..005)", () => {
  it("ENG-001: two different drivers -> direct impossibility", () => {
    const state = buildState(CASE, {
      answers: [ans("p1", "driver", "p3"), ans("p2", "driver", "p4")],
    });
    const c = detect(state);
    expect(c?.category).toBe("DIRECT_IMPOSSIBILITY");
    expect(c?.involvedPlayers.sort()).toEqual(["p1", "p2"]);
    expect(c?.explanation.ar).toContain("يسوق");
  });

  it("ENG-002: denied witness -> witness denial", () => {
    const state = buildState(CASE, {
      answers: [ans("p1", "with_player", "p2"), ans("p2", "was_alone", "alone")],
    });
    const c = detect(state);
    expect(c?.category).toBe("WITNESS_DENIAL");
    expect(c?.involvedPlayers.sort()).toEqual(["p1", "p2"]);
  });

  it("ENG-004: answer collides with Wi-Fi evidence -> evidence collision", () => {
    const state = buildState(CASE, {
      privateEvidenceByPlayer: { p1: ["pe.own_device_wifi"], p2: [], p3: [], p4: [] },
      answers: [ans("p1", "storage_visit", "no")],
    });
    const c = detect(state);
    expect(c?.category).toBe("EVIDENCE_COLLISION");
    expect(c?.involvedPlayers).toEqual(["p1"]);
  });

  it("evidence collision outranks a co-existing witness denial (priority order)", () => {
    const state = buildState(CASE, {
      privateEvidenceByPlayer: { p1: ["pe.own_device_wifi"], p2: [], p3: [], p4: [] },
      answers: [
        ans("p1", "storage_visit", "no"),
        ans("p3", "with_player", "p4"),
        ans("p4", "was_alone", "alone"),
      ],
    });
    const c = detect(state);
    expect(c?.category).toBe("EVIDENCE_COLLISION");
  });

  it("locked-fact break when interrogation location differs from plan", () => {
    const state = buildState(CASE, {
      sharedStory: { "location.p1": "meeting_room" },
      answers: [ans("p1", "loc2346", "storage")],
    });
    const c = detect(state);
    expect(c?.category).toBe("LOCKED_FACT_BREAK");
  });

  it("ENG-005: majority anomaly is a suspicion, not a hard reveal above real contradictions", () => {
    // Only a lone different reason among 4 answers -> majority anomaly present.
    const state = buildState(CASE, {
      answers: [
        ans("p1", "reason", "urgent_work"),
        ans("p2", "reason", "urgent_work"),
        ans("p3", "reason", "urgent_work"),
        ans("p4", "reason", "personal_item"),
      ],
    });
    const c = detect(state);
    expect(c?.category).toBe("MAJORITY_ANOMALY");
    expect(c?.severity).toBeLessThan(10);
  });

  it("no contradiction for a coherent story", () => {
    const state = buildState(CASE, {
      sharedStory: {
        "location.p1": "meeting_room",
        "location.p2": "meeting_room",
        "location.p3": "meeting_room",
        "location.p4": "meeting_room",
      },
      answers: [
        ans("p1", "driver", "p2"),
        ans("p2", "driver", "p2"),
        ans("p1", "loc2346", "meeting_room"),
      ],
    });
    expect(detect(state)).toBeNull();
  });

  it("does not re-reveal an already-released contradiction", () => {
    const state = buildState(CASE, {
      answers: [ans("p1", "driver", "p3"), ans("p2", "driver", "p4")],
    });
    const first = detect(state)!;
    const key = `${first.ruleId}::${[...first.involvedPlayers].sort().join(",")}`;
    state.releasedContradictionIds.push(key);
    const second = detect(state);
    expect(second).not.toEqual(first);
  });
});
