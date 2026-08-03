import {
  toBankPublicView,
  advanceWarehousePhase,
  disconnectWarehousePlayer,
  expireWarehouseAdvisoryDeadline,
  reconnectWarehousePlayer,
  skipDisconnectedWarehousePlayer,
  toWarehousePrivateView,
  toWarehousePublicView,
  type EngineIntent,
  type BankMatchState,
  type PublicRoomView,
  type PrivatePlayerView,
  type WarehouseCaseDefinition,
  type WarehousePrivateView,
  type WarehousePublicView,
  type WarehouseState,
} from "@al-riwayah/game-engine";
import {
  BANK_AL_SAHA_CASE_ID,
  DEFAULT_CASE_ID,
  bankAlSahaV1,
  warehouseCaseV1,
} from "@al-riwayah/content";
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
import {
  advancePassiveBankPhase,
  applyBankIntent,
  initializeBankMatch,
  toSafeBankPrivateView,
  type BankManagerIntent,
} from "./bank-room-adapter";
import {
  applyWarehouseIntent,
  initializeWarehouseMatch,
  type WarehouseManagerIntent,
} from "./warehouse-room-adapter";
import { buildLobbyPublicView } from "./lobby-view";

export type { BankManagerIntent } from "./bank-room-adapter";
export type { WarehouseManagerIntent } from "./warehouse-room-adapter";
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
  phaseEnteredAt: number;
  players: ServerPlayer[];
  match: WarehouseState | BankMatchState | null;
}
export interface CreateResult {
  roomCode: string;
  playerId: string;
  recoveryToken: string;
  isHost: boolean;
}
export type ManagerResult<T> = { ok: true; data: T } | { ok: false; error: SafeError };
interface CreateRoomParams { hostName: string; caseId?: string; settings?: Partial<RoomSettings>; ip: string }
const DEFAULT_SETTINGS: RoomSettings = { soundDefault: true, motionDefault: true, extendedPlanning: false };
export interface RoomManagerOptions {
  now?: () => number;
  ttlMs?: number;
  maxLifetimeMs?: number;
  logger?: Logger;
  phaseDurationScale?: number;
  seedFactory?: () => string;
  disableRateLimits?: boolean;
  allowLegacyCases?: boolean;
}
export class RoomManager {
  private rooms = new Map<string, Room>();
  private expiredCodes = new Map<string, number>();
  private now: () => number;
  private ttlMs: number;
  private maxLifetimeMs: number;
  private limiter: RateLimiter;
  private log: Logger;
  private seedFactory: () => string;
  private rateLimitsEnabled: boolean;
  private phaseDurationScale: number;
  private allowLegacyCases: boolean;

  constructor(opts: RoomManagerOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? 30 * 60 * 1000;
    this.maxLifetimeMs = opts.maxLifetimeMs ?? 2 * 60 * 60 * 1000;
    this.limiter = new RateLimiter(this.now);
    this.log = opts.logger ?? createLogger();
    this.seedFactory = opts.seedFactory ?? (() => randomId("seed"));
    this.rateLimitsEnabled = opts.disableRateLimits !== true;
    this.phaseDurationScale = opts.phaseDurationScale ?? 1;
    this.allowLegacyCases = opts.allowLegacyCases === true;
  }
  private err<T>(code: SafeErrorCode, message?: string): ManagerResult<T> {
    return { ok: false, error: safeError(code, message) };
  }

  private touch(room: Room): void {
    const t = this.now();
    room.lastActivityAt = t;
    room.expiresAt = Math.min(room.createdAt + this.maxLifetimeMs, t + this.ttlMs);
  }
  private isBankRoom(room: Pick<Room, "caseId">): boolean {
    return room.caseId === BANK_AL_SAHA_CASE_ID;
  }

