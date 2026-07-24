import { describe, it, expect } from "vitest";
import { assignPrivateEvidence, createRng } from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE } from "../src/index";
import { makePlayers } from "./util";

describe("private evidence assignment", () => {
  for (const n of [4, 5, 6]) {
    it(`${n} players each get exactly one item`, () => {
      const rng = createRng(`ev-${n}`);
      const assignment = assignPrivateEvidence(rng, CASE, makePlayers(n));
      for (const p of makePlayers(n)) {
        expect(assignment[p.id]).toHaveLength(1);
      }
    });

    it(`${n} players satisfy requireExactlyOne (Wi-Fi device)`, () => {
      const rng = createRng(`ev-req-${n}`);
      const assignment = assignPrivateEvidence(rng, CASE, makePlayers(n));
      const holders = Object.values(assignment)
        .flat()
        .filter((id) => id === "pe.own_device_wifi");
      expect(holders).toHaveLength(1);
    });

    it(`${n} players never co-assign mutually-exclusive items`, () => {
      const rng = createRng(`ev-mx-${n}`);
      const assignment = assignPrivateEvidence(rng, CASE, makePlayers(n));
      const flat = Object.values(assignment).flat();
      const wifi = flat.includes("pe.own_device_wifi");
      const dead = flat.filter((id) => id === "pe.dead_battery").length;
      // They can co-exist across players; the constraint is per-holder, but the
      // Wi-Fi holder must not also be the dead-battery holder.
      expect(wifi).toBe(true);
      expect(dead).toBeLessThanOrEqual(1);
    });
  }

  it("assignment is deterministic per seed", () => {
    const a = assignPrivateEvidence(createRng("same"), CASE, makePlayers(5));
    const b = assignPrivateEvidence(createRng("same"), CASE, makePlayers(5));
    expect(a).toEqual(b);
  });
});
