/**
 * Drives a full match through the RoomManager (the real server authority path,
 * including redaction), using a manual clock. This exercises create/join/ready/
 * start, every phase, deadlines, and result release end-to-end.
 */
import type { RoomManager } from "@al-riwayah/server";
import type { WarehousePrivateView, WarehousePublicView } from "@al-riwayah/game-engine";
import type { WarehouseManagerIntent } from "@al-riwayah/server";
import { WAREHOUSE_CASE_ID } from "@al-riwayah/content";

export interface TestPlayer {
  id: string;
  token: string;
  isHost: boolean;
}

export function makeClock(start = 1_000_000) {
  const clock = { t: start };
  return { clock, now: () => clock.t };
}

export function createRoomWithPlayers(
  mgr: RoomManager,
  n: number,
): { code: string; players: TestPlayer[] } {
  const host = mgr.createLegacyRoom({
    hostName: "لاعب 1",
    caseId: WAREHOUSE_CASE_ID,
    ip: "10.0.0.1",
  });
  if (!host.ok) throw new Error("create failed");
  const code = host.data.roomCode;
  const players: TestPlayer[] = [
    { id: host.data.playerId, token: host.data.recoveryToken, isHost: true },
  ];
  for (let i = 2; i <= n; i++) {
    const j = mgr.joinRoom({ code, name: `لاعب ${i}`, ip: `10.0.0.${i}` });
    if (!j.ok) throw new Error(`join ${i} failed: ${j.error.code}`);
    players.push({ id: j.data.playerId, token: j.data.recoveryToken, isHost: false });
  }
  return { code, players };
}

export function readyAndStart(mgr: RoomManager, code: string, players: TestPlayer[]): void {
  for (const p of players) {
    const r = mgr.setReady({ code, playerId: p.id, ready: true });
    if (!r.ok) throw new Error(`ready failed: ${r.error.code}`);
  }
  const host = players.find((p) => p.isHost)!;
  const s = mgr.startMatch({ code, playerId: host.id });
  if (!s.ok) throw new Error(`start failed: ${s.error.code}`);
}

/** Play a deterministic Warehouse match to RESULT_REVEAL through RoomManager. */
export function playToResults(
  mgr: RoomManager,
  code: string,
  players: TestPlayer[],
  _clock: { t: number },
  absent: string[] = [],
): void {
  if (absent.length > 0) {
    throw new Error("Warehouse players must be explicitly skipped after a qualifying disconnect");
  }
  let requestSequence = 0;
  const send = (playerId: string, intent: WarehouseManagerIntent): void => {
    const result = mgr.gameIntent({
      code,
      playerId,
      requestId: `warehouse-driver:${requestSequence++}`,
      phaseRevision: mgr.publicView(code)!.phaseRevision,
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
  while (guard < 80) {
    const publicView = mgr.publicView(code)! as WarehousePublicView;
    if (publicView.phase === "RESULT_REVEAL") return;
    if (publicView.phase === "SILENT_PHASE_INTRO") {
      for (const player of players) {
        const privateView = mgr.privateView(code, player.id)! as WarehousePrivateView;
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
        const privateView = mgr.privateView(code, player.id)! as WarehousePrivateView;
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
        const privateView = mgr.privateView(code, player.id)! as WarehousePrivateView;
        if (privateView.allowedActions.includes("CONFIRM_STORY")) {
          send(player.id, { type: "WAREHOUSE_STORY_REVIEW", playerId: player.id });
        }
      }
    } else if (publicView.phase === "OPEN_DISCUSSION") {
      for (const player of players) {
        const privateView = mgr.privateView(code, player.id)! as WarehousePrivateView;
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
        const privateView = mgr.privateView(code, player.id)! as WarehousePrivateView;
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
  throw new Error("match did not reach RESULT_REVEAL within guard");
}
