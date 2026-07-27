import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { io as ioClient, type Socket } from "socket.io-client";
import { buildServer, type BuiltServer } from "@al-riwayah/server";
import type { AddressInfo } from "node:net";

let built: BuiltServer;
let url: string;
const clients: Socket[] = [];

beforeAll(async () => {
  built = await buildServer({
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 0,
    CORS_ORIGIN: "*",
    ROOM_TTL_MS: 60000,
    ROOM_MAX_LIFETIME_MS: 600000,
    PHASE_DURATION_SCALE: 1,
  });
  await built.app.listen({ host: "127.0.0.1", port: 0 });
  const addr = built.app.server.address() as AddressInfo;
  url = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  for (const c of clients) c.close();
  built.stopTimers();
  await built.app.close();
});

function connect(): Socket {
  const socket = ioClient(url, { transports: ["websocket"], forceNew: true });
  clients.push(socket);
  return socket;
}

function emit<T = unknown>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout for ${event}`)), 4000);
    socket.emit(event, payload, (ack: T) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

const env = (requestId: string, payload: unknown, extra: Record<string, unknown> = {}) => ({
  protocolVersion: 1,
  requestId,
  payload,
  ...extra,
});

describe("socket gateway smoke (multi-client)", () => {
  it("health endpoint responds", async () => {
    const res = await built.app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok" });
  });

  it("4 clients create + join + ready + start and all receive CASE_BRIEF", async () => {
    const host = connect();
    const created = await emit<{ ok: boolean; data: { roomCode: string; playerId: string } }>(
      host,
      "room:create",
      env("c1", { displayName: "لاعب 1" }),
    );
    expect(created.ok).toBe(true);
    const code = created.data.roomCode;

    const joiners: Socket[] = [];
    for (let i = 2; i <= 4; i++) {
      const s = connect();
      const j = await emit<{ ok: boolean }>(s, "room:join", env(`j${i}`, { code, displayName: `لاعب ${i}` }));
      expect(j.ok).toBe(true);
      joiners.push(s);
    }

    const all = [host, ...joiners];
    // Mark everyone ready.
    for (let i = 0; i < all.length; i++) {
      const r = await emit<{ ok: boolean }>(all[i]!, "player:setReady", env(`ready${i}`, { ready: true }));
      expect(r.ok).toBe(true);
    }

    const briefPromises = all.map((s) =>
      new Promise<string>((resolve) => {
        const handler = (view: { phase: string }) => {
          if (view.phase === "CASE_BRIEF") {
            s.off("view:public", handler);
            resolve(view.phase);
          }
        };
        s.on("view:public", handler);
      }),
    );

    const start = await emit<{ ok: boolean }>(host, "match:start", env("start", {}));
    expect(start.ok).toBe(true);

    const phases = await Promise.all(briefPromises);
    expect(phases.every((p) => p === "CASE_BRIEF")).toBe(true);
  });

  it("rejects a malformed payload without a crash", async () => {
    const s = connect();
    const bad = await emit<{ ok: boolean; error?: { code: string } }>(s, "room:create", { nope: true });
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe("INVALID_PAYLOAD");
  });

  it("RECON-003: restoring on a new socket replaces the previous owner socket", async () => {
    const oldSocket = connect();
    const created = await emit<{
      ok: true;
      data: { roomCode: string; recoveryToken: string };
    }>(oldSocket, "room:create", env("replace-create", { displayName: "لاعب الاستعادة" }));

    const replaced = new Promise<{ reason: string }>((resolve) => {
      oldSocket.once("connection:replaced", resolve);
    });
    const newSocket = connect();
    const restored = await emit<{ ok: boolean }>(
      newSocket,
      "room:restore",
      env("replace-restore", { recoveryToken: created.data.recoveryToken }),
    );

    expect(restored.ok).toBe(true);
    await expect(replaced).resolves.toEqual({ reason: "REPLACED" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(oldSocket.connected).toBe(false);
  });
});
