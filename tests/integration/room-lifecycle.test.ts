import { describe, it, expect } from "vitest";
import { RoomManager } from "@al-riwayah/server";
import { createRoomWithPlayers, makeClock, readyAndStart } from "./driver";

describe("room lifecycle (ROOM/JOIN/READY/RECON)", () => {
  it("ROOM-001: create yields a valid code with host joined", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const r = mgr.createRoom({ hostName: "لاعب 1", ip: "1.1.1.1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.roomCode).toMatch(/^[A-Z0-9]{4,6}$/);
    expect(r.data.isHost).toBe(true);
    const pub = mgr.publicView(r.data.roomCode)!;
    expect(pub.phase).toBe("LOBBY");
    expect(pub.players).toHaveLength(1);
  });

  it("ROOM-002: create burst above the limit is rate-limited", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const results = Array.from({ length: 7 }, () =>
      mgr.createRoom({ hostName: "لاعب", ip: "9.9.9.9" }),
    );
    expect(results.some((r) => !r.ok && r.error.code === "RATE_LIMITED")).toBe(true);
  });

  it("JOIN-001: join by valid code updates the roster", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    expect(players).toHaveLength(4);
    expect(mgr.publicView(code)!.players).toHaveLength(4);
  });

  it("JOIN-002: invalid / full / started rooms give distinct errors", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    expect(mgr.joinRoom({ code: "ZZZZ", name: "x", ip: "1" })).toMatchObject({ ok: false, error: { code: "ROOM_NOT_FOUND" } });

    const { code, players } = createRoomWithPlayers(mgr, 6);
    expect(mgr.joinRoom({ code, name: "لاعب 7", ip: "2" })).toMatchObject({ ok: false, error: { code: "ROOM_FULL" } });

    readyAndStart(mgr, code, players);
    expect(mgr.joinRoom({ code, name: "late", ip: "3" })).toMatchObject({ ok: false, error: { code: "MATCH_STARTED" } });
  });

  it("JOIN-003: duplicate name is rejected", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code } = createRoomWithPlayers(mgr, 4);
    expect(mgr.joinRoom({ code, name: "لاعب 1", ip: "4" })).toMatchObject({ ok: false, error: { code: "NAME_TAKEN" } });
  });

  it("READY-001: start with 3 is rejected", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 3);
    for (const p of players) mgr.setReady({ code, playerId: p.id, ready: true });
    const s = mgr.startMatch({ code, playerId: players[0]!.id });
    expect(s).toMatchObject({ ok: false, error: { code: "NOT_READY" } });
  });

  it("READY-002: start with 4 all ready starts; non-host cannot start", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    expect(mgr.startMatch({ code, playerId: players[1]!.id })).toMatchObject({ ok: false, error: { code: "NOT_HOST" } });
    for (const p of players) mgr.setReady({ code, playerId: p.id, ready: true });
    expect(mgr.startMatch({ code, playerId: players[0]!.id }).ok).toBe(true);
    expect(mgr.publicView(code)!.phase).toBe("CASE_BRIEF");
  });

  it("READY-003: double start is idempotent (no duplicate match)", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    const rev1 = mgr.publicView(code)!.phaseRevision;
    expect(mgr.startMatch({ code, playerId: players[0]!.id }).ok).toBe(true);
    expect(mgr.publicView(code)!.phaseRevision).toBe(rev1);
  });

  it("results actions cannot reset an active match early", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    readyAndStart(mgr, code, players);
    expect(mgr.replay({ code, playerId: players[0]!.id })).toMatchObject({
      ok: false,
      error: { code: "INVALID_PHASE" },
    });
    expect(mgr.newGroup({ code, playerId: players[0]!.id })).toMatchObject({
      ok: false,
      error: { code: "INVALID_PHASE" },
    });
  });

  it("RECON-001/003: refresh restores the same player and rotates token", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    const p = players[1]!;
    mgr.bindSocket(code, p.id, "sock-old");
    mgr.handleDisconnect("sock-old");
    const restored = mgr.restore({ recoveryToken: p.token });
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.playerId).toBe(p.id);
    expect(restored.data.rotatedToken).not.toBe(p.token);
    // Old token no longer works after rotation.
    expect(mgr.restore({ recoveryToken: p.token }).ok).toBe(false);
  });

  it("RECON-003: rebinding identifies the socket that must be replaced", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    const player = players[1]!;
    expect(mgr.bindSocket(code, player.id, "sock-old")).toBeNull();
    expect(mgr.bindSocket(code, player.id, "sock-new")).toBe("sock-old");
    expect(mgr.roomSockets(code).find((p) => p.playerId === player.id)?.socketId).toBe(
      "sock-new",
    );
  });

  it("RECON-004: stolen/invalid token is denied without leak", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    createRoomWithPlayers(mgr, 4);
    const r = mgr.restore({ recoveryToken: "x".repeat(43) });
    expect(r).toMatchObject({ ok: false, error: { code: "SESSION_INVALID" } });
  });

  it("RECON-006: host disconnect transfers host to earliest connected player", () => {
    const mgr = new RoomManager({ now: makeClock().now });
    const { code, players } = createRoomWithPlayers(mgr, 4);
    for (const p of players) mgr.bindSocket(code, p.id, `sock-${p.id}`);
    mgr.handleDisconnect(`sock-${players[0]!.id}`);
    const pub = mgr.publicView(code)!;
    const host = pub.players.find((p) => p.isHost)!;
    expect(host.id).toBe(players[1]!.id);
  });

  it("ROOM-003: an idle room past TTL is cleaned up", () => {
    const { clock, now } = makeClock();
    const mgr = new RoomManager({ now, ttlMs: 1000, maxLifetimeMs: 10_000 });
    const { code } = createRoomWithPlayers(mgr, 4);
    clock.t += 2000;
    const removed = mgr.cleanupExpired();
    expect(removed).toContain(code);
    expect(mgr.publicView(code)).toBeNull();
    expect(mgr.joinRoom({ code, name: "late", ip: "5" })).toMatchObject({
      ok: false,
      error: { code: "ROOM_EXPIRED" },
    });
  });
});
