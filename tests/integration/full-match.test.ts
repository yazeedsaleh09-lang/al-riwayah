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

  it("phase order remains canonical when empty phases are intentionally skipped", () => {
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
    const canonicalIndexes = phases.map((phase) => PHASE_SEQUENCE.indexOf(phase as never));
    expect(canonicalIndexes).toEqual([...canonicalIndexes].sort((a, b) => a - b));
    for (let i = 1; i < revisions.length; i++) {
      expect(revisions[i]! - revisions[i - 1]!).toBeGreaterThanOrEqual(1);
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

  it("reconnect during a live patch restores only that player's state and vote status", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now, seedFactory: () => "patch-reconnect-five" });
    const { code, players } = createRoomWithPlayers(mgr, 5);
    readyAndStart(mgr, code, players);

    let guard = 0;
    while (mgr.publicView(code)!.phase !== "PATCH_1" && guard < 30) {
      const pub = mgr.publicView(code)!;
      clock.t = (pub.deadlineAt ?? clock.t) + 1;
      mgr.tick();
      guard++;
    }

    const patchView = mgr.publicView(code)!;
    expect(patchView.phase).toBe("PATCH_1");
    expect(patchView.patchOptions?.length).toBeGreaterThan(0);
    const player = players[2]!;
    const otherPlayer = players[3]!;
    const before = mgr.privateView(code, player.id)!;
    const otherPrivateEvidence = mgr.privateView(code, otherPlayer.id)!.privateEvidence;
    expect(before.allowedActions).toContain("PATCH_VOTE");

    mgr.bindSocket(code, player.id, "patch-socket-1");
    mgr.handleDisconnect("patch-socket-1");
    const restored = mgr.restore({ recoveryToken: player.token });
    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error("restore failed");

    const afterRestore = mgr.privateView(code, player.id)!;
    expect(afterRestore).toMatchObject({
      playerId: player.id,
      phase: "PATCH_1",
      privateEvidence: before.privateEvidence,
    });
    expect(afterRestore.allowedActions).toContain("PATCH_VOTE");
    expect(JSON.stringify(mgr.publicView(code))).not.toContain(before.privateEvidence?.id ?? "");
    if (otherPrivateEvidence?.id !== before.privateEvidence?.id) {
      expect(JSON.stringify(afterRestore)).not.toContain(otherPrivateEvidence!.id);
    }

    const vote = mgr.gameIntent({
      code,
      playerId: player.id,
      requestId: "patch-vote-before-second-reconnect",
      phaseRevision: patchView.phaseRevision,
      intent: {
        type: "PATCH_VOTE",
        playerId: player.id,
        patchId: patchView.patchOptions![0]!.id,
      },
    });
    expect(vote.ok).toBe(true);
    expect(mgr.getRoom(code)!.match!.patchVotes.PATCH_1![player.id]).toBe(
      patchView.patchOptions![0]!.id,
    );

    mgr.bindSocket(code, player.id, "patch-socket-2");
    mgr.handleDisconnect("patch-socket-2");
    const restoredAgain = mgr.restore({ recoveryToken: restored.data.rotatedToken });
    expect(restoredAgain.ok).toBe(true);
    expect(mgr.privateView(code, player.id)!.allowedActions).toEqual(["WAIT"]);
    expect(mgr.getRoom(code)!.match!.releasedContradictionByPhase.CONTRADICTION_REVEAL_1).toBe(
      mgr.getRoom(code)!.match!.releasedContradictionIds[0],
    );
  });

  it("public views never expose private evidence or another player's question", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 5);
    readyAndStart(mgr, code, players);

    let guard = 0;
    while (mgr.publicView(code)!.phase !== "INTERROGATION_FOUNDATION" && guard < 20) {
      const pub = mgr.publicView(code)!;
      clock.t = (pub.deadlineAt ?? clock.t) + 1;
      mgr.tick();
      guard++;
    }

    const privateViews = players.map((player) => mgr.privateView(code, player.id)!);
    const publicPayload = JSON.stringify(mgr.publicView(code));
    for (const privateView of privateViews) {
      expect(privateView.currentQuestion).not.toBeNull();
      expect(publicPayload).not.toContain(privateView.privateEvidence!.id);
      expect(publicPayload).not.toContain(privateView.currentQuestion!.instanceId);
      for (const other of privateViews.filter(({ playerId }) => playerId !== privateView.playerId)) {
        expect(JSON.stringify(privateView)).not.toContain(other.currentQuestion!.instanceId);
      }
    }
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
