/**
 * Authoritative room + match manager. This owns ALL game truth (membership,
 * phase, deadlines, private assignment, answers, contradictions, scoring,
 * result release). Clients only submit intents. It is deliberately transport-
 * agnostic and clock-injectable so it can be driven directly by tests.
 */
import {
  advancePhase,
  applyIntent,
  initializeMatch,
  isPhaseComplete,
  toPrivateView,
  toPublicView,
  type EngineIntent,
  type GameCase,
  type MatchState,
  type PlayerState,
  type PublicRoomView,
  type PrivatePlayerView,
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
  isHost: boolean;
  sessionHash: string;
  socketId: string | null;
  idempotency: Map<string, IdempotencyEntry>;
}

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
  match: MatchState | null;
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
  private phaseDurationScale: number;

  constructor(opts: RoomManagerOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? 30 * 60 * 1000;
    this.maxLifetimeMs = opts.maxLifetimeMs ?? 2 * 60 * 60 * 1000;
    this.limiter = new RateLimiter(this.now);
    this.log = opts.logger ?? createLogger();
    this.phaseDurationScale = opts.phaseDurationScale ?? 1;
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

  private resolveCase(caseId: string): GameCase | undefined {
    return getCase(caseId);
  }

  private toEnginePlayers(room: Room): PlayerState[] {
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

  /** Mirror server player connection/host state into the live match. */
  private syncMatchPlayers(room: Room): void {
    if (!room.match) return;
    for (const mp of room.match.players) {
      const sp = room.players.find((p) => p.id === mp.id);
      if (sp) {
        mp.connected = sp.connected;
        mp.isHost = sp.isHost;
        mp.ready = sp.ready;
      }
    }
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
    if (!this.limiter.check("create", params.ip)) return this.err("RATE_LIMITED");
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
      seed: randomId("seed"),
      players: [player],
      match: null,
    };
    this.rooms.set(code, room);
    this.log.log("info", "room_created", { roomId: room.id });
    return { ok: true, data: { roomCode: code, playerId: player.id, recoveryToken, isHost: true } };
  }

  joinRoom(params: { code: string; name: string; ip: string }): ManagerResult<CreateResult> {
    if (!this.limiter.check("join", params.ip)) return this.err("RATE_LIMITED");
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

    const gameCase = this.resolveCase(room.caseId)!;
    room.match = initializeMatch({
      matchId: randomId("match"),
      seed: room.seed,
      gameCase,
      players: this.toEnginePlayers(room),
      now: this.now(),
      extendedPlanning: room.settings.extendedPlanning,
      phaseDurationScale: this.phaseDurationScale,
    });
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
          player.sessionHash = hashToken(rotated);
          player.connected = true;
          this.syncMatchPlayers(room);
          this.touch(room);
          this.log.log("info", "session_restored", { roomId: room.id });
          return { ok: true, data: { roomCode: room.code, playerId: player.id, rotatedToken: rotated } };
        }
      }
    }
    return this.err("SESSION_INVALID");
  }

  bindSocket(code: string, playerId: string, socketId: string): string | null {
    const room = this.getRoom(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (room && player) {
      const previousSocketId = player.socketId;
      player.socketId = socketId;
      player.connected = true;
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

  private mapEngineError(code: string): SafeErrorCode {
    switch (code) {
      case "INVALID_PHASE":
        return "INVALID_PHASE";
      case "ANSWER_ALREADY_LOCKED":
        return "ANSWER_ALREADY_LOCKED";
      case "SESSION_INVALID":
        return "SESSION_INVALID";
      default:
        return "ACTION_NOT_ALLOWED";
    }
  }

  private advanceWhileComplete(room: Room, now: number): void {
    if (!room.match) return;
    const gameCase = this.resolveCase(room.caseId)!;
    let guard = 0;
    while (room.match.phase !== "RESULTS" && isPhaseComplete(room.match, gameCase) && guard < 25) {
      advancePhase(room.match, gameCase, now, { forced: false });
      guard++;
    }
    if (room.match.phase === "RESULTS") room.status = "results";
  }

  gameIntent(params: {
    code: string;
    playerId: string;
    requestId: string;
    phaseRevision?: number;
    intent: EngineIntent;
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

    if (!this.limiter.check("intent", player.id)) return fail(safeError("RATE_LIMITED"));
    if (!room.match) return fail(safeError("INVALID_PHASE"));

    if (params.phaseRevision !== undefined && params.phaseRevision !== room.match.phaseRevision) {
      return fail(safeError("STALE_REVISION"));
    }
    const now = this.now();
    if (room.match.deadlineAt !== null && now > room.match.deadlineAt) {
      return fail(safeError("DEADLINE_PASSED"));
    }

    const result = applyIntent(room.match, this.resolveCase(room.caseId)!, params.intent, now);
    if (!result.ok) return fail(safeError(this.mapEngineError(result.error)));

    this.touch(room);
    this.advanceWhileComplete(room, now);

    const ack: ServerAck = { ok: true, requestId, data: {} };
    this.storeIdempotency(player, requestId, { intentKey, ack });
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
    room.seed = randomId("seed");
    for (const p of room.players) {
      p.ready = true;
      p.idempotency.clear();
    }
    const gameCase = this.resolveCase(room.caseId)!;
    room.match = initializeMatch({
      matchId: randomId("match"),
      seed: room.seed,
      gameCase,
      players: this.toEnginePlayers(room),
      now: this.now(),
      extendedPlanning: room.settings.extendedPlanning,
      phaseDurationScale: this.phaseDurationScale,
    });
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

  /** Advance any room whose deadline passed. Returns codes of changed rooms. */
  tick(): string[] {
    const now = this.now();
    const changed = new Set<string>();
    for (const room of this.rooms.values()) {
      if (room.status !== "active" || !room.match) continue;
      const gameCase = this.resolveCase(room.caseId)!;
      const before = room.match.phaseRevision;
      if (room.match.deadlineAt !== null && now >= room.match.deadlineAt) {
        advancePhase(room.match, gameCase, now, { forced: true });
        this.advanceWhileComplete(room, now);
      } else {
        this.advanceWhileComplete(room, now);
      }
      if (room.match.phaseRevision !== before) {
        if (room.match.phase === "RESULTS") room.status = "results";
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

  publicView(code: string): PublicRoomView | null {
    const room = this.getRoom(code);
    if (!room) return null;
    const gameCase = this.resolveCase(room.caseId)!;
    if (!room.match) {
      return this.lobbyPublicView(room, gameCase);
    }
    return toPublicView(room.match, gameCase, room.code, this.now());
  }

  private lobbyPublicView(room: Room, gameCase: GameCase): PublicRoomView {
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

  privateView(code: string, playerId: string): PrivatePlayerView | null {
    const room = this.getRoom(code);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;
    const gameCase = this.resolveCase(room.caseId)!;
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
    return toPrivateView(room.match, gameCase, playerId);
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
