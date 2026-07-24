import type { PublicRoomView, PrivatePlayerView } from "@al-riwayah/game-engine";
import type { SafeError } from "./errors";

export * from "./errors";
export * from "./schemas";

/** Typed acknowledgment returned for a gameplay intent. */
export type ServerAck<T = unknown> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId: string; error: SafeError };

/** Credentials returned on create/join. The recovery token is never in a URL. */
export interface SessionCredentials {
  roomCode: string;
  playerId: string;
  recoveryToken: string;
  isHost: boolean;
}

/** Server→client event payloads. */
export interface ServerToClientEvents {
  "view:public": (view: PublicRoomView) => void;
  "view:private": (view: PrivatePlayerView) => void;
  "room:error": (error: SafeError) => void;
  "session:rotated": (data: { recoveryToken: string }) => void;
  "connection:replaced": (data: { reason: "REPLACED" }) => void;
  "server:time": (data: { serverTime: number; phaseRevision: number }) => void;
}

export const SERVER_EVENT_NAMES = [
  "view:public",
  "view:private",
  "room:error",
  "session:rotated",
  "connection:replaced",
  "server:time",
] as const;

export type { PublicRoomView, PrivatePlayerView } from "@al-riwayah/game-engine";
