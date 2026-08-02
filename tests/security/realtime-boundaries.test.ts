import { afterEach, describe, expect, it } from "vitest";
import { io as ioClient, type Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import { buildServer, RoomManager, type BuiltServer } from "@al-riwayah/server";
import { CLIENT_EVENT_SCHEMAS } from "@al-riwayah/protocol";
import { createRoomWithPlayers, makeClock, readyAndStart } from "../integration/driver";

const productionOrigin = "https://al-riwayah.onrender.com";
const attackerOrigin = "https://attacker.example";
const runningServers: BuiltServer[] = [];
const clients: Socket[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) client.close();
  for (const built of runningServers.splice(0)) {
    built.stopTimers();
    await built.app.close();
  }
});

async function startProductionServer(): Promise<string> {
  const built = await buildServer({
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: 0,
    CORS_ORIGIN: productionOrigin,
    ROOM_TTL_MS: 60_000,
    ROOM_MAX_LIFETIME_MS: 600_000,
    PHASE_DURATION_SCALE: 1,
  });
  runningServers.push(built);
  await built.app.listen({ host: "127.0.0.1", port: 0 });
  const address = built.app.server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function connectOutcome(socket: Socket): Promise<"connected" | "rejected"> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("socket handshake timed out")), 2_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve("connected");
    });
    socket.once("connect_error", () => {
      clearTimeout(timer);
      resolve("rejected");
    });
  });
}

function collectForbiddenPaths(
  value: unknown,
  forbidden: ReadonlySet<string>,
  path = "$",
): string[] {
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenPaths(item, forbidden, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const childPath = `${path}.${key}`;
    return [
      ...(forbidden.has(key) ? [childPath] : []),
      ...collectForbiddenPaths(nested, forbidden, childPath),
    ];
  });
}

describe("realtime production boundaries", () => {
  it("rejects a production WebSocket handshake from an origin outside the allowlist", async () => {
    const url = await startProductionServer();
    const attacker = ioClient(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      extraHeaders: { Origin: attackerOrigin },
    });
    clients.push(attacker);

    await expect(connectOutcome(attacker)).resolves.toBe("rejected");
  });

  it("requires phaseRevision on every gameplay intent schema", () => {
    const gameplayPayloads = {
      "phase:acknowledge": {},
      "story:propose": { fieldId: "reason", value: "reason.delivery" },
      "story:confirm": { fieldId: "reason" },
      "story:set": { fieldId: "entryReason", value: "check_inventory_mismatch" },
      "story:submit": {},
      "story:review": {},
      "answer:submit": { questionInstanceId: "q:p1", optionId: "option.1" },
      "patch:vote": { patchId: "patch.1" },
      "discussion:ready": {},
      "patch:ballot": { rankedOptionIds: ["patch.1", "patch.2"] },
      "player:skip": { playerId: "p-disconnected" },
    } as const;

    for (const [event, payload] of Object.entries(gameplayPayloads) as [
      keyof typeof gameplayPayloads,
      (typeof gameplayPayloads)[keyof typeof gameplayPayloads],
    ][]) {
      const result = CLIENT_EVENT_SCHEMAS[event].safeParse({
        protocolVersion: 1,
        requestId: `missing-revision:${event}`,
        payload,
      });
      expect.soft(result.success, `${event} accepted a missing phaseRevision`).toBe(false);
    }
  });

  it("requires a complete, duplicate-free ranked ballot with at least two options", () => {
    const base = {
      protocolVersion: 1,
      requestId: "ranked-ballot",
      phaseRevision: 8,
    };

    expect(
      CLIENT_EVENT_SCHEMAS["patch:ballot"].safeParse({
        ...base,
        payload: { rankedOptionIds: ["patch.1", "patch.2", "patch.3"] },
      }).success,
    ).toBe(true);
    expect(
      CLIENT_EVENT_SCHEMAS["patch:ballot"].safeParse({
        ...base,
        payload: { rankedOptionIds: ["patch.1"] },
      }).success,
    ).toBe(false);
    expect(
      CLIENT_EVENT_SCHEMAS["patch:ballot"].safeParse({
        ...base,
        payload: { rankedOptionIds: ["patch.1", "patch.1"] },
      }).success,
    ).toBe(false);
  });

  it("accepts only structured Warehouse story fields and bounded scalar values", () => {
    const base = {
      protocolVersion: 1,
      requestId: "story-field",
      phaseRevision: 1,
    };

    expect(
      CLIENT_EVENT_SCHEMAS["story:set"].safeParse({
        ...base,
        payload: {
          fieldId: "location2346",
          targetPlayerId: "p1",
          value: "loading_area",
        },
      }).success,
    ).toBe(true);
    expect(
      CLIENT_EVENT_SCHEMAS["story:set"].safeParse({
        ...base,
        payload: { fieldId: "arbitrary_private_fact", value: "leak" },
      }).success,
    ).toBe(false);
    expect(
      CLIENT_EVENT_SCHEMAS["story:set"].safeParse({
        ...base,
        payload: { fieldId: "carDepartureExpected", value: { fabricated: true } },
      }).success,
    ).toBe(false);
  });

  it("finds forbidden private keys recursively in every public projection", () => {
    const { now } = makeClock();
    const manager = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(manager, 4);
    readyAndStart(manager, code, players);

    const forbidden = new Set([
      "answers",
      "answersByPlayer",
      "scoreLedger",
      "privateEvidence",
      "privateEvidenceByPlayer",
      "questionsByPlayer",
      "currentQuestion",
      "submittedOptionId",
      "recoveryToken",
      "sessionHash",
      "detectedContradictions",
    ]);

    expect(collectForbiddenPaths(manager.publicView(code), forbidden)).toEqual([]);
  });
});
