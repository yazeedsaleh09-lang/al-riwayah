import { describe, expect, it } from "vitest";
import { RoomManager } from "@al-riwayah/server";
import type { WarehouseManagerIntent } from "@al-riwayah/server";
import type {
  WarehousePrivateView,
  WarehousePublicView,
} from "@al-riwayah/game-engine";
import { makeClock, readyAndStart } from "./driver";
import type { createRoomWithPlayers } from "./driver";

const WAREHOUSE_CASE_ID = "case.warehouse.v1";

function createWarehouseRoom(
  manager: RoomManager,
  playerCount: 4 | 5 | 6,
): ReturnType<typeof createRoomWithPlayers> {
  const host = manager.createRoom({
    hostName: "لاعب 1",
    caseId: WAREHOUSE_CASE_ID,
    ip: "10.50.0.1",
  });
  if (!host.ok) throw new Error(`create failed: ${host.error.code}`);

  const players = [
    {
      id: host.data.playerId,
      token: host.data.recoveryToken,
      isHost: true,
    },
  ];
  for (let index = 2; index <= playerCount; index++) {
    const joined = manager.joinRoom({
      code: host.data.roomCode,
      name: `لاعب ${index}`,
      ip: `10.50.0.${index}`,
    });
    if (!joined.ok) throw new Error(`join failed: ${joined.error.code}`);
    players.push({
      id: joined.data.playerId,
      token: joined.data.recoveryToken,
      isHost: false,
    });
  }
  return { code: host.data.roomCode, players };
}

function playWarehouseToResults(
  manager: RoomManager,
  code: string,
  players: ReturnType<typeof createWarehouseRoom>["players"],
): void {
  let requestSequence = 0;
  const send = (playerId: string, intent: WarehouseManagerIntent) => {
    const revision = manager.publicView(code)!.phaseRevision;
    const result = manager.gameIntent({
      code,
      playerId,
      requestId: `warehouse-flow:${requestSequence++}`,
      phaseRevision: revision,
      intent,
    });
    if (!result.ok) throw new Error(`${intent.type} failed: ${result.error.code}`);
  };
  const host = players[0]!;
  send(host.id, { type: "WAREHOUSE_STORY_SUBMIT", playerId: host.id });
  for (const player of players) {
    send(player.id, { type: "WAREHOUSE_STORY_REVIEW", playerId: player.id });
  }

  let guard = 0;
  while (manager.publicView(code)!.phase !== "RESULT_REVEAL" && guard < 80) {
    const publicView = manager.publicView(code)! as WarehousePublicView;
    if (publicView.phase === "SILENT_PHASE_INTRO") {
      for (const player of players) {
        const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
        if (privateView.allowedActions.includes("START_QUESTION")) {
          send(player.id, { type: "WAREHOUSE_START_QUESTION", playerId: player.id });
        }
      }
    } else if (publicView.phase === "CHAPTER_CONTEXT") {
      send(host.id, { type: "WAREHOUSE_ADVANCE", playerId: host.id });
    } else if (
      publicView.phase === "SILENT_ANSWERING" ||
      publicView.phase === "WAITING_FOR_ANSWERS"
    ) {
      for (const player of players) {
        const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
        if (!privateView.lockedAnswer) {
          send(player.id, {
            type: "WAREHOUSE_ANSWER",
            playerId: player.id,
            questionInstanceId: privateView.question!.instanceId,
            optionId: privateView.question!.options[0]!.id,
          });
        }
      }
    } else if (
      publicView.phase === "ISSUE_REVEAL" ||
      publicView.phase === "PATCH_RESOLUTION" ||
      publicView.phase === "RESULT_CALCULATION"
    ) {
      send(host.id, { type: "WAREHOUSE_ADVANCE", playerId: host.id });
    } else if (publicView.phase === "STORY_UPDATE") {
      for (const player of players) {
        const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
        if (privateView.allowedActions.includes("CONFIRM_STORY")) {
          send(player.id, { type: "WAREHOUSE_STORY_REVIEW", playerId: player.id });
        }
      }
    } else if (publicView.phase === "OPEN_DISCUSSION") {
      for (const player of players) {
        const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
        if (privateView.allowedActions.includes("READY_FOR_VOTE")) {
          send(player.id, {
            type: "WAREHOUSE_DISCUSSION_READY",
            playerId: player.id,
          });
        }
      }
    } else if (publicView.phase === "PATCH_BALLOT") {
      const rankedOptionIds = publicView.patchOptions.map((option) => option.id);
      for (const player of players) {
        const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
        if (!privateView.rankedBallot) {
          send(player.id, {
            type: "WAREHOUSE_BALLOT",
            playerId: player.id,
            rankedOptionIds,
          });
        }
      }
    } else {
      throw new Error(`Unhandled Warehouse phase ${publicView.phase}`);
    }
    guard++;
  }
  if (guard >= 80) throw new Error("Warehouse flow exceeded phase guard");
}

