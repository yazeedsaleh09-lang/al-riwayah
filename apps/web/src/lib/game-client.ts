"use client";

import { io, type Socket } from "socket.io-client";
import { serverUrl } from "./site";
import type { PublicRoomView, PrivatePlayerView } from "@al-riwayah/game-engine";

const PROTOCOL_VERSION = 1;
const COLD_START_WINDOW_MS = 75_000;
const ACK_TIMEOUT_MS = 12_000;

export type ConnectionStage = "idle" | "waking" | "connecting" | "retrying" | "ready";
export type ConnectionReporter = (stage: ConnectionStage) => void;

export interface SessionInfo {
  roomCode: string;
  playerId: string;
  recoveryToken: string;
  isHost: boolean;
}

type Ack<T = unknown> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId: string; error: { code: string; message?: string } };

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(serverUrl(), {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      randomizationFactor: 0.5,
      timeout: 10_000,
    });
  }
  return socket;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function probeHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${serverUrl().replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function waitForConnection(s: Socket, timeoutMs: number): Promise<boolean> {
  if (s.connected) return Promise.resolve(true);
  if (!s.active) s.connect();

  return new Promise((resolve) => {
    const finish = (connected: boolean) => {
      clearTimeout(timer);
      s.off("connect", onConnect);
      resolve(connected);
    };
    const onConnect = () => finish(true);
    const timer = setTimeout(() => finish(false), Math.max(1, timeoutMs));
    s.once("connect", onConnect);
  });
}

/**
 * Render services can take well over the Socket.IO handshake timeout to wake.
 * Probe the public health endpoint first, then establish a confirmed socket before
 * emitting room intents. The UI receives honest, bounded progress states.
 */
export async function prepareRealtime(report: ConnectionReporter = () => undefined): Promise<void> {
  if (socket?.connected) {
    report("ready");
    return;
  }

  const startedAt = Date.now();
  const deadline = startedAt + COLD_START_WINDOW_MS;
  report("waking");

  let attempt = 0;
  while (Date.now() < deadline) {
    if (await probeHealth()) break;
    attempt += 1;
    report(attempt > 1 ? "retrying" : "waking");
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("SERVER_UNAVAILABLE");
    await pause(Math.min(2_000 + attempt * 1_000, 8_000, remaining));
  }

  if (Date.now() >= deadline) throw new Error("SERVER_UNAVAILABLE");
  report("connecting");
  const connected = await waitForConnection(getSocket(), deadline - Date.now());
  if (!connected) throw new Error("SERVER_UNAVAILABLE");
  report("ready");
}

function rid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r${Date.now()}${Math.random().toString(36).slice(2)}`;
}

export function emitIntent<T = unknown>(
  event: string,
  payload: unknown,
  extra: Record<string, unknown> = {},
): Promise<Ack<T>> {
  const s = getSocket();
  const env = { protocolVersion: PROTOCOL_VERSION, requestId: rid(), payload, ...extra };
  return new Promise((resolve) => {
    void waitForConnection(s, COLD_START_WINDOW_MS).then((connected) => {
      if (!connected) {
        resolve({ ok: false, requestId: env.requestId, error: { code: "SERVER_UNAVAILABLE" } });
        return;
      }
      const timer = setTimeout(
        () =>
          resolve({ ok: false, requestId: env.requestId, error: { code: "SERVER_UNAVAILABLE" } }),
        ACK_TIMEOUT_MS,
      );
      s.emit(event, env, (ack: Ack<T>) => {
        clearTimeout(timer);
        resolve(
          ack ?? { ok: false, requestId: env.requestId, error: { code: "SERVER_UNAVAILABLE" } },
        );
      });
    });
  });
}

// --- session persistence (per room) ---

const key = (code: string) => `alr:session:${code.toUpperCase()}`;

export function saveSession(s: SessionInfo): void {
  try {
    sessionStorage.setItem(key(s.roomCode), JSON.stringify(s));
  } catch {
    /* storage may be unavailable */
  }
}

export function loadSession(code: string): SessionInfo | null {
  try {
    const raw = sessionStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as SessionInfo) : null;
  } catch {
    return null;
  }
}

export function updateToken(code: string, recoveryToken: string): void {
  const s = loadSession(code);
  if (s) saveSession({ ...s, recoveryToken });
}

export function clearSession(code: string): void {
  try {
    sessionStorage.removeItem(key(code));
  } catch {
    /* storage may be unavailable */
  }
}

// --- entry flows ---

export async function createRoom(
  input: {
    displayName: string;
    settings?: { soundDefault?: boolean; motionDefault?: boolean; extendedPlanning?: boolean };
  },
  report?: ConnectionReporter,
): Promise<SessionInfo> {
  await prepareRealtime(report);
  const ack = await emitIntent<SessionInfo>("room:create", {
    displayName: input.displayName,
    settings: input.settings,
  });
  if (!ack.ok) throw new Error(ack.error.code);
  saveSession(ack.data);
  return ack.data;
}

export async function joinRoom(
  input: {
    code: string;
    displayName: string;
  },
  report?: ConnectionReporter,
): Promise<SessionInfo> {
  await prepareRealtime(report);
  const ack = await emitIntent<SessionInfo>("room:join", {
    code: input.code,
    displayName: input.displayName,
  });
  if (!ack.ok) throw new Error(ack.error.code);
  saveSession(ack.data);
  return ack.data;
}

export async function createNewGroup(previousCode: string): Promise<SessionInfo> {
  const ack = await emitIntent<SessionInfo>("room:newGroup", {});
  if (!ack.ok) throw new Error(ack.error.code);
  clearSession(previousCode);
  saveSession(ack.data);
  return ack.data;
}

export interface GameViews {
  publicView: PublicRoomView | null;
  privateView: PrivatePlayerView | null;
}
