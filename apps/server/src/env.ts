/** Validated environment. Fails fast on misconfiguration. */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Comma-separated allowed CORS origins, or "*" for dev. */
  CORS_ORIGIN: z.string().default("*"),
  /** Inactivity TTL (ms) before an idle room is cleaned up. */
  ROOM_TTL_MS: z.coerce.number().int().positive().default(30 * 60 * 1000),
  /** Hard maximum room lifetime (ms). */
  ROOM_MAX_LIFETIME_MS: z.coerce.number().int().positive().default(2 * 60 * 60 * 1000),
  /** Automated realtime UI tests may shorten deadlines; production remains 1. */
  PHASE_DURATION_SCALE: z.coerce.number().min(0.01).max(1).default(1),
  /** Reproducible authored assignments for browser evidence; forbidden in production. */
  E2E_FIXED_SEED: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.E2E_FIXED_SEED) {
    throw new Error("E2E_FIXED_SEED is forbidden in production");
  }
  return parsed.data;
}

export function isProduction(env: Env): boolean {
  return env.NODE_ENV === "production";
}
