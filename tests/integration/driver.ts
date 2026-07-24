/**
 * Drives a full match through the RoomManager (the real server authority path,
 * including redaction), using a manual clock. This exercises create/join/ready/
 * start, every phase, deadlines, and result release end-to-end.
 */
import type { RoomManager } from "@al-riwayah/server";
import { missingPayrollEnvelopeV1 as CASE } from "@al-riwayah/content";

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
  const host = mgr.createRoom({ hostName: "لاعب 1", ip: "10.0.0.1" });
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

/** Play a coherent-ish match to RESULTS. Returns nothing; assert on views. */
export function playToResults(
  mgr: RoomManager,
  code: string,
  players: TestPlayer[],
  clock: { t: number },
  absent: string[] = [],
): void {
  const acting = players.filter((p) => !absent.includes(p.id));
  let guard = 0;
  while (guard < 80) {
    const pub = mgr.publicView(code)!;
    if (pub.phase === "RESULTS") return;
    const rev = pub.phaseRevision;
    const phaseBefore = pub.phase;

    for (const p of acting) {
      const priv = mgr.privateView(code, p.id)!;
      const action = priv.allowedActions[0];
      if (action === "ACKNOWLEDGE") {
        mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-${rev}`, phaseRevision: rev, intent: { type: "ACKNOWLEDGE", playerId: p.id } });
      } else if (phaseBefore === "PLAN_REASON") {
        mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-r-${rev}`, phaseRevision: rev, intent: { type: "STORY_PROPOSE", playerId: p.id, fieldId: "reason", value: CASE.planning.reasons[0]!.id } });
        mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-rc-${rev}`, phaseRevision: rev, intent: { type: "STORY_CONFIRM", playerId: p.id, fieldId: "reason" } });
      } else if (phaseBefore === "PLAN_LOCATIONS") {
        const loc = CASE.planning.locations[0]!.id;
        mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-l-${rev}`, phaseRevision: rev, intent: { type: "STORY_PROPOSE", playerId: p.id, fieldId: `location.${p.id}`, value: loc } });
        mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-lc-${rev}`, phaseRevision: rev, intent: { type: "STORY_CONFIRM", playerId: p.id, fieldId: `location.${p.id}` } });
      } else if (phaseBefore === "PLAN_ROLES" && p.isHost) {
        for (const role of CASE.planning.roles) {
          mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-${role.id}-${rev}`, phaseRevision: rev, intent: { type: "STORY_PROPOSE", playerId: p.id, fieldId: `role.${role.id}`, value: players[0]!.id } });
          mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-${role.id}c-${rev}`, phaseRevision: rev, intent: { type: "STORY_CONFIRM", playerId: p.id, fieldId: `role.${role.id}` } });
        }
      } else if (action === "ANSWER" && priv.currentQuestion) {
        const opt = priv.currentQuestion.options[0]!.id;
        mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-a-${rev}`, phaseRevision: rev, intent: { type: "ANSWER", playerId: p.id, questionInstanceId: priv.currentQuestion.instanceId, optionId: opt } });
      } else if (action === "PATCH_VOTE" && pub.patchOptions && pub.patchOptions.length > 0) {
        mgr.gameIntent({ code, playerId: p.id, requestId: `${p.id}-pv-${rev}`, phaseRevision: rev, intent: { type: "PATCH_VOTE", playerId: p.id, patchId: pub.patchOptions[0]!.id } });
      }
    }

    // If the phase did not auto-advance (timer-only phase, or absent players),
    // push the clock past the deadline and tick the authoritative loop.
    const after = mgr.publicView(code)!;
    if (after.phaseRevision === rev) {
      clock.t = (after.deadlineAt ?? clock.t) + 1;
      mgr.tick();
    }
    guard++;
  }
  throw new Error("match did not reach RESULTS within guard");
}
