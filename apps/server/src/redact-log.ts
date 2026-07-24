/**
 * Structured logging with redaction (SEC-009). Never prints recovery tokens,
 * private evidence, question payloads, private answers, or room codes in
 * plaintext operational logs.
 */
const SENSITIVE_KEYS = new Set([
  "recoveryToken",
  "token",
  "sessionHash",
  "privateEvidence",
  "privateEvidenceByPlayer",
  "answers",
  "answer",
  "questionsByPlayer",
  "currentQuestion",
  "optionId",
  "displayName",
  "name",
  "roomCode",
  "code",
]);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[…]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k) ? "[REDACTED]" : redact(v, depth + 1);
  }
  return out;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void;
}

export function createLogger(minLevel: LogLevel = "info"): Logger {
  const order: LogLevel[] = ["debug", "info", "warn", "error"];
  const threshold = order.indexOf(minLevel);
  return {
    log(level, msg, meta) {
      if (order.indexOf(level) < threshold) return;
      const line = { t: new Date().toISOString(), level, msg, ...(meta ? { meta: redact(meta) } : {}) };
      const text = JSON.stringify(line);
      if (level === "error") console.error(text);
      else if (level === "warn") console.warn(text);
      else console.log(text);
    },
  };
}
