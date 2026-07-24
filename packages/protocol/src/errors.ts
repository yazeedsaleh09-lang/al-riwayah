/** Safe error codes (REALTIME_PROTOCOL.md). Never leak internals to clients. */
export const SAFE_ERROR_CODES = [
  "INVALID_PAYLOAD",
  "UNSUPPORTED_PROTOCOL",
  "ROOM_NOT_FOUND",
  "ROOM_EXPIRED",
  "ROOM_FULL",
  "MATCH_STARTED",
  "NAME_INVALID",
  "NAME_TAKEN",
  "NOT_HOST",
  "NOT_READY",
  "INVALID_PHASE",
  "STALE_REVISION",
  "DEADLINE_PASSED",
  "ACTION_NOT_ALLOWED",
  "ANSWER_ALREADY_LOCKED",
  "SESSION_INVALID",
  "RATE_LIMITED",
  "SERVER_UNAVAILABLE",
] as const;

export type SafeErrorCode = (typeof SAFE_ERROR_CODES)[number];

export interface SafeError {
  code: SafeErrorCode;
  /** Optional short, non-sensitive message for display. Never contains payloads. */
  message?: string;
}

export function safeError(code: SafeErrorCode, message?: string): SafeError {
  return message ? { code, message } : { code };
}
