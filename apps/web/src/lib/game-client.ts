"use client";

import { io, type Socket } from "socket.io-client";
import { serverUrl } from "./site";
import type { PublicRoomView, PrivatePlayerView } from "@al-riwayah/game-engine";

const PROTOCOL_VERSION = 1;

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
    const timer = setTimeout(
      () => resolve({ ok: false, requestId: env.requestId, error: { code: "SERVER_UNAVAILABLE" } }),
      6000,
    );
    s.emit(event, env, (ack: Ack<T>) => {
      clearTimeout(timer);
      resolve(ack ?? { ok: false, requestId: env.requestId, error: { code: "SERVER_UNAVAILABLE" } });
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

export async function createRoom(input: {
  displayName: string;
  settings?: { soundDefault?: boolean; motionDefault?: boolean; extendedPlanning?: boolean };
}): Promise<SessionInfo> {
  const ack = await emitIntent<SessionInfo>("room:create", {
    displayName: input.displayName,
    settings: input.settings,
  });
  if (!ack.ok) throw new Error(ack.error.code);
  saveSession(ack.data);
  return ack.data;
}

export async function joinRoom(input: {
  code: string;
  displayName: string;
}): Promise<SessionInfo> {
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
