import { describe, it, expect } from "vitest";
import { PHASE_SEQUENCE } from "@al-riwayah/game-engine";
import { RoomManager } from "@al-riwayah/server";
import { createRoomWithPlayers, makeClock, playToResults, readyAndStart } from "./driver";

describe("full match through the server authority (GAME-*)", () => {
  for (const n of [4, 5, 6]) {
    it(`${n}-player match runs every phase to a released verdict`, () => {
      const { clock, now } = makeClock();
      const mgr = new RoomManager({ now });
      const { code, players } = createRoomWithPlayers(mgr, n);
      readyAndStart(mgr, code, players);
      playToResults(mgr, code, players, clock);

      const pub = mgr.publicView(code)!;
      expect(pub.phase).toBe("RESULTS");
      expect(pub.result).not.toBeNull();
      expect(["A", "B", "C", "D", "F"]).toContain(pub.result!.band);
    });
  }

  it("5-player match with an absent player still completes via NO_RESPONSE", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 5);
    readyAndStart(mgr, code, players);
    playToResults(mgr, code, players, clock, [players[4]!.id]);
    expect(mgr.publicView(code)!.phase).toBe("RESULTS");
  });

  it("phase never skips: revision increments by one per transition", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);

    const phases: string[] = [];
    const revisions: number[] = [];
    let guard = 0;
    while (guard < 80) {
      const pub = mgr.publicView(code)!;
      phases.push(pub.phase);
      revisions.push(pub.phaseRevision);
      if (pub.phase === "RESULTS") break;
      // advance one phase by forcing the deadline
      clock.t = (pub.deadlineAt ?? clock.t) + 1;
      mgr.tick();
      guard++;
    }
    expect(phases).toEqual(PHASE_SEQUENCE.slice(1));
    for (let i = 1; i < revisions.length; i++) {
      expect(revisions[i]! - revisions[i - 1]!).toBe(1);
    }
    expect(mgr.publicView(code)!.phase).toBe("RESULTS");
  });

  it("RECON-002: reconnect mid-interrogation preserves the locked answer", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);

    // Advance to the first interrogation phase.
    let guard = 0;
    while (mgr.publicView(code)!.phase !== "INTERROGATION_FOUNDATION" && guard < 30) {
      const pub = mgr.publicView(code)!;
      clock.t = (pub.deadlineAt ?? clock.t) + 1;
      mgr.tick();
      guard++;
    }
    const rev = mgr.publicView(code)!.phaseRevision;
    const p = players[2]!;
    const priv = mgr.privateView(code, p.id)!;
    expect(priv.currentQuestion).not.toBeNull();
    const optionId = priv.currentQuestion!.options[0]!.id;
    const ack = mgr.gameIntent({ code, playerId: p.id, requestId: "ans1", phaseRevision: rev, intent: { type: "ANSWER", playerId: p.id, questionInstanceId: priv.currentQuestion!.instanceId, optionId } });
    expect(ack.ok).toBe(true);

    // Disconnect + reconnect the same player.
    mgr.bindSocket(code, p.id, "s1");
    mgr.handleDisconnect("s1");
    const restored = mgr.restore({ recoveryToken: p.token });
    expect(restored.ok).toBe(true);

    const after = mgr.privateView(code, p.id)!;
    expect(after.answerLocked).toBe(true);
    expect(after.submittedOptionId).toBe(optionId);
  });

  it("replay resets private state and starts a fresh match", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    playToResults(mgr, code, players, clock);
    expect(mgr.publicView(code)!.phase).toBe("RESULTS");

    const replay = mgr.replay({ code, playerId: players[0]!.id });
    expect(replay.ok).toBe(true);
    const pub = mgr.publicView(code)!;
    expect(pub.phase).toBe("CASE_BRIEF");
    expect(pub.result).toBeNull();
    // No answers leak from the previous match into any private view.
    for (const p of players) {
      expect(mgr.privateView(code, p.id)!.answerLocked).toBe(false);
    }
  });

  it("five consecutive replays keep one room and clear prior private state", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);

    for (let replayIndex = 0; replayIndex < 5; replayIndex++) {
      playToResults(mgr, code, players, clock);
      expect(mgr.publicView(code)!.phase).toBe("RESULTS");
      expect(mgr.replay({ code, playerId: players[0]!.id }).ok).toBe(true);
      expect(mgr.roomCount()).toBe(1);
      expect(mgr.publicView(code)).toMatchObject({ phase: "CASE_BRIEF", result: null });
      for (const player of players) {
        expect(mgr.privateView(code, player.id)).toMatchObject({
          currentQuestion: null,
          answerLocked: false,
          submittedOptionId: null,
          ownResultNote: null,
        });
      }
    }
  });
});
