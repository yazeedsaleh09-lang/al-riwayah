import { describe, expect, it } from "vitest";
import type { WarehousePrivateView, WarehousePublicView } from "@al-riwayah/game-engine";
import { RoomManager } from "@al-riwayah/server";
import {
  createRoomWithPlayers,
  makeClock,
  playToResults,
  readyAndStart,
} from "./driver";

describe("full Warehouse match through the server authority", () => {
  it.each([4, 5, 6])("%i players reach an evidence-based group result", (playerCount) => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, disableRateLimits: true });
    const { code, players } = createRoomWithPlayers(manager, playerCount);
    readyAndStart(manager, code, players);

    playToResults(manager, code, players, clock);

    const view = manager.publicView(code)! as WarehousePublicView;
    expect(view.phase).toBe("RESULT_REVEAL");
    expect(view.result?.status).toBe("complete");
    const match = manager.getRoom(code)!.match!;
    expect("resolvedChapters" in match ? match.resolvedChapters : []).toEqual([
      "power",
      "device",
      "car",
    ]);
  });

  it("an absent player is never auto-answered or advanced by advisory expiry", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, disableRateLimits: true });
    const { code, players } = createRoomWithPlayers(manager, 5);
    readyAndStart(manager, code, players);

    expect(
      manager.gameIntent({
        code,
        playerId: players[0]!.id,
        requestId: "story-submit",
        phaseRevision: 0,
        intent: { type: "WAREHOUSE_STORY_SUBMIT", playerId: players[0]!.id },
      }).ok,
    ).toBe(true);
    for (const player of players) {
      manager.gameIntent({
        code,
        playerId: player.id,
        requestId: `review:${player.id}`,
        phaseRevision: manager.publicView(code)!.phaseRevision,
        intent: { type: "WAREHOUSE_STORY_REVIEW", playerId: player.id },
      });
    }
    for (const player of players) {
      manager.gameIntent({
        code,
        playerId: player.id,
        requestId: `start-question:${player.id}`,
        phaseRevision: manager.publicView(code)!.phaseRevision,
        intent: { type: "WAREHOUSE_START_QUESTION", playerId: player.id },
      });
    }
    manager.gameIntent({
      code,
      playerId: players[0]!.id,
      requestId: "advance-context",
      phaseRevision: manager.publicView(code)!.phaseRevision,
      intent: { type: "WAREHOUSE_ADVANCE", playerId: players[0]!.id },
    });

    const absent = players.at(-1)!;
    for (const player of players.slice(0, -1)) {
      const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
      manager.gameIntent({
        code,
        playerId: player.id,
        requestId: `answer:${player.id}`,
        phaseRevision: manager.publicView(code)!.phaseRevision,
        intent: {
          type: "WAREHOUSE_ANSWER",
          playerId: player.id,
          questionInstanceId: privateView.question!.instanceId,
          optionId: privateView.question!.options[0]!.id,
        },
      });
    }
    const before = manager.publicView(code)! as WarehousePublicView;
    clock.t = (before.advisoryDeadlineAt ?? clock.t) + 1;
    manager.tick();

    expect(manager.publicView(code)).toMatchObject({
      phase: "WAITING_FOR_ANSWERS",
      phaseRevision: before.phaseRevision,
      advisoryExpired: true,
      progress: { required: 5, answersLocked: 4 },
    });
    expect(manager.privateView(code, absent.id)).toMatchObject({
      lockedAnswer: null,
      rankedBallot: null,
    });
  });

  it("five consecutive replays retain the room and clear all private state", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, disableRateLimits: true });
    const { code, players } = createRoomWithPlayers(manager, 4);
    readyAndStart(manager, code, players);

    for (let replayIndex = 0; replayIndex < 5; replayIndex++) {
      playToResults(manager, code, players, clock);
      expect(manager.replay({ code, playerId: players[0]!.id }).ok).toBe(true);
      expect(manager.roomCount()).toBe(1);
      expect(manager.getRoom(code)!.match).toMatchObject({
        phase: "STORY_BUILDING",
        lockedAnswers: [],
        rankedBallots: [],
        adoptedPatches: [],
        scoreResult: null,
      });
      expect(manager.getRoom(code)!.match!.eventLedger).not.toEqual([]);
      expect(
        manager.getRoom(code)!.match!.eventLedger.some((item) => item.type === "ANSWER_LOCKED"),
      ).toBe(false);
    }
  });
});
