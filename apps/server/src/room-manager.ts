/**
 * Authoritative room + match manager. This owns ALL game truth (membership,
 * phase, deadlines, private assignment, answers, contradictions, scoring,
 * result release). Clients only submit intents. It is deliberately transport-
 * agnostic and clock-injectable so it can be driven directly by tests.
 */
import {
  advanceWarehousePhase,
  confirmWarehouseStory,
  createWarehouseCase,
  disconnectWarehousePlayer,
  expireWarehouseAdvisoryDeadline,
  lockWarehouseAnswer,
  reconnectWarehousePlayer,
  setWarehouseDiscussionReady,
  setWarehouseStoryField,
  skipDisconnectedWarehousePlayer,
  startWarehouseQuestion,
  submitWarehouseRankedBallot,
  submitWarehouseStory,
  toWarehousePrivateView,
  toWarehousePublicView,
  type EngineIntent,
  type PublicRoomView,
  type PrivatePlayerView,
  type WarehouseCaseDefinition,
  type WarehousePrivateView,
  type WarehousePublicView,
  type WarehouseState,
  type WarehouseStoryField,
  type WarehouseStructuredValue,
} from "@al-riwayah/game-engine";
import { getCase, DEFAULT_CASE_ID } from "@al-riwayah/content";
import type { RoomSettings, SafeError, SafeErrorCode, ServerAck } from "@al-riwayah/protocol";
import { safeError } from "@al-riwayah/protocol";
import { RateLimiter } from "./rate-limit";
import {
  generateRecoveryToken,
  generateRoomCode,
  hashToken,
  randomId,
  verifyToken,
} from "./tokens";
import type { Logger } from "./redact-log";
import { createLogger } from "./redact-log";

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 6;
const IDEMPOTENCY_CAP = 200;

interface IdempotencyEntry {
  intentKey: string;
  ack: ServerAck;
}

interface ServerPlayer {
  id: string;
  name: string;
  joinOrder: number;
  ready: boolean;
  connected: boolean;
  disconnectedAt: number | null;
  isHost: boolean;
  sessionHash: string;
  socketId: string | null;
  idempotency: Map<string, IdempotencyEntry>;
}

export type WarehouseManagerIntent =
  | {
      type: "WAREHOUSE_STORY_SET";
      playerId: string;
      field: WarehouseStoryField;
      value: WarehouseStructuredValue;
    }
  | { type: "WAREHOUSE_STORY_SUBMIT"; playerId: string }
  | { type: "WAREHOUSE_STORY_REVIEW"; playerId: string }
  | { type: "WAREHOUSE_START_QUESTION"; playerId: string }
  | { type: "WAREHOUSE_ADVANCE"; playerId: string }
  | {
      type: "WAREHOUSE_ANSWER";
      playerId: string;
      questionInstanceId: string;
      optionId: string;
    }
  | { type: "WAREHOUSE_DISCUSSION_READY"; playerId: string }
  | { type: "WAREHOUSE_BALLOT"; playerId: string; rankedOptionIds: readonly string[] };

export interface Room {
  id: string;
  code: string;
  status: "lobby" | "active" | "results" | "expired";
  caseId: string;
  settings: RoomSettings;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  seed: string;
  players: ServerPlayer[];
  match: WarehouseState | null;
}

export interface CreateResult {
  roomCode: string;
  playerId: string;
  recoveryToken: string;
  isHost: boolean;
}

export type ManagerResult<T> = { ok: true; data: T } | { ok: false; error: SafeError };

const DEFAULT_SETTINGS: RoomSettings = {
  soundDefault: true,
  motionDefault: true,
  extendedPlanning: false,
};

