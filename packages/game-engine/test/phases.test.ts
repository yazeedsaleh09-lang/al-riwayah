import { describe, it, expect } from "vitest";
import {
  PHASE_SEQUENCE,
  DEFAULT_PHASE_DURATIONS_S,
  nextPhase,
  phaseIndex,
  isPhaseId,
} from "../src/phases";

describe("phase model", () => {
  it("has the canonical 19 phases in order", () => {
    expect(PHASE_SEQUENCE).toHaveLength(19);
    expect(PHASE_SEQUENCE[0]).toBe("LOBBY");
    expect(PHASE_SEQUENCE.at(-1)).toBe("RESULTS");
  });

  it("nextPhase advances and terminates at RESULTS", () => {
    expect(nextPhase("LOBBY")).toBe("CASE_BRIEF");
    expect(nextPhase("PATCH_2")).toBe("FINAL_QUESTION");
    expect(nextPhase("RESULTS")).toBeNull();
  });

  it("phaseIndex is monotonic", () => {
    expect(phaseIndex("CASE_BRIEF")).toBeLessThan(phaseIndex("VERDICT"));
  });

  it("every phase has a duration entry", () => {
    for (const p of PHASE_SEQUENCE) {
      expect(p in DEFAULT_PHASE_DURATIONS_S).toBe(true);
    }
    expect(DEFAULT_PHASE_DURATIONS_S.LOBBY).toBeNull();
    expect(DEFAULT_PHASE_DURATIONS_S.FINAL_QUESTION).toBe(8);
  });

  it("isPhaseId guards unknown strings", () => {
    expect(isPhaseId("VERDICT")).toBe(true);
    expect(isPhaseId("NOPE")).toBe(false);
  });
});
