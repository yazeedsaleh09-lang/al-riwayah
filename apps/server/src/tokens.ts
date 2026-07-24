/**
 * Recovery tokens: opaque, ≥128-bit entropy, hashed server-side. Bound to a
 * room+player and rotated on successful restore (REALTIME_PROTOCOL.md).
 */
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { ROOM_CODE_ALPHABET } from "@al-riwayah/protocol";

/** 256-bit URL-safe token. Never placed in a shareable join URL. */
export function generateRecoveryToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Generate a room code from the unambiguous alphabet using CSPRNG. */
export function generateRoomCode(length = 4): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ROOM_CODE_ALPHABET[bytes[i]! % ROOM_CODE_ALPHABET.length];
  }
  return out;
}

/** Random opaque id for players/matches. */
export function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}
