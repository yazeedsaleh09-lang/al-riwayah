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

/** Gameplay intents always target one exact authoritative phase revision. */
export function gameplayEnvelope<T extends z.ZodTypeAny>(payload: T) {
  return z.object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    requestId: requestIdSchema,
    roomCode: roomCodeSchema.optional(),
    phaseRevision: z.number().int().nonnegative(),
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

export const warehouseStoryFieldSchema = z.enum([
  "entryReason",
  "entryRoute",
  "keyHolderInitial",
  "location2346",
  "carPurpose",
  "carDepartureExpected",
]);

export const warehouseStoryValueSchema = z.union([z.string().min(1).max(120), z.boolean()]);

export const storySetPayloadSchema = z
  .object({
    fieldId: warehouseStoryFieldSchema,
    targetPlayerId: z.string().min(1).max(120).optional(),
    value: warehouseStoryValueSchema,
  })
  .strict();

export const rankedBallotPayloadSchema = z
  .object({
    rankedOptionIds: z
      .array(z.string().min(1).max(200))
      .min(2)
      .max(3)
      .refine((ids) => new Set(ids).size === ids.length, "duplicate ranked option"),
  })
  .strict();

export const skipPlayerPayloadSchema = z
  .object({
    playerId: z.string().min(1).max(120),
  })
  .strict();

export const emptyPayloadSchema = z.object({}).strict();

// Canonical Bank Al-Saha payloads. Authored option/question ids remain data,
// but the fact and repair axes are closed enums so arbitrary state keys cannot
// cross the realtime boundary.
export const bankStoryFactSchema = z.enum([
  "near_bank_reason",
  "alarm_location",
  "vehicle_key_holder",
  "suspicious_object_holder",
  "departure_plan",
  "cafe_door_witness",
  "parking_camera_sightline",
]);

export const bankStoryLockPayloadSchema = z
  .object({
    factId: bankStoryFactSchema,
    optionId: z.string().min(1).max(120),
    targetPlayerId: z.string().min(1).max(120).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const targetsOnePlayer = value.factId === "alarm_location";
    if (targetsOnePlayer !== (value.targetPlayerId !== undefined)) {
      context.addIssue({
        code: "custom",
        message: targetsOnePlayer
          ? "alarm_location requires targetPlayerId"
          : "targetPlayerId is allowed only for alarm_location",
        path: ["targetPlayerId"],
      });
    }
  });

export const bankAnswerPayloadSchema = z
  .object({
    questionId: z.string().min(1).max(200),
    optionId: z.string().min(1).max(200),
  })
  .strict();

export const bankRepairIdSchema = z.enum(["movement", "identity"]);
export const bankRepairVotePayloadSchema = z.object({ repairId: bankRepairIdSchema }).strict();

/** Full envelope schemas keyed by event name. */
export const CLIENT_EVENT_SCHEMAS = {
  "room:create": envelope(createPayloadSchema),
  "room:join": envelope(joinPayloadSchema),
  "room:restore": envelope(restorePayloadSchema),
  "player:setReady": envelope(setReadyPayloadSchema),
  "match:start": envelope(startPayloadSchema),
  "phase:acknowledge": gameplayEnvelope(acknowledgePayloadSchema),
  "story:propose": gameplayEnvelope(proposePayloadSchema),
  "story:confirm": gameplayEnvelope(confirmPayloadSchema),
  "story:set": gameplayEnvelope(storySetPayloadSchema),
  "story:submit": gameplayEnvelope(emptyPayloadSchema),
  "story:review": gameplayEnvelope(emptyPayloadSchema),
  "question:start": gameplayEnvelope(emptyPayloadSchema),
  "answer:submit": gameplayEnvelope(answerPayloadSchema),
  "patch:vote": gameplayEnvelope(patchVotePayloadSchema),
  "discussion:ready": gameplayEnvelope(emptyPayloadSchema),
  "patch:ballot": gameplayEnvelope(rankedBallotPayloadSchema),
  "player:skip": gameplayEnvelope(skipPlayerPayloadSchema),
  "bank:storyLock": gameplayEnvelope(bankStoryLockPayloadSchema),
  "bank:answer": gameplayEnvelope(bankAnswerPayloadSchema),
  "bank:repairVote": gameplayEnvelope(bankRepairVotePayloadSchema),
  "result:replay": envelope(emptyPayloadSchema),
  "room:newGroup": envelope(emptyPayloadSchema),
  "player:leave": envelope(emptyPayloadSchema),
} as const;

export type ClientEventName = keyof typeof CLIENT_EVENT_SCHEMAS;

/** Max accepted raw payload size (bytes) — enforced by the server transport. */
export const MAX_PAYLOAD_BYTES = 8 * 1024;