export interface RoomManagerOptions {
  now?: () => number;
  ttlMs?: number;
  maxLifetimeMs?: number;
  logger?: Logger;
  phaseDurationScale?: number;
  /** Test-only injection for reproducible authored assignments. */
  seedFactory?: () => string;
  /** Test-only isolation: avoids cross-test pollution in one long-lived E2E server. */
  disableRateLimits?: boolean;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  /** Short-lived tombstones let joiners distinguish an expired code from a typo. */
  private expiredCodes = new Map<string, number>();
  private now: () => number;
  private ttlMs: number;
  private maxLifetimeMs: number;
  private limiter: RateLimiter;
  private log: Logger;
  private seedFactory: () => string;
  private rateLimitsEnabled: boolean;

  constructor(opts: RoomManagerOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? 30 * 60 * 1000;
    this.maxLifetimeMs = opts.maxLifetimeMs ?? 2 * 60 * 60 * 1000;
    this.limiter = new RateLimiter(this.now);
    this.log = opts.logger ?? createLogger();
    this.seedFactory = opts.seedFactory ?? (() => randomId("seed"));
    this.rateLimitsEnabled = opts.disableRateLimits !== true;
  }

  // --- helpers ---

  private err<T>(code: SafeErrorCode, message?: string): ManagerResult<T> {
    return { ok: false, error: safeError(code, message) };
  }

  private touch(room: Room): void {
    const t = this.now();
    room.lastActivityAt = t;
    room.expiresAt = Math.min(room.createdAt + this.maxLifetimeMs, t + this.ttlMs);
  }

  private resolveCase(caseId: string): WarehouseCaseDefinition | undefined {
    return getCase(caseId);
  }

  private toEnginePlayers(room: Room) {
    return room.players
      .slice()
      .sort((a, b) => a.joinOrder - b.joinOrder)
      .map((p) => ({
        id: p.id,
        name: p.name,
        joinOrder: p.joinOrder,
        connected: p.connected,
        ready: p.ready,
        isHost: p.isHost,
      }));
  }

  private initializeWarehouseMatch(room: Room): WarehouseState {
    const definition = this.resolveCase(room.caseId)!;
    const orderedPlayers = this.toEnginePlayers(room);
    const firstPlayerId = orderedPlayers[0]!.id;
    const firstLocation = definition.storyOptions.locations[0]!.id;
    return createWarehouseCase({
      definition,
      sessionId: randomId("match"),
      players: orderedPlayers,
      now: this.now(),
      sharedStory: {
        entryReason: definition.storyOptions.entryReasons[0]!.id,
        entryRoute: definition.storyOptions.entryRoutes[0]!.id,
        keyHolderInitial: firstPlayerId,
        location2346: Object.fromEntries(
          orderedPlayers.map((candidate) => [candidate.id, firstLocation]),
        ),
        carPurpose: definition.storyOptions.carPurposes[0]!.id,
        carDepartureExpected: true,
      },
    });
  }

