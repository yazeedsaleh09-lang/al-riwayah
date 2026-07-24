import { describe, it, expect } from "vitest";
import { RoomManager, redact, buildServer } from "@al-riwayah/server";
import { displayNameSchema } from "@al-riwayah/protocol";
import { missingPayrollEnvelopeV1 as CASE } from "@al-riwayah/content";
import { createRoomWithPlayers, makeClock, readyAndStart } from "../integration/driver";

/** Advance a started match (forcing deadlines) until it reaches `phase`. */
function advanceTo(mgr: RoomManager, code: string, clock: { t: number }, phase: string): void {
  let guard = 0;
  while (mgr.publicView(code)!.phase !== phase && guard < 40) {
    const pub = mgr.publicView(code)!;
    if (pub.phase === "RESULTS") break;
    clock.t = (pub.deadlineAt ?? clock.t) + 1;
    mgr.tick();
    guard++;
  }
}

const WIFI_DETAIL = CASE.privateEvidencePool.find((e) => e.id === "pe.own_device_wifi")!.detail.ar;

describe("secrecy & security (SEC-001..010)", () => {
  it("SEC-001: public view has no private keys and no private evidence text", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    advanceTo(mgr, code, clock, "INTERROGATION_FOUNDATION");

    const pub = mgr.publicView(code)! as unknown as Record<string, unknown>;
    for (const key of ["answers", "scoreLedger", "privateEvidenceByPlayer", "detectedContradictions", "questionsByPlayer"]) {
      expect(key in pub).toBe(false);
    }
    expect(JSON.stringify(pub)).not.toContain(WIFI_DETAIL);
  });

  it("SEC-002: a player's view never contains another player's question/evidence", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    advanceTo(mgr, code, clock, "INTERROGATION_FOUNDATION");

    const v0 = mgr.privateView(code, players[0]!.id)!;
    const v1 = mgr.privateView(code, players[1]!.id)!;
    // Each player's own question instance id is scoped to them.
    expect(v0.currentQuestion?.instanceId).toContain(players[0]!.id);
    expect(v1.currentQuestion?.instanceId).toContain(players[1]!.id);
    // Player 0's serialized view must not contain player 1's question instance.
    expect(JSON.stringify(v0)).not.toContain(v1.currentQuestion!.instanceId);
  });

  it("SEC-003 & SEC-004: no unreleased candidates and no result before verdict", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    advanceTo(mgr, code, clock, "INTERROGATION_GAPS");
    const pub = mgr.publicView(code)!;
    expect(pub.releasedContradiction).toBeNull();
    expect(pub.result).toBeNull();
  });

  it("SEC-005: an invalid option cannot mutate state", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    advanceTo(mgr, code, clock, "INTERROGATION_FOUNDATION");
    const p = players[0]!;
    const rev = mgr.publicView(code)!.phaseRevision;
    const priv = mgr.privateView(code, p.id)!;
    const ack = mgr.gameIntent({ code, playerId: p.id, requestId: "bad", phaseRevision: rev, intent: { type: "ANSWER", playerId: p.id, questionInstanceId: priv.currentQuestion!.instanceId, optionId: "opt.DOES_NOT_EXIST" } });
    expect(ack.ok).toBe(false);
    expect(mgr.privateView(code, p.id)!.answerLocked).toBe(false);
  });

  it("SEC-006: a replayed / conflicting requestId does not change the locked answer", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    advanceTo(mgr, code, clock, "INTERROGATION_FOUNDATION");
    const p = players[0]!;
    const rev = mgr.publicView(code)!.phaseRevision;
    const priv = mgr.privateView(code, p.id)!;
    const inst = priv.currentQuestion!.instanceId;
    const first = priv.currentQuestion!.options[0]!.id;
    const second = priv.currentQuestion!.options[1]?.id ?? first;

    const a1 = mgr.gameIntent({ code, playerId: p.id, requestId: "r1", phaseRevision: rev, intent: { type: "ANSWER", playerId: p.id, questionInstanceId: inst, optionId: first } });
    expect(a1.ok).toBe(true);
    // Same requestId, same payload → cached identical ack.
    const a2 = mgr.gameIntent({ code, playerId: p.id, requestId: "r1", phaseRevision: rev, intent: { type: "ANSWER", playerId: p.id, questionInstanceId: inst, optionId: first } });
    expect(a2.ok).toBe(true);
    // Same requestId, different payload → rejected.
    const a3 = mgr.gameIntent({ code, playerId: p.id, requestId: "r1", phaseRevision: rev, intent: { type: "ANSWER", playerId: p.id, questionInstanceId: inst, optionId: second } });
    expect(a3.ok).toBe(false);
    expect(mgr.privateView(code, p.id)!.submittedOptionId).toBe(first);
  });

  it("SEC-007: join brute-force is rate limited", () => {
    const { now } = makeClock();
    const mgr = new RoomManager({ now });
    const attempts = Array.from({ length: 25 }, () =>
      mgr.joinRoom({ code: "ZZZZ", name: "x", ip: "5.5.5.5" }),
    );
    expect(attempts.some((r) => !r.ok && r.error.code === "RATE_LIMITED")).toBe(true);
  });

  it("SEC-008: script / markup names are rejected at the schema boundary", () => {
    expect(displayNameSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
    expect(displayNameSchema.safeParse("نواف").success).toBe(true);
  });

  it("SEC-009: redaction hides tokens, evidence, answers, names, codes", () => {
    const out = redact({
      recoveryToken: "secret-token",
      roomCode: "ABCD",
      displayName: "نواف",
      answers: [{ optionId: "x" }],
      nested: { privateEvidence: { detail: "leak" }, safe: 42 },
    }) as Record<string, unknown>;
    expect(out.recoveryToken).toBe("[REDACTED]");
    expect(out.roomCode).toBe("[REDACTED]");
    expect(out.displayName).toBe("[REDACTED]");
    expect(out.answers).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).privateEvidence).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).safe).toBe(42);
  });

  it("SEC-010: debug routes are unavailable in production", async () => {
    const { app, stopTimers } = await buildServer({
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: 0,
      CORS_ORIGIN: "*",
      ROOM_TTL_MS: 60000,
      ROOM_MAX_LIFETIME_MS: 600000,
    });
    const res = await app.inject({ method: "GET", url: "/debug/rooms" });
    expect(res.statusCode).toBe(404);
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    stopTimers();
    await app.close();
  });
});