  private resolveWarehouseCase(caseId: string): WarehouseCaseDefinition | undefined {
    return caseId === warehouseCaseV1.id ? warehouseCaseV1 : undefined;
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
    const definition = this.resolveWarehouseCase(room.caseId)!;
    return initializeWarehouseMatch({
      definition,
      sessionId: randomId("match"),
      players: this.toEnginePlayers(room),
      now: this.now(),
    });
  }
  private initializeBankMatch(room: Room): BankMatchState {
    return initializeBankMatch({
      matchId: randomId("match"),
      seed: room.seed,
      players: this.toEnginePlayers(room),
    });
  }
  private initializeMatch(room: Room): WarehouseState | BankMatchState {
    return this.isBankRoom(room)
      ? this.initializeBankMatch(room)
      : this.initializeWarehouseMatch(room);
  }
  private syncMatchPlayers(room: Room): void {
    if (!room.match) return;
    if (this.isBankRoom(room)) {
      const match = room.match as BankMatchState;
      room.match = {
        ...match,
        players: match.players.map((matchPlayer) => {
          const serverPlayer = room.players.find(({ id }) => id === matchPlayer.id);
          return serverPlayer ? { ...matchPlayer, isHost: serverPlayer.isHost } : matchPlayer;
        }),
      };
      return;
    }
    const match = room.match as WarehouseState;
    room.match = {
      ...match,
      players: match.players.map((matchPlayer) => {
        const serverPlayer = room.players.find((player) => player.id === matchPlayer.id);
        return serverPlayer ? { ...matchPlayer, connected: serverPlayer.connected } : matchPlayer;
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
  private newPlayer(
    name: string,
    joinOrder: number,
    isHost: boolean,
  ): {
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
  createRoom(params: CreateRoomParams): ManagerResult<CreateResult> {
    return this.createRoomForCase(params, this.allowLegacyCases);
  }
  /** Test-only compatibility path. This method is never registered by the public gateway. */
  createLegacyRoom(params: CreateRoomParams & { caseId: string }): ManagerResult<CreateResult> {
    return this.createRoomForCase(params, true);
  }
  private createRoomForCase(
    params: CreateRoomParams,
    allowLegacyCases: boolean,
  ): ManagerResult<CreateResult> {
    if (this.rateLimitsEnabled && !this.limiter.check("create", params.ip)) {
      return this.err("RATE_LIMITED");
    }
    const caseId = params.caseId ?? DEFAULT_CASE_ID;
    if (
      caseId !== BANK_AL_SAHA_CASE_ID &&
      (!allowLegacyCases || !this.resolveWarehouseCase(caseId))
    ) {
      return this.err("ACTION_NOT_ALLOWED", "unknown case");
    }

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
      phaseEnteredAt: t,
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
      return this.err(
        tombstoneUntil && tombstoneUntil > this.now() ? "ROOM_EXPIRED" : "ROOM_NOT_FOUND",
      );
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
    if (room.status !== "lobby") return { ok: true, data: null };
    if (room.players.length < MIN_PLAYERS) return this.err("NOT_READY", "need at least 4 players");
    if (room.players.length > MAX_PLAYERS) return this.err("ROOM_FULL");
    if (!room.players.every((p) => p.ready)) return this.err("NOT_READY");

    room.match = this.initializeMatch(room);
    room.phaseEnteredAt = this.now();
    room.status = "active";
    this.touch(room);
    this.log.log("info", "match_started", { roomId: room.id, players: room.players.length });
    return { ok: true, data: null };
  }

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
          if (room.match && !this.isBankRoom(room)) {
            room.match = reconnectWarehousePlayer(
              room.match as WarehouseState,
              player.id,
              this.now(),
            );
          }
          player.sessionHash = hashToken(rotated);
          player.connected = true;
          player.disconnectedAt = null;
          this.syncMatchPlayers(room);
          this.touch(room);
          this.log.log("info", "session_restored", { roomId: room.id });
          return {
            ok: true,
            data: { roomCode: room.code, playerId: player.id, rotatedToken: rotated },
          };
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
          if (candidateRoom.match && !this.isBankRoom(candidateRoom)) {
            candidateRoom.match = disconnectWarehousePlayer(
              candidateRoom.match as WarehouseState,
              candidatePlayer.id,
              candidatePlayer.disconnectedAt,
            );
          }
          if (candidatePlayer.isHost) this.transferHost(candidateRoom, candidatePlayer.id);
          this.syncMatchPlayers(candidateRoom);
        }
      }
      const previousSocketId = player.socketId;
      if (room.match && !this.isBankRoom(room)) {
        room.match = reconnectWarehousePlayer(room.match as WarehouseState, player.id, this.now());
      }
      player.socketId = socketId;
      player.connected = true;
      player.disconnectedAt = null;
      this.syncMatchPlayers(room);
      return previousSocketId;
    }
    return null;
  }

  handleDisconnect(socketId: string): { code: string } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (!player) continue;
      player.connected = false;
      player.disconnectedAt = this.now();
      if (room.match && !this.isBankRoom(room)) {
        room.match = disconnectWarehousePlayer(
          room.match as WarehouseState,
          player.id,
          player.disconnectedAt,
        );
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

  gameIntent(params: {
    code: string;
    playerId: string;
    requestId: string;
    phaseRevision?: number;
    intent: BankManagerIntent | WarehouseManagerIntent | EngineIntent;
  }): ServerAck {
    const { requestId } = params;
    const fail = (error: SafeError): ServerAck => ({ ok: false, requestId, error });

    const room = this.getRoom(params.code);
    if (!room || room.status === "expired") return fail(safeError("ROOM_NOT_FOUND"));
    const player = room.players.find((p) => p.id === params.playerId);
    if (!player) return fail(safeError("SESSION_INVALID"));

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

    if (params.phaseRevision === undefined || params.phaseRevision !== room.match.phaseRevision) {
      return fail(safeError("STALE_REVISION"));
    }
    const now = this.now();
    let updated: WarehouseState | BankMatchState;
    try {
      updated = this.isBankRoom(room)
        ? applyBankIntent(room.match as BankMatchState, player, params.intent as BankManagerIntent)
        : applyWarehouseIntent({
            state: room.match as WarehouseState,
            definition: this.resolveWarehouseCase(room.caseId)!,
            player,
            intent: params.intent as WarehouseManagerIntent | EngineIntent,
            now,
          });
    } catch {
      return fail(safeError("ACTION_NOT_ALLOWED"));
    }
    if (updated === room.match) {
      const code =
        params.intent.type === "WAREHOUSE_ANSWER" ||
        params.intent.type === "ANSWER" ||
        params.intent.type === "BANK_ANSWER"
          ? "ANSWER_ALREADY_LOCKED"
          : "ACTION_NOT_ALLOWED";
      return fail(safeError(code));
    }
    const previousPhase = room.match.phase;
    room.match = updated;
    if (room.match.phase !== previousPhase) room.phaseEnteredAt = now;

    this.touch(room);
    if (
      room.match.phase === "RESULT_REVEAL" ||
      (this.isBankRoom(room) && room.match.phase === "PLAYER_RANKING")
    ) {
      room.status = "results";
    }

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

    if (this.isBankRoom(room)) return fail("ACTION_NOT_ALLOWED");
    const updated = skipDisconnectedWarehousePlayer(
      room.match as WarehouseState,
      params.targetPlayerId,
      this.now(),
    );
    if (updated === room.match) return fail("ACTION_NOT_ALLOWED");
    room.match = advanceWarehousePhase(
      updated,
      this.resolveWarehouseCase(room.caseId)!,
      this.now(),
    );
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

  replay(params: { code: string; playerId: string }): ManagerResult<null> {
    const room = this.getRoom(params.code);
    if (!room) return this.err("ROOM_NOT_FOUND");
    const player = room.players.find((p) => p.id === params.playerId);
    if (!player) return this.err("SESSION_INVALID");
    if (!player.isHost) return this.err("NOT_HOST");
    if (room.status !== "results") return this.err("INVALID_PHASE");

    room.seed = this.seedFactory();
    for (const p of room.players) {
      p.ready = true;
      p.idempotency.clear();
    }
    room.match = this.initializeMatch(room);
    room.phaseEnteredAt = this.now();
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
    return this.createRoom({
      hostName: player.name,
      caseId: room.caseId,
      settings: room.settings,
      ip: "internal",
    });
  }

  tick(): string[] {
    const now = this.now();
    const changed = new Set<string>();
    for (const room of this.rooms.values()) {
      if (room.status !== "active" || !room.match) continue;
      const before = room.match;
      if (this.isBankRoom(room)) {
        const bank = room.match as BankMatchState;
        room.match = advancePassiveBankPhase(
          bank,
          now - room.phaseEnteredAt,
          this.phaseDurationScale,
        );
        if (room.match.phase !== before.phase) {
          room.phaseEnteredAt = now;
          if (room.match.phase === "PLAYER_RANKING") room.status = "results";
        }
      } else {
        room.match = expireWarehouseAdvisoryDeadline(room.match as WarehouseState, now);
      }
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

  publicView(code: string):
    | PublicRoomView
    | (WarehousePublicView & {
        protocolVersion: 1;
        roomCode: string;
        deadlineAt: number | null;
        serverTime: number;
        caseId: string;
        caseVersion: string;
      })
    | (Omit<ReturnType<typeof toBankPublicView>, "matchId"> & {
        protocolVersion: 1;
        roomCode: string;
        deadlineAt: null;
        serverTime: number;
        caseId: string;
        caseVersion: string;
      })
    | null {
    const room = this.getRoom(code);
    if (!room) return null;
    const gameCase = this.isBankRoom(room) ? bankAlSahaV1 : this.resolveWarehouseCase(room.caseId)!;
    if (!room.match) {
      return buildLobbyPublicView({
        roomCode: room.code,
        caseId: room.caseId,
        caseVersion: gameCase.version,
        serverTime: this.now(),
        players: room.players,
      });
    }
    if (this.isBankRoom(room)) {
      const { matchId: _matchId, ...bankView } = toBankPublicView(
        room.match as BankMatchState,
      );
      return {
        ...bankView,
        protocolVersion: 1,
        roomCode: room.code,
        deadlineAt: null,
        serverTime: this.now(),
        caseId: room.caseId,
        caseVersion: gameCase.version,
      };
    }
    const view = toWarehousePublicView(
      room.match as WarehouseState,
      gameCase as WarehouseCaseDefinition,
    );
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

  privateView(
    code: string,
    playerId: string,
  ):
    | PrivatePlayerView
    | (WarehousePrivateView & {
        protocolVersion: 1;
        isHost: boolean;
        connected: boolean;
        phaseRevision: number;
      })
    | (NonNullable<ReturnType<typeof toSafeBankPrivateView>> & {
        protocolVersion: 1;
        isHost: boolean;
        connected: boolean;
        phaseRevision: number;
      })
    | null {
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
    if (this.isBankRoom(room)) {
      const view = toSafeBankPrivateView(room.match as BankMatchState, playerId);
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
    const view = toWarehousePrivateView(room.match as WarehouseState, playerId, player.isHost);
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

  roomSockets(code: string): { playerId: string; socketId: string | null }[] {
    const room = this.getRoom(code);
    if (!room) return [];
    return room.players.map((p) => ({ playerId: p.id, socketId: p.socketId }));
  }

  roomCount(): number {
    return this.rooms.size;
  }
}
