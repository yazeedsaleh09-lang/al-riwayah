import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as ioClient, type Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import { buildServer, RoomManager, type BuiltServer } from "@al-riwayah/server";
import { createRoomWithPlayers, makeClock, readyAndStart } from "./driver";

interface Ack<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code: string };
}

interface Credentials {
  roomCode: string;
  playerId: string;
  recoveryToken: string;
}

let built: BuiltServer;
let url: string;
const clients: Socket[] = [];

const envelope = (
  requestId: string,
  payload: unknown,
  phaseRevision?: number,
): Record<string, unknown> => ({
  protocolVersion: 1,
  requestId,
  payload,
  ...(phaseRevision === undefined ? {} : { phaseRevision }),
});

beforeAll(async () => {
  built = await buildServer({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 0,
    CORS_ORIGIN: "*",
    ROOM_TTL_MS: 60_000,
    ROOM_MAX_LIFETIME_MS: 600_000,
    PHASE_DURATION_SCALE: 1,
  });
  await built.app.listen({ host: "127.0.0.1", port: 0 });
  const address = built.app.server.address() as AddressInfo;
  url = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  for (const client of clients) client.close();
  built.stopTimers();
  await built.app.close();
});

function connect(): Socket {
  const socket = ioClient(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  clients.push(socket);
  return socket;
}

function emit<T = unknown>(socket: Socket, event: string, payload: unknown): Promise<Ack<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout for ${event}`)), 4_000);
    socket.emit(event, payload, (ack: Ack<T>) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

async function createSocketRoom(
  prefix: string,
  playerCount = 1,
): Promise<{ sockets: Socket[]; credentials: Credentials[] }> {
  const host = connect();
  const created = await emit<Credentials>(
    host,
    "room:create",
    envelope(`${prefix}:create`, { displayName: `${prefix} host` }),
  );
  if (!created.ok || !created.data) throw new Error(`${prefix}: room create failed`);

  const sockets = [host];
  const credentials = [created.data];
  for (let index = 2; index <= playerCount; index++) {
    const socket = connect();
    const joined = await emit<Credentials>(
      socket,
      "room:join",
      envelope(`${prefix}:join:${index}`, {
        code: created.data.roomCode,
        displayName: `${prefix} player ${index}`,
      }),
    );
    if (!joined.ok || !joined.data) throw new Error(`${prefix}: join ${index} failed`);
    sockets.push(socket);
    credentials.push(joined.data);
  }
  return { sockets, credentials };
}

async function readyAndStartSocketRoom(
  prefix: string,
  sockets: Socket[],
  credentials: Credentials[],
): Promise<number> {
  for (let index = 0; index < sockets.length; index++) {
    const ready = await emit(
      sockets[index]!,
      "player:setReady",
      envelope(`${prefix}:ready:${index}`, { ready: true }),
    );
    if (!ready.ok) throw new Error(`${prefix}: ready ${index} failed`);
  }
  const started = await emit(sockets[0]!, "match:start", envelope(`${prefix}:start`, {}));
  if (!started.ok) throw new Error(`${prefix}: start failed`);
  return built.manager.publicView(credentials[0]!.roomCode)!.phaseRevision;
}

function delay(ms = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("authoritative realtime regressions", () => {
  it("does not let one socket restore a second room/player session or leave stale bindings", async () => {
    const roomA = await createSocketRoom("bind-a");
    const roomB = await createSocketRoom("bind-b");
    const socketA = roomA.sockets[0]!;
    const socketAId = socketA.id!;

    const restored = await emit<Credentials>(
      socketA,
      "room:restore",
      envelope("bind:cross-room-restore", {
        recoveryToken: roomB.credentials[0]!.recoveryToken,
      }),
    );

    expect.soft(restored).toMatchObject({
      ok: false,
      error: { code: "ACTION_NOT_ALLOWED" },
    });

    const sameSessionRestore = await emit(
      socketA,
      "room:restore",
      envelope("bind:same-session-restore", {
        recoveryToken: roomA.credentials[0]!.recoveryToken,
      }),
    );
    expect.soft(sameSessionRestore).toMatchObject({ ok: true, data: { synced: true } });

    const boundCount = [
      ...built.manager.roomSockets(roomA.credentials[0]!.roomCode),
      ...built.manager.roomSockets(roomB.credentials[0]!.roomCode),
    ].filter(({ socketId }) => socketId === socketAId).length;
    expect.soft(boundCount).toBe(1);

    socketA.close();
    await delay();
    const staleCount = [
      ...built.manager.roomSockets(roomA.credentials[0]!.roomCode),
      ...built.manager.roomSockets(roomB.credentials[0]!.roomCode),
    ].filter(({ socketId }) => socketId === socketAId).length;
    expect(staleCount).toBe(0);
  });

  it("rejects missing, stale, and future revisions at the manager authority boundary", () => {
    const { now } = makeClock();
    const manager = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(manager, 4);
    readyAndStart(manager, code, players);
    const revision = manager.publicView(code)!.phaseRevision;
    const intent = { type: "ACKNOWLEDGE" as const, playerId: players[0]!.id };

    expect(
      manager.gameIntent({
        code,
        playerId: players[0]!.id,
        requestId: "revision:missing",
        intent,
      }),
    ).toMatchObject({ ok: false, error: { code: "STALE_REVISION" } });
    expect(
      manager.gameIntent({
        code,
        playerId: players[0]!.id,
        requestId: "revision:stale",
        phaseRevision: revision - 1,
        intent,
      }),
    ).toMatchObject({ ok: false, error: { code: "STALE_REVISION" } });
    expect(
      manager.gameIntent({
        code,
        playerId: players[0]!.id,
        requestId: "revision:future",
        phaseRevision: revision + 1,
        intent,
      }),
    ).toMatchObject({ ok: false, error: { code: "STALE_REVISION" } });
  });

  it("rate-limits recovery-token scans by connection identity", () => {
    const { now } = makeClock();
    const manager = new RoomManager({ now });
    for (let attempt = 0; attempt < 30; attempt++) {
      expect(manager.allowRestoreAttempt("203.0.113.8")).toBe(true);
    }
    expect(manager.allowRestoreAttempt("203.0.113.8")).toBe(false);
    expect(manager.allowRestoreAttempt("203.0.113.9")).toBe(true);
  });

  it("may disable rate limits only through the explicit test manager option", () => {
    const manager = new RoomManager({ disableRateLimits: true });
    for (let attempt = 0; attempt < 150; attempt++) {
      expect(manager.allowRestoreAttempt("203.0.113.8")).toBe(true);
    }
  });

  it("does not rebroadcast full views for cached or invalid gameplay intents", async () => {
    const { sockets, credentials } = await createSocketRoom("broadcast", 4);
    const revision = await readyAndStartSocketRoom("broadcast", sockets, credentials);
    const host = sockets[0]!;
    await delay();

    let publicViewCount = 0;
    let privateViewCount = 0;
    host.on("view:public", () => {
      publicViewCount += 1;
    });
    host.on("view:private", () => {
      privateViewCount += 1;
    });

    const validEnvelope = envelope(
      "broadcast:story",
      { fieldId: "entryReason", value: "check_inventory_mismatch" },
      revision,
    );
    const accepted = await emit(host, "story:set", validEnvelope);
    expect(accepted.ok).toBe(true);
    await delay();
    const afterAccepted = { publicViewCount, privateViewCount };

    const cached = await emit(host, "story:set", validEnvelope);
    expect(cached.ok).toBe(true);
    await delay();
    expect.soft({ publicViewCount, privateViewCount }).toEqual(afterAccepted);

    const invalid = await emit(
      host,
      "answer:submit",
      envelope(
        "broadcast:invalid",
        { questionInstanceId: "not-current", optionId: "not-allowed" },
        revision,
      ),
    );
    expect(invalid.ok).toBe(false);
    await delay();
    expect({ publicViewCount, privateViewCount }).toEqual(afterAccepted);
  });
});