  /** Mirror server player connection state into the live Warehouse match. */
  private syncMatchPlayers(room: Room): void {
    if (!room.match) return;
    room.match = {
      ...room.match,
      players: room.match.players.map((matchPlayer) => {
        const serverPlayer = room.players.find((player) => player.id === matchPlayer.id);
        return serverPlayer
          ? { ...matchPlayer, connected: serverPlayer.connected }
          : matchPlayer;
      }),
    };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  private uniqueCode(): string {
    for (let len = 4; len <= 6; len++) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const code = generateRoomCode(len);
        if (!this.rooms.has(code)) return code;
      }
    }
    throw new Error("Unable to allocate room code");
  }

  private newPlayer(name: string, joinOrder: number, isHost: boolean): {
    player: ServerPlayer;
    recoveryToken: string;
  } {
    const recoveryToken = generateRecoveryToken();
    const player: ServerPlayer = {
      id: randomId("p"),
      name,
      joinOrder,
      ready: false,
      connected: true,
      disconnectedAt: null,
      isHost,
      sessionHash: hashToken(recoveryToken),
      socketId: null,
      idempotency: new Map(),
    };
    return { player, recoveryToken };
  }

  // --- lifecycle ---

  createRoom(params: {
    hostName: string;
    caseId?: string;
    settings?: Partial<RoomSettings>;
    ip: string;
  }): ManagerResult<CreateResult> {
    if (this.rateLimitsEnabled && !this.limiter.check("create", params.ip)) {
      return this.err("RATE_LIMITED");
    }
    const caseId = params.caseId ?? DEFAULT_CASE_ID;
    if (!this.resolveCase(caseId)) return this.err("ACTION_NOT_ALLOWED", "unknown case");

    const t = this.now();
    const code = this.uniqueCode();
    const { player, recoveryToken } = this.newPlayer(params.hostName, 0, true);
    const room: Room = {
      id: randomId("room"),
      code,
      status: "lobby",
      caseId,
      settings: { ...DEFAULT_SETTINGS, ...params.settings },
      createdAt: t,
      lastActivityAt: t,
      expiresAt: t + this.ttlMs,
      seed: this.seedFactory(),
      players: [player],
      match: null,
    };
    this.rooms.set(code, room);
    this.log.log("info", "room_created", { roomId: room.id });
    return { ok: true, data: { roomCode: code, playerId: player.id, recoveryToken, isHost: true } };
  }

  joinRoom(params: { code: string; name: string; ip: string }): ManagerResult<CreateResult> {
    if (this.rateLimitsEnabled && !this.limiter.check("join", params.ip)) {
      return this.err("RATE_LIMITED");
    }
    const room = this.getRoom(params.code);
    if (!room) {
      const tombstoneUntil = this.expiredCodes.get(params.code.toUpperCase());
      return this.err(tombstoneUntil && tombstoneUntil > this.now() ? "ROOM_EXPIRED" : "ROOM_NOT_FOUND");
    }
    if (room.status === "expired") return this.err("ROOM_EXPIRED");
    if (room.status !== "lobby") return this.err("MATCH_STARTED");
    if (room.players.length >= MAX_PLAYERS) return this.err("ROOM_FULL");
    if (room.players.some((p) => p.name.toLowerCase() === params.name.toLowerCase()))
      return this.err("NAME_TAKEN");

    const joinOrder = room.players.length;
    const { player, recoveryToken } = this.newPlayer(params.name, joinOrder, false);
    room.players.push(player);
    this.touch(room);
    this.log.log("info", "room_joined", { roomId: room.id, joinOrder });
    return {
      ok: true,
      data: { roomCode: room.code, playerId: player.id, recoveryToken, isHost: false },
    };
  }

  setReady(params: { code: string; playerId: string; ready: boolean }): ManagerResult<null> {
    const room = this.getRoom(params.code);
    if (!room) return this.err("ROOM_NOT_FOUND");
    if (room.status !== "lobby") return this.err("MATCH_STARTED");
    const player = room.players.find((p) => p.id === params.playerId);
    if (!player) return this.err("SESSION_INVALID");
    player.ready = params.ready;
    this.touch(room);
    return { ok: true, data: null };
  }

  startMatch(params: { code: string; playerId: string }): ManagerResult<null> {
    const room = this.getRoom(params.code);
    if (!room) return this.err("ROOM_NOT_FOUND");
    const player = room.players.find((p) => p.id === params.playerId);
    if (!player) return this.err("SESSION_INVALID");
    if (!player.isHost) return this.err("NOT_HOST");
    // Idempotent: a second start once active is a no-op success.
    if (room.status !== "lobby") return { ok: true, data: null };
    if (room.players.length < MIN_PLAYERS) return this.err("NOT_READY", "need at least 4 players");
    if (room.players.length > MAX_PLAYERS) return this.err("ROOM_FULL");
    if (!room.players.every((p) => p.ready)) return this.err("NOT_READY");

    room.match = this.initializeWarehouseMatch(room);
    room.status = "active";
    this.touch(room);
    this.log.log("info", "match_started", { roomId: room.id, players: room.players.length });
    return { ok: true, data: null };
  }

  // --- reconnect / host transfer ---

  restore(params: { recoveryToken: string }): ManagerResult<{
    roomCode: string;
    playerId: string;
    rotatedToken: string;
  }> {
    for (const room of this.rooms.values()) {
      if (room.status === "expired") continue;
      for (const player of room.players) {
        if (verifyToken(params.recoveryToken, player.sessionHash)) {
          const rotated = generateRecoveryToken();
          if (room.match) {
            room.match = reconnectWarehousePlayer(room.match, player.id, this.now());
          }
          player.sessionHash = hashToken(rotated);
          player.connected = true;
          player.disconnectedAt = null;
          this.syncMatchPlayers(room);
          this.touch(room);
          this.log.log("info", "session_restored", { roomId: room.id });
          return { ok: true, data: { roomCode: room.code, playerId: player.id, rotatedToken: rotated } };
        }
      }
    }
    return this.err("SESSION_INVALID");
  }

  allowRestoreAttempt(identity: string): boolean {
    return !this.rateLimitsEnabled || this.limiter.check("restore", identity);
  }

  identifyRecoveryToken(recoveryToken: string): { roomCode: string; playerId: string } | null {
    for (const room of this.rooms.values()) {
      if (room.status === "expired") continue;
      for (const player of room.players) {
        if (verifyToken(recoveryToken, player.sessionHash)) {
          return { roomCode: room.code, playerId: player.id };
        }
      }
    }
    return null;
  }

  bindSocket(code: string, playerId: string, socketId: string): string | null {
    const room = this.getRoom(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (room && player) {
      for (const candidateRoom of this.rooms.values()) {
        for (const candidatePlayer of candidateRoom.players) {
          if (
            candidatePlayer.socketId !== socketId ||
            (candidateRoom.code === room.code && candidatePlayer.id === player.id)
          ) {
            continue;
          }
          candidatePlayer.socketId = null;
          candidatePlayer.connected = false;
          candidatePlayer.disconnectedAt = this.now();
          if (candidateRoom.match) {
            candidateRoom.match = disconnectWarehousePlayer(
              candidateRoom.match,
              candidatePlayer.id,
              candidatePlayer.disconnectedAt,
            );
          }
          if (candidatePlayer.isHost) this.transferHost(candidateRoom, candidatePlayer.id);
          this.syncMatchPlayers(candidateRoom);
        }
      }
      const previousSocketId = player.socketId;
      if (room.match) {
        room.match = reconnectWarehousePlayer(room.match, player.id, this.now());
      }
      player.socketId = socketId;
      player.connected = true;
      player.disconnectedAt = null;
      this.syncMatchPlayers(room);
      return previousSocketId;
    }
    return null;
  }

  /** Handle a socket dropping. Marks disconnected and transfers host if needed. */
  handleDisconnect(socketId: string): { code: string } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (!player) continue;
      player.connected = false;
      player.disconnectedAt = this.now();
      if (room.match) {
        room.match = disconnectWarehousePlayer(room.match, player.id, player.disconnectedAt);
      }
      player.socketId = null;
      if (player.isHost) this.transferHost(room, player.id);
      this.syncMatchPlayers(room);
      this.log.log("info", "player_disconnected", { roomId: room.id });
      return { code: room.code };
    }
    return null;
  }

  private transferHost(room: Room, leavingHostId: string): void {
    const next = room.players
      .filter((p) => p.id !== leavingHostId && p.connected)
      .sort((a, b) => a.joinOrder - b.joinOrder)[0];
    if (next) {
      for (const p of room.players) p.isHost = p.id === next.id;
      this.log.log("info", "host_transferred", { roomId: room.id });
    }
  }

  // --- gameplay intents ---

  private applyWarehouseIntent(
    room: Room,
    player: ServerPlayer,
    intent: WarehouseManagerIntent | EngineIntent,
    now: number,
  ): WarehouseState {
    const state = room.match!;
    const definition = this.resolveCase(room.caseId)!;
    switch (intent.type) {
      case "WAREHOUSE_STORY_SET":
        return setWarehouseStoryField(
          state,
          definition,
          intent.field,
          intent.value,
          player.id,
          now,
        );
      case "WAREHOUSE_STORY_SUBMIT":
        return player.isHost ? submitWarehouseStory(state, now) : state;
      case "WAREHOUSE_STORY_REVIEW": {
        const confirmed = confirmWarehouseStory(state, player.id, now);
        if (confirmed === state) return state;
        return advanceWarehousePhase(confirmed, definition, now);
      }
      case "WAREHOUSE_START_QUESTION":
        return startWarehouseQuestion(state, player.id, now);
      case "WAREHOUSE_ADVANCE":
      case "ACKNOWLEDGE":
        return player.isHost ? advanceWarehousePhase(state, definition, now) : state;
      case "WAREHOUSE_ANSWER": {
        const privateView = toWarehousePrivateView(state, player.id);
        if (privateView?.question?.instanceId !== intent.questionInstanceId) return state;
        const answered = lockWarehouseAnswer(state, player.id, intent.optionId, now);
        if (answered === state) return state;
        return advanceWarehousePhase(answered, definition, now);
      }
      case "ANSWER": {
        const privateView = toWarehousePrivateView(state, player.id);
        if (privateView?.question?.instanceId !== intent.questionInstanceId) return state;
        const answered = lockWarehouseAnswer(state, player.id, intent.optionId, now);
        if (answered === state) return state;
        return advanceWarehousePhase(answered, definition, now);
      }
      case "WAREHOUSE_DISCUSSION_READY": {
        const ready = setWarehouseDiscussionReady(state, player.id, now);
        if (ready === state) return state;
        return advanceWarehousePhase(ready, definition, now);
      }
      case "WAREHOUSE_BALLOT": {
        const submitted = submitWarehouseRankedBallot(
          state,
          { playerId: player.id, rankedOptionIds: intent.rankedOptionIds },
          now,
        );
        if (submitted === state) return state;
        return advanceWarehousePhase(submitted, definition, now);
      }
      default:
        return state;
    }
  }

  gameIntent(params: {
    code: string;
    playerId: string;
    requestId: string;
    phaseRevision?: number;
    intent: WarehouseManagerIntent | EngineIntent;
  }): ServerAck {
    const { requestId } = params;
    const fail = (error: SafeError): ServerAck => ({ ok: false, requestId, error });

    const room = this.getRoom(params.code);
    if (!room || room.status === "expired") return fail(safeError("ROOM_NOT_FOUND"));
    const player = room.players.find((p) => p.id === params.playerId);
    if (!player) return fail(safeError("SESSION_INVALID"));

    // Idempotency: identical requestId+payload replays the prior ack; a reused
    // id with a different payload is rejected and logged (no payload echoed).
    const intentKey = JSON.stringify(params.intent);
    const cached = player.idempotency.get(requestId);
    if (cached) {
      if (cached.intentKey === intentKey) return cached.ack;
      this.log.log("warn", "requestId_reuse_mismatch", { roomId: room.id });
      return fail(safeError("INVALID_PAYLOAD"));
    }

    if (this.rateLimitsEnabled && !this.limiter.check("intent", player.id)) {
      return fail(safeError("RATE_LIMITED"));
    }
    if (!room.match) return fail(safeError("INVALID_PHASE"));

    if (
      params.phaseRevision === undefined ||
      params.phaseRevision !== room.match.phaseRevision
    ) {
      return fail(safeError("STALE_REVISION"));
    }
    const now = this.now();
    const updated = this.applyWarehouseIntent(room, player, params.intent, now);
    if (updated === room.match) {
      const code =
        params.intent.type === "WAREHOUSE_ANSWER" || params.intent.type === "ANSWER"
          ? "ANSWER_ALREADY_LOCKED"
          : "ACTION_NOT_ALLOWED";
      return fail(safeError(code));
    }
    room.match = updated;

    this.touch(room);
    if (room.match.phase === "RESULT_REVEAL") room.status = "results";

    const ack: ServerAck = { ok: true, requestId, data: {} };
    this.storeIdempotency(player, requestId, { intentKey, ack });
    return ack;
  }

  skipDisconnectedPlayer(params: {
    code: string;
    hostPlayerId: string;
    targetPlayerId: string;
    requestId: string;
    phaseRevision: number;
  }): ServerAck {
    const fail = (code: SafeErrorCode): ServerAck => ({
      ok: false,
      requestId: params.requestId,
      error: safeError(code),
    });
    const room = this.getRoom(params.code);
    if (!room?.match) return fail("INVALID_PHASE");
    const host = room.players.find((player) => player.id === params.hostPlayerId);
    if (!host) return fail("SESSION_INVALID");
    if (!host.isHost) return fail("NOT_HOST");
    const intentKey = JSON.stringify({
      type: "WAREHOUSE_SKIP_DISCONNECTED",
      targetPlayerId: params.targetPlayerId,
    });
    const cached = host.idempotency.get(params.requestId);
    if (cached) {
      return cached.intentKey === intentKey ? cached.ack : fail("INVALID_PAYLOAD");
    }
    if (this.rateLimitsEnabled && !this.limiter.check("intent", host.id)) {
      return fail("RATE_LIMITED");
    }
    if (params.phaseRevision !== room.match.phaseRevision) return fail("STALE_REVISION");

    const updated = skipDisconnectedWarehousePlayer(
      room.match,
      params.targetPlayerId,
      this.now(),
    );
    if (updated === room.match) return fail("ACTION_NOT_ALLOWED");
    room.match = advanceWarehousePhase(updated, this.resolveCase(room.caseId)!, this.now());
    this.touch(room);
    const ack: ServerAck = { ok: true, requestId: params.requestId, data: {} };
    this.storeIdempotency(host, params.requestId, { intentKey, ack });
    return ack;
  }

  private storeIdempotency(player: ServerPlayer, requestId: string, entry: IdempotencyEntry): void {
    player.idempotency.set(requestId, entry);
    if (player.idempotency.size > IDEMPOTENCY_CAP) {
      const oldest = player.idempotency.keys().next().value;
      if (oldest !== undefined) player.idempotency.delete(oldest);
    }
  }

  // --- results actions ---

  replay(params: { code: string; playerId: string }): ManagerResult<null> {
    const room = this.getRoom(params.code);
    if (!room) return this.err("ROOM_NOT_FOUND");
    const player = room.players.find((p) => p.id === params.playerId);
    if (!player) return this.err("SESSION_INVALID");
    if (!player.isHost) return this.err("NOT_HOST");
    if (room.status !== "results") return this.err("INVALID_PHASE");

    // Full reset: new seed, cleared private state, back to an active match.
    room.seed = this.seedFactory();
    for (const p of room.players) {
      p.ready = true;
      p.idempotency.clear();
    }
    room.match = this.initializeWarehouseMatch(room);
    room.status = "active";
    this.touch(room);
    return { ok: true, data: null };
  }

  newGroup(params: { code: string; playerId: string }): ManagerResult<CreateResult> {
    const room = this.getRoom(params.code);
    if (!room) return this.err("ROOM_NOT_FOUND");
    const player = room.players.find((p) => p.id === params.playerId);
    if (!player) return this.err("SESSION_INVALID");
    if (!player.isHost) return this.err("NOT_HOST");
    if (room.status !== "results") return this.err("INVALID_PHASE");
    return this.createRoom({ hostName: player.name, caseId: room.caseId, settings: room.settings, ip: "internal" });
  }

  // --- timing / cleanup ---

  /** Mark advisory timers elapsed without choosing, submitting, or advancing. */
  tick(): string[] {
    const now = this.now();
    const changed = new Set<string>();
    for (const room of this.rooms.values()) {
      if (room.status !== "active" || !room.match) continue;
      const before = room.match;
      room.match = expireWarehouseAdvisoryDeadline(room.match, now);
      if (room.match !== before) {
        changed.add(room.code);
      }
    }
    return [...changed];
  }

  cleanupExpired(): string[] {
    const now = this.now();
    const removed: string[] = [];
    for (const [code, room] of this.rooms) {
      if (now > room.expiresAt) {
        room.status = "expired";
        // Wipe private state on expiry.
        room.match = null;
        room.players.forEach((p) => (p.idempotency = new Map()));
        this.rooms.delete(code);
        this.expiredCodes.set(code, now + this.ttlMs);
        removed.push(code);
      }
    }
    for (const [code, expiresAt] of this.expiredCodes) {
      if (expiresAt <= now) this.expiredCodes.delete(code);
    }
    if (removed.length) this.limiter.sweep();
    return removed;
  }

  // --- views ---

  publicView(code: string): PublicRoomView | (WarehousePublicView & {
    protocolVersion: 1;
    roomCode: string;
    deadlineAt: number | null;
    serverTime: number;
    caseId: string;
    caseVersion: string;
  }) | null {
    const room = this.getRoom(code);
    if (!room) return null;
    const gameCase = this.resolveCase(room.caseId)!;
    if (!room.match) {
      return this.lobbyPublicView(room, gameCase);
    }
    const view = toWarehousePublicView(room.match, gameCase);
    return {
      ...view,
      protocolVersion: 1,
      roomCode: room.code,
      deadlineAt: view.advisoryDeadlineAt,
      serverTime: this.now(),
      caseId: room.caseId,
      caseVersion: gameCase.version,
    };
  }

  private lobbyPublicView(room: Room, gameCase: WarehouseCaseDefinition): PublicRoomView {
    return {
      protocolVersion: 1,
      roomCode: room.code,
      phase: "LOBBY",
      phaseRevision: 0,
      deadlineAt: null,
      serverTime: this.now(),
      caseId: room.caseId,
      caseVersion: gameCase.version,
      players: room.players
        .slice()
        .sort((a, b) => a.joinOrder - b.joinOrder)
        .map((p) => ({
          id: p.id,
          name: p.name,
          joinOrder: p.joinOrder,
          ready: p.ready,
          connected: p.connected,
          isHost: p.isHost,
        })),
      releasedStory: {},
      evidence: [],
      releasedContradiction: null,
      patchOptions: null,
      commitments: [],
      result: null,
    };
  }

  privateView(code: string, playerId: string): PrivatePlayerView | (WarehousePrivateView & {
    protocolVersion: 1;
    isHost: boolean;
    connected: boolean;
    phaseRevision: number;
  }) | null {
    const room = this.getRoom(code);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;
    if (!room.match) {
      return {
        protocolVersion: 1,
        playerId,
        isHost: player.isHost,
        connected: player.connected,
        phase: "LOBBY",
        phaseRevision: 0,
        privateEvidence: null,
        currentQuestion: null,
        answerLocked: false,
        submittedOptionId: null,
        allowedActions: ["WAIT"],
        ownResultNote: null,
      };
    }
    const view = toWarehousePrivateView(room.match, playerId, player.isHost);
    return view
      ? {
          ...view,
          protocolVersion: 1,
          isHost: player.isHost,
          connected: player.connected,
          phaseRevision: room.match.phaseRevision,
        }
      : null;
  }

  /** Player ids + socket ids for a room, for the gateway to emit to. */
  roomSockets(code: string): { playerId: string; socketId: string | null }[] {
    const room = this.getRoom(code);
    if (!room) return [];
    return room.players.map((p) => ({ playerId: p.id, socketId: p.socketId }));
  }

  roomCount(): number {
    return this.rooms.size;
  }
}
