import { describe, it, expect } from "vitest";
import {
  simulateMatch,
  makePlayers,
  optByNormalized,
  type MatchScript,
} from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE } from "../src/index";

// Coherent story: everyone agrees, no evasion.
const coherent: MatchScript = {
  reason: "repair_equipment",
  locations: { p1: "meeting_room", p2: "meeting_room", p3: "meeting_room", p4: "meeting_room", p5: "meeting_room", p6: "meeting_room" },
  roles: { driver: "p2", security_caller: "p3", key_holder: "p4", first_to_leave: "p1" },
  answer: (_pid, q) => {
    // Prefer a stable, non-evasive answer. For driver, everyone names p2.
    if (q.tag === "driver") return optByNormalized(q.options, "p2");
    const nonEvasive = q.options.find((o) => o.normalized !== "unknown");
    return (nonEvasive ?? q.options[0]!).id;
  },
};

// Evasive story: pick the "I don't remember" option whenever available.
const evasive: MatchScript = {
  answer: (_pid, q) => {
    const dodge = q.options.find((o) => o.normalized === "unknown");
    return (dodge ?? q.options[0]!).id;
  },
};

describe("full sessions (GAME-*, ENG-008)", () => {
  for (const n of [4, 5, 6]) {
    it(`${n}-player match reaches a verdict`, () => {
      const state = simulateMatch(CASE, makePlayers(n), `seed-${n}`, coherent);
      expect(state.phase).toBe("RESULTS");
      expect(state.verdict).not.toBeNull();
      expect(["A", "B", "C", "D", "F"]).toContain(state.verdict!.band);
      // Ledger totals are consistent with the reported scores.
      expect(state.verdict!.composite).toBeGreaterThanOrEqual(0);
      expect(state.verdict!.composite).toBeLessThanOrEqual(100);
    });
  }

  it("ENG-008: identical seed + script produces identical final state", () => {
    const a = simulateMatch(CASE, makePlayers(5), "fixed-seed", coherent);
    const b = simulateMatch(CASE, makePlayers(5), "fixed-seed", coherent);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("different seeds produce different question sequences", () => {
    const a = simulateMatch(CASE, makePlayers(4), "seed-A", coherent);
    const b = simulateMatch(CASE, makePlayers(4), "seed-B", coherent);
    const qa = a.answers.map((x) => x.questionId).join(",");
    const qb = b.answers.map((x) => x.questionId).join(",");
    expect(qa).not.toEqual(qb);
  });

  it("evasive play scores more evasion than coherent play", () => {
    const coherentState = simulateMatch(CASE, makePlayers(5), "s", coherent);
    const evasiveState = simulateMatch(CASE, makePlayers(5), "s", evasive);
    expect(evasiveState.verdict!.scores.evasion).toBeGreaterThan(
      coherentState.verdict!.scores.evasion,
    );
  });

  it("a timed-out (absent) player gets a NO_RESPONSE fallback and the match still completes", () => {
    const state = simulateMatch(CASE, makePlayers(5), "absent-seed", {
      ...coherent,
      absent: ["p5"],
    });
    expect(state.phase).toBe("RESULTS");
    // p5 must have fallback answers recorded for interrogation phases.
    expect(state.answers.some((a) => a.playerId === "p5" && a.fallback)).toBe(true);
  });

  it("the shared story locks all planning facts", () => {
    const state = simulateMatch(CASE, makePlayers(4), "story-seed", coherent);
    expect(state.sharedStory["reason"]).toBe("repair_equipment");
    expect(state.sharedStory["role.driver"]).toBe("p2");
    expect(state.sharedStory["location.p1"]).toBe("meeting_room");
  });
});