describe("Warehouse authoritative room integration", () => {
  it.each([4, 5, 6] as const)(
    "starts the canonical Warehouse story phase for %i players",
    (playerCount) => {
      const { now } = makeClock();
      const manager = new RoomManager({ now, seedFactory: () => `warehouse-${playerCount}` });
      const { code, players } = createWarehouseRoom(manager, playerCount);

      readyAndStart(manager, code, players);

      expect(manager.publicView(code)).toMatchObject({
        caseId: WAREHOUSE_CASE_ID,
        phase: "STORY_BUILDING",
        phaseRevision: 0,
      });
    },
  );

  it("treats the Warehouse deadline as advisory without rejecting input or advancing", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, seedFactory: () => "warehouse-advisory" });
    const { code, players } = createWarehouseRoom(manager, 4);
    readyAndStart(manager, code, players);
    const before = manager.publicView(code)!;

    clock.t = (before.deadlineAt ?? clock.t) + 1;
    manager.tick();

    expect(manager.publicView(code)).toMatchObject({
      phase: "STORY_BUILDING",
      phaseRevision: before.phaseRevision,
    });
    expect(manager.getRoom(code)!.match).toMatchObject({
      advisoryExpired: true,
      lockedAnswers: [],
      rankedBallots: [],
    });
  });

  it("allows only the current host to advance shared Warehouse reveal phases", () => {
    const { now } = makeClock();
    const manager = new RoomManager({ now, seedFactory: () => "warehouse-host-advance" });
    const { code, players } = createWarehouseRoom(manager, 4);
    readyAndStart(manager, code, players);
    const send = (playerId: string, intent: WarehouseManagerIntent) =>
      manager.gameIntent({
        code,
        playerId,
        requestId: `${intent.type}:${playerId}:${manager.publicView(code)!.phaseRevision}`,
        phaseRevision: manager.publicView(code)!.phaseRevision,
        intent,
      });
    const host = players[0]!;
    const guest = players[1]!;

    expect(send(host.id, { type: "WAREHOUSE_STORY_SUBMIT", playerId: host.id }).ok).toBe(true);
    for (const player of players) {
      expect(
        send(player.id, { type: "WAREHOUSE_STORY_REVIEW", playerId: player.id }).ok,
      ).toBe(true);
    }
    for (const player of players) {
      expect(
        send(player.id, { type: "WAREHOUSE_START_QUESTION", playerId: player.id }).ok,
      ).toBe(true);
    }
    expect(manager.publicView(code)?.phase).toBe("CHAPTER_CONTEXT");

    expect(
      send(guest.id, { type: "WAREHOUSE_ADVANCE", playerId: guest.id }),
    ).toMatchObject({ ok: false, error: { code: "ACTION_NOT_ALLOWED" } });
    expect(manager.publicView(code)?.phase).toBe("CHAPTER_CONTEXT");
    expect(send(host.id, { type: "WAREHOUSE_ADVANCE", playerId: host.id }).ok).toBe(true);
    expect(manager.publicView(code)?.phase).toBe("SILENT_ANSWERING");
  });

  it("restores only the disconnected player's own question and ranked ballot", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, seedFactory: () => "warehouse-reconnect-ballot" });
    const { code, players } = createWarehouseRoom(manager, 5);
    readyAndStart(manager, code, players);

    const send = (playerId: string, intent: WarehouseManagerIntent) => {
      const revision = manager.publicView(code)!.phaseRevision;
      return manager.gameIntent({
        code,
        playerId,
        requestId: `${intent.type}:${playerId}:${revision}`,
        phaseRevision: revision,
        intent,
      });
    };
    const host = players[0]!;
    expect(
      send(host.id, { type: "WAREHOUSE_STORY_SUBMIT", playerId: host.id }).ok,
    ).toBe(true);
    for (const player of players) {
      expect(
        send(player.id, { type: "WAREHOUSE_STORY_REVIEW", playerId: player.id }).ok,
      ).toBe(true);
    }
    for (const player of players) {
      expect(
        send(player.id, { type: "WAREHOUSE_START_QUESTION", playerId: player.id }).ok,
      ).toBe(true);
    }
    expect(
      send(host.id, { type: "WAREHOUSE_ADVANCE", playerId: host.id }).ok,
    ).toBe(true);

    const questions = new Map<string, string>();
    for (const player of players) {
      const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
      questions.set(player.id, privateView.question!.instanceId);
      expect(
        send(player.id, {
          type: "WAREHOUSE_ANSWER",
          playerId: player.id,
          questionInstanceId: privateView.question!.instanceId,
          optionId: privateView.question!.options[0]!.id,
        }).ok,
      ).toBe(true);
    }
    expect(
      send(host.id, { type: "WAREHOUSE_ADVANCE", playerId: host.id }).ok,
    ).toBe(true);
    for (const player of players) {
      expect(
        send(player.id, {
          type: "WAREHOUSE_DISCUSSION_READY",
          playerId: player.id,
        }).ok,
      ).toBe(true);
    }

    const publicBallot = manager.publicView(code)! as WarehousePublicView;
    expect(publicBallot.phase).toBe("PATCH_BALLOT");
    const reconnecting = players[2]!;
    const rankedOptionIds = publicBallot.patchOptions.map((option) => option.id);
    expect(
      send(reconnecting.id, {
        type: "WAREHOUSE_BALLOT",
        playerId: reconnecting.id,
        rankedOptionIds,
      }).ok,
    ).toBe(true);
    const socketId = "socket:warehouse-ballot";
    manager.bindSocket(code, reconnecting.id, socketId);
    clock.t += 10_000;
    manager.handleDisconnect(socketId);

    const restored = manager.restore({ recoveryToken: reconnecting.token });
    expect(restored.ok).toBe(true);
    const ownView = manager.privateView(code, reconnecting.id)! as WarehousePrivateView;
    expect(ownView.question).toBeNull();
    expect(ownView.rankedBallot?.rankedOptionIds).toEqual(rankedOptionIds);
    for (const other of players.filter((player) => player.id !== reconnecting.id)) {
      expect(JSON.stringify(ownView)).not.toContain(questions.get(other.id));
    }
  });

  it("allows the host to skip only a player disconnected for at least 90 seconds", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, seedFactory: () => "warehouse-skip" });
    const { code, players } = createWarehouseRoom(manager, 4);
    readyAndStart(manager, code, players);
    const host = players[0]!;
    const target = players[1]!;
    const revision = manager.publicView(code)!.phaseRevision;

    expect(
      manager.skipDisconnectedPlayer({
        code,
        hostPlayerId: host.id,
        targetPlayerId: target.id,
        requestId: "skip-connected",
        phaseRevision: revision,
      }),
    ).toMatchObject({ ok: false, error: { code: "ACTION_NOT_ALLOWED" } });

    const socketId = "socket:warehouse-skip";
    manager.bindSocket(code, target.id, socketId);
    manager.handleDisconnect(socketId);
    clock.t += 89_999;
    expect(
      manager.skipDisconnectedPlayer({
        code,
        hostPlayerId: host.id,
        targetPlayerId: target.id,
        requestId: "skip-too-soon",
        phaseRevision: revision,
      }),
    ).toMatchObject({ ok: false, error: { code: "ACTION_NOT_ALLOWED" } });

    clock.t += 1;
    expect(
      manager.skipDisconnectedPlayer({
        code,
        hostPlayerId: host.id,
        targetPlayerId: target.id,
        requestId: "skip-eligible",
        phaseRevision: revision,
      }).ok,
    ).toBe(true);
    expect(manager.getRoom(code)!.match).toMatchObject({
      skippedPlayerIds: [target.id],
      lockedAnswers: [],
      rankedBallots: [],
    });
    expect(
      manager.getRoom(code)!.match!.eventLedger.at(-1),
    ).toMatchObject({
      type: "PLAYER_SKIPPED",
      playerId: target.id,
    });
  });

  it.each([4, 5, 6] as const)(
    "completes a deterministic %i-player Warehouse flow and replay resets every ledger",
    (playerCount) => {
      const { now } = makeClock();
      const manager = new RoomManager({
        now,
        seedFactory: () => `warehouse-complete-${playerCount}`,
        disableRateLimits: true,
      });
      const { code, players } = createWarehouseRoom(manager, playerCount);
      readyAndStart(manager, code, players);

      playWarehouseToResults(manager, code, players);

      const result = manager.publicView(code)! as WarehousePublicView;
      expect(result.phase).toBe("RESULT_REVEAL");
      expect(result.result?.status).toBe("complete");
      expect(result.resultAttribution.bestPatch).toMatchObject({
        playerId: players[0]!.id,
        playerName: "لاعب 1",
      });
      expect(result.resultAttribution.worstContradiction).toBeNull();
      expect(manager.getRoom(code)!.status).toBe("results");
      expect(manager.getRoom(code)!.match!.resolvedChapters).toEqual([
        "power",
        "device",
        "car",
      ]);
      const ledger = manager.getRoom(code)!.match!.eventLedger;
      expect(new Set(ledger.map((item) => item.id)).size).toBe(ledger.length);
      for (const requiredType of [
        "WORLD_FACT_REVEALED",
        "QUESTION_ASSIGNED",
        "ALL_ANSWERS_LOCKED",
        "EVIDENCE_REVEALED",
        "ISSUE_DETECTED",
        "ISSUE_REVEALED",
        "PATCH_OPTIONS_GENERATED",
        "RANKED_BALLOT_SUBMITTED",
        "PATCH_ADOPTED",
        "STORY_FACT_UPDATED",
        "CHAPTER_RESOLVED",
        "SCORE_CALCULATED",
      ] as const) {
        expect(ledger.some((item) => item.type === requiredType)).toBe(true);
      }

      expect(manager.replay({ code, playerId: players[0]!.id }).ok).toBe(true);
      expect(manager.getRoom(code)!.match).toMatchObject({
        phase: "STORY_BUILDING",
        chapter: "story",
        lockedAnswers: [],
        rankedBallots: [],
        adoptedPatches: [],
        disconnectedAtByPlayer: {},
        skippedPlayerIds: [],
        scoreResult: null,
      });
      expect(manager.getRoom(code)!.match!.eventLedger).not.toEqual([]);
      expect(
        manager.getRoom(code)!.match!.eventLedger.some((item) => item.type === "ANSWER_LOCKED"),
      ).toBe(false);
    },
  );
});
