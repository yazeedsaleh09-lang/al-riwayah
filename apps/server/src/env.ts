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
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  return parsed.data;
}

export function isProduction(env: Env): boolean {
  return env.NODE_ENV === "production";
}
