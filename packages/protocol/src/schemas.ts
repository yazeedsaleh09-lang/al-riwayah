/**
 * Zod schemas for every client→server intent. The server validates ALL input
 * with these before touching state (REALTIME_PROTOCOL.md). Payloads are bounded
 * and names are sanitized at the boundary (defense in depth — the UI also
 * escapes on render).
 */
import { z } from "zod";

export const PROTOCOL_VERSION = 1 as const;

/** Room codes: 4–6 uppercase letters/digits from an unambiguous set. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,6}$/, "invalid room code");

/** True if the string contains any C0/C1 control or DEL character. */
function hasControlChars(s: string): boolean {
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Display name: 1–24 code points after trim, no angle brackets or control
 * characters. This prevents markup at the source; rendering still escapes.
 */
export const displayNameSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => Array.from(s).length >= 1, { message: "NAME_TOO_SHORT" })
  .refine((s) => Array.from(s).length <= 24, { message: "NAME_TOO_LONG" })
  .refine((s) => !/[<>]/.test(s), { message: "NAME_INVALID_CHARS" })
  .refine((s) => !hasControlChars(s), { message: "NAME_CONTROL_CHARS" });

export const requestIdSchema = z.string().min(1).max(100);

/** Room settings exposed in the review build. */
export const roomSettingsSchema = z.object({
  soundDefault: z.boolean().default(true),
  motionDefault: z.boolean().default(true),
  extendedPlanning: z.boolean().default(false),
});
export type RoomSettings = z.infer<typeof roomSettingsSchema>;

/** Generic envelope wrapping every gameplay intent. */
export function envelope<T extends z.ZodTypeAny>(payload: T) {
  return z.object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    requestId: requestIdSchema,
    roomCode: roomCodeSchema.optional(),
    phaseRevision: z.number().int().nonnegative().optional(),
    payload,
  });
}

// --- Per-event payloads ---

export const createPayloadSchema = z.object({
  displayName: displayNameSchema,
  caseId: z.string().min(1).max(120).optional(),
  settings: roomSettingsSchema.partial().optional(),
});

export const joinPayloadSchema = z.object({
  code: roomCodeSchema,
  displayName: displayNameSchema,
});

export const restorePayloadSchema = z.object({
  recoveryToken: z.string().min(16).max(200),
});

export const setReadyPayloadSchema = z.object({ ready: z.boolean() });

export const startPayloadSchema = z.object({}).strict();

export const acknowledgePayloadSchema = z.object({}).strict();

export const proposePayloadSchema = z.object({
  fieldId: z.string().min(1).max(120),
  value: z.string().min(1).max(120),
});

export const confirmPayloadSchema = z.object({
  fieldId: z.string().min(1).max(120),
});

export const answerPayloadSchema = z.object({
  questionInstanceId: z.string().min(1).max(200),
  optionId: z.string().min(1).max(200),
});

export const patchVotePayloadSchema = z.object({
  patchId: z.string().min(1).max(200),
});

export const emptyPayloadSchema = z.object({}).strict();

/** Full envelope schemas keyed by event name. */
export const CLIENT_EVENT_SCHEMAS = {
  "room:create": envelope(createPayloadSchema),
  "room:join": envelope(joinPayloadSchema),
  "room:restore": envelope(restorePayloadSchema),
  "player:setReady": envelope(setReadyPayloadSchema),
  "match:start": envelope(startPayloadSchema),
  "phase:acknowledge": envelope(acknowledgePayloadSchema),
  "story:propose": envelope(proposePayloadSchema),
  "story:confirm": envelope(confirmPayloadSchema),
  "answer:submit": envelope(answerPayloadSchema),
  "patch:vote": envelope(patchVotePayloadSchema),
  "result:replay": envelope(emptyPayloadSchema),
  "room:newGroup": envelope(emptyPayloadSchema),
  "player:leave": envelope(emptyPayloadSchema),
} as const;

export type ClientEventName = keyof typeof CLIENT_EVENT_SCHEMAS;

/** Max accepted raw payload size (bytes) — enforced by the server transport. */
export const MAX_PAYLOAD_BYTES = 8 * 1024;
