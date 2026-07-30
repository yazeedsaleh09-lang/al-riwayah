import { afterEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "@al-riwayah/server";
import { isProduction, loadEnv } from "../../apps/server/src/env";
import {
  generateRecoveryToken,
  generateRoomCode,
  hashToken,
  randomId,
  verifyToken,
} from "../../apps/server/src/tokens";
import {
  displayNameSchema,
  envelope,
  roomCodeSchema,
  roomSettingsSchema,
  safeError,
  startPayloadSchema,
} from "@al-riwayah/protocol";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("server environment branches", () => {
  it("loads defaults and recognizes non-production", () => {
    const env = loadEnv({});
    expect(env).toMatchObject({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 4000,
      CORS_ORIGIN: "*",
    });
    expect(isProduction(env)).toBe(false);
  });

  it("coerces configured values and recognizes production", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: "5000",
      CORS_ORIGIN: "https://example.test",
      ROOM_TTL_MS: "1000",
      ROOM_MAX_LIFETIME_MS: "2000",
      PHASE_DURATION_SCALE: "0.5",
      RENDER_GIT_COMMIT: "abcdef1",
    });
    expect(env.PORT).toBe(5000);
    expect(env.PHASE_DURATION_SCALE).toBe(0.5);
    expect(isProduction(env)).toBe(true);
  });

  it("logs and rejects invalid configuration", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => loadEnv({ PORT: "0" })).toThrow("Environment validation failed");
    expect(error).toHaveBeenCalledWith("Invalid environment:", expect.any(Object));
  });

  it("rejects a fixed E2E seed only in production", () => {
    expect(loadEnv({ NODE_ENV: "test", E2E_FIXED_SEED: "seed" }).E2E_FIXED_SEED).toBe("seed");
    expect(() => loadEnv({ NODE_ENV: "production", E2E_FIXED_SEED: "seed" })).toThrow(
      "forbidden in production",
    );
  });
});

describe("rate-limit and token branches", () => {
  it("expires old rate-limit hits and preserves current hits", () => {
    const clock = { now: 1_000 };
    const limiter = new RateLimiter(() => clock.now);
    expect(limiter.check("create", "ip")).toBe(true);
    clock.now += 10 * 60 * 1_000 + 1;
    expect(limiter.check("create", "ip")).toBe(true);
    limiter.sweep();
    expect(limiter.check("join", "other")).toBe(true);
  });

  it("sweeps empty and non-empty buckets", () => {
    const clock = { now: 1_000 };
    const limiter = new RateLimiter(() => clock.now);
    limiter.check("join", "old");
    limiter.check("join", "fresh");
    clock.now += 5 * 60 * 1_000;
    limiter.check("join", "fresh");
    limiter.sweep();
    expect(limiter.check("join", "fresh")).toBe(true);
  });

  it("generates, hashes, verifies, and rejects malformed token hashes", () => {
    const token = generateRecoveryToken();
    const hash = hashToken(token);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(verifyToken(token, hash)).toBe(true);
    expect(verifyToken(`${token}x`, hash)).toBe(false);
    expect(verifyToken(token, "00")).toBe(false);
    expect(generateRoomCode()).toHaveLength(4);
    expect(generateRoomCode(6)).toHaveLength(6);
    expect(randomId("player")).toMatch(/^player_/);
  });
});

describe("protocol schema boundary branches", () => {
  it("normalizes room codes and room-setting defaults", () => {
    expect(roomCodeSchema.parse(" abcd ")).toBe("ABCD");
    expect(roomCodeSchema.safeParse("I").success).toBe(false);
    expect(roomSettingsSchema.parse({})).toEqual({
      soundDefault: true,
      motionDefault: true,
      extendedPlanning: false,
    });
  });

  it("rejects every display-name boundary and accepts Unicode", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
    expect(displayNameSchema.safeParse("x".repeat(25)).success).toBe(false);
    expect(displayNameSchema.safeParse("<name>").success).toBe(false);
    expect(displayNameSchema.safeParse("name\n").success).toBe(true);
    expect(displayNameSchema.safeParse(`name${String.fromCharCode(0x7f)}`).success).toBe(false);
    expect(displayNameSchema.safeParse("يزيد🙂").success).toBe(true);
  });

  it("covers optional envelope fields, strict payloads, and safe-error messages", () => {
    const schema = envelope(startPayloadSchema);
    expect(schema.parse({ protocolVersion: 1, requestId: "r", payload: {} })).toEqual({
      protocolVersion: 1,
      requestId: "r",
      payload: {},
    });
    expect(startPayloadSchema.safeParse({ extra: true }).success).toBe(false);
    expect(safeError("NOT_READY")).toEqual({ code: "NOT_READY" });
    expect(safeError("NOT_READY", "wait")).toEqual({
      code: "NOT_READY",
      message: "wait",
    });
  });
});
