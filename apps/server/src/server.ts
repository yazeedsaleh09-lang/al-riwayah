/**
 * HTTP + realtime server. Fastify serves health/readiness; Socket.IO attaches to
 * the same HTTP server for authoritative realtime rooms. Production must run
 * behind HTTPS/WSS (see DEPLOYMENT.md).
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { Server as IOServer } from "socket.io";
import { RoomManager } from "./room-manager";
import { registerGateway, emitRoomView } from "./gateway";
import { createLogger } from "./redact-log";
import type { Env } from "./env";
import { isProduction } from "./env";

export interface BuiltServer {
  app: FastifyInstance;
  io: IOServer;
  manager: RoomManager;
  stopTimers: () => void;
}

export async function buildServer(env: Env): Promise<BuiltServer> {
  const log = createLogger(isProduction(env) ? "info" : "debug");
  const app = Fastify({ logger: false });

  const origins = env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((s) => s.trim());
  await app.register(cors, { origin: origins });

  const manager = new RoomManager({
    ttlMs: env.ROOM_TTL_MS,
    maxLifetimeMs: env.ROOM_MAX_LIFETIME_MS,
    logger: log,
  });

  app.get("/health", async () => ({ status: "ok", time: Date.now() }));
  app.get("/readyz", async () => ({ status: "ready", rooms: manager.roomCount() }));

  // Debug routes are never mounted in production (SEC-010).
  if (!isProduction(env)) {
    app.get("/debug/rooms", async () => ({ rooms: manager.roomCount() }));
  }

  const io = new IOServer(app.server, {
    cors: { origin: origins },
    maxHttpBufferSize: 1e6,
    transports: ["websocket", "polling"],
  });
  registerGateway(io, manager, log);

  // Authoritative timing loop: advance phases on deadline, emit changes,
  // and clean up expired rooms.
  const tickTimer = setInterval(() => {
    for (const code of manager.tick()) emitRoomView(io, manager, code);
  }, 250);
  const cleanupTimer = setInterval(() => manager.cleanupExpired(), 30_000);
  tickTimer.unref?.();
  cleanupTimer.unref?.();

  const stopTimers = () => {
    clearInterval(tickTimer);
    clearInterval(cleanupTimer);
  };

  return { app, io, manager, stopTimers };
}
