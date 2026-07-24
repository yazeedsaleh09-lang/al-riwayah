/**
 * Socket.IO gateway. Thin adapter: validate every event with protocol schemas,
 * delegate to the RoomManager (all authority lives there), and emit redacted
 * views. Never trusts client-provided identity beyond the bound session.
 */
import type { Server, Socket } from "socket.io";
import {
  CLIENT_EVENT_SCHEMAS,
  MAX_PAYLOAD_BYTES,
  safeError,
  type ServerAck,
  type SessionCredentials,
} from "@al-riwayah/protocol";
import type { EngineIntent } from "@al-riwayah/game-engine";
import type { RoomManager } from "./room-manager";
import type { Logger } from "./redact-log";

interface SocketState {
  code?: string;
  playerId?: string;
}

type AckFn = (response: ServerAck) => void;

function clientIp(socket: Socket): string {
  const fwd = socket.handshake.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return socket.handshake.address || "unknown";
}

function tooLarge(payload: unknown): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(payload ?? {})) > MAX_PAYLOAD_BYTES;
  } catch {
    return true;
  }
}

/** Broadcast the public view to a room and each player's private view. */
export function emitRoomView(io: Server, manager: RoomManager, code: string): void {
  const pub = manager.publicView(code);
  if (!pub) return;
  for (const { playerId, socketId } of manager.roomSockets(code)) {
    if (!socketId) continue;
    const target = io.sockets.sockets.get(socketId);
    if (!target) continue;
    target.emit("view:public", pub);
    const priv = manager.privateView(code, playerId);
    if (priv) target.emit("view:private", priv);
  }
}

export function registerGateway(io: Server, manager: RoomManager, log: Logger): void {
  const emitRoom = (code: string): void => emitRoomView(io, manager, code);

  io.on("connection", (socket: Socket) => {
    log.log("debug", "socket_connected");
    const state: SocketState = {};

    const guard = <S extends keyof typeof CLIENT_EVENT_SCHEMAS>(
      event: S,
      raw: unknown,
      ack: AckFn | undefined,
    ):
      | { ok: true; value: ReturnType<(typeof CLIENT_EVENT_SCHEMAS)[S]["parse"]> }
      | { ok: false } => {
      const reply = (r: ServerAck) => ack?.(r);
      if (tooLarge(raw)) {
        reply({ ok: false, requestId: "unknown", error: safeError("INVALID_PAYLOAD") });
        return { ok: false };
      }
      const parsed = CLIENT_EVENT_SCHEMAS[event].safeParse(raw);
      if (!parsed.success) {
        const requestId =
          (raw as { requestId?: string } | null)?.requestId ?? "unknown";
        reply({ ok: false, requestId, error: safeError("INVALID_PAYLOAD") });
        return { ok: false };
      }
      return { ok: true, value: parsed.data as never };
    };

    const bindAndReply = (
      result: ReturnType<RoomManager["createRoom"]>,
      requestId: string,
      ack: AckFn | undefined,
    ): void => {
      if (!result.ok) {
        ack?.({ ok: false, requestId, error: result.error });
        return;
      }
      const creds: SessionCredentials = {
        roomCode: result.data.roomCode,
        playerId: result.data.playerId,
        recoveryToken: result.data.recoveryToken,
        isHost: result.data.isHost,
      };
      state.code = creds.roomCode;
      state.playerId = creds.playerId;
      manager.bindSocket(creds.roomCode, creds.playerId, socket.id);
      void socket.join(creds.roomCode);
      ack?.({ ok: true, requestId, data: creds });
      emitRoom(creds.roomCode);
    };

    socket.on("room:create", (raw: unknown, ack?: AckFn) => {
      const g = guard("room:create", raw, ack);
      if (!g.ok) return;
      const { requestId, payload } = g.value;
      const result = manager.createRoom({
        hostName: payload.displayName,
        caseId: payload.caseId,
        settings: payload.settings,
        ip: clientIp(socket),
      });
      bindAndReply(result, requestId, ack);
    });

    socket.on("room:join", (raw: unknown, ack?: AckFn) => {
      const g = guard("room:join", raw, ack);
      if (!g.ok) return;
      const { requestId, payload } = g.value;
      const result = manager.joinRoom({
        code: payload.code,
        name: payload.displayName,
        ip: clientIp(socket),
      });
      bindAndReply(result, requestId, ack);
    });

    socket.on("room:restore", (raw: unknown, ack?: AckFn) => {
      const g = guard("room:restore", raw, ack);
      if (!g.ok) return;
      const { requestId, payload } = g.value;
      const result = manager.restore({ recoveryToken: payload.recoveryToken });
      if (!result.ok) {
        ack?.({ ok: false, requestId, error: result.error });
        return;
      }
      state.code = result.data.roomCode;
      state.playerId = result.data.playerId;
      manager.bindSocket(result.data.roomCode, result.data.playerId, socket.id);
      void socket.join(result.data.roomCode);
      socket.emit("session:rotated", { recoveryToken: result.data.rotatedToken });
      ack?.({
        ok: true,
        requestId,
        data: {
          roomCode: result.data.roomCode,
          playerId: result.data.playerId,
          recoveryToken: result.data.rotatedToken,
          isHost: false,
        },
      });
      emitRoom(result.data.roomCode);
    });

    const requireSession = (requestId: string, ack?: AckFn): SocketState | null => {
      if (!state.code || !state.playerId) {
        ack?.({ ok: false, requestId, error: safeError("SESSION_INVALID") });
        return null;
      }
      return state;
    };

    const simple = (
      event: keyof typeof CLIENT_EVENT_SCHEMAS,
      raw: unknown,
      ack: AckFn | undefined,
      run: (s: { code: string; playerId: string }, payload: unknown, requestId: string) => ServerAck | void,
    ): void => {
      const g = guard(event, raw, ack);
      if (!g.ok) return;
      const { requestId, payload } = g.value as { requestId: string; payload: unknown };
      const s = requireSession(requestId, ack);
      if (!s) return;
      const outcome = run({ code: s.code!, playerId: s.playerId! }, payload, requestId);
      if (outcome) ack?.(outcome);
      emitRoom(s.code!);
    };

    socket.on("player:setReady", (raw: unknown, ack?: AckFn) =>
      simple("player:setReady", raw, ack, (s, payload, requestId) => {
        const r = manager.setReady({ code: s.code, playerId: s.playerId, ready: (payload as { ready: boolean }).ready });
        return r.ok ? { ok: true, requestId, data: {} } : { ok: false, requestId, error: r.error };
      }),
    );

    socket.on("match:start", (raw: unknown, ack?: AckFn) =>
      simple("match:start", raw, ack, (s, _payload, requestId) => {
        const r = manager.startMatch({ code: s.code, playerId: s.playerId });
        return r.ok ? { ok: true, requestId, data: {} } : { ok: false, requestId, error: r.error };
      }),
    );

    const gameplay = (
      event: keyof typeof CLIENT_EVENT_SCHEMAS,
      raw: unknown,
      ack: AckFn | undefined,
      toIntent: (playerId: string, payload: unknown) => EngineIntent,
    ): void => {
      const g = guard(event, raw, ack);
      if (!g.ok) return;
      const env = g.value as { requestId: string; phaseRevision?: number; payload: unknown };
      const s = requireSession(env.requestId, ack);
      if (!s) return;
      const outcome = manager.gameIntent({
        code: s.code!,
        playerId: s.playerId!,
        requestId: env.requestId,
        phaseRevision: env.phaseRevision,
        intent: toIntent(s.playerId!, env.payload),
      });
      ack?.(outcome);
      emitRoom(s.code!);
    };

    socket.on("phase:acknowledge", (raw: unknown, ack?: AckFn) =>
      gameplay("phase:acknowledge", raw, ack, (playerId) => ({ type: "ACKNOWLEDGE", playerId })),
    );
    socket.on("story:propose", (raw: unknown, ack?: AckFn) =>
      gameplay("story:propose", raw, ack, (playerId, payload) => ({
        type: "STORY_PROPOSE",
        playerId,
        fieldId: (payload as { fieldId: string }).fieldId,
        value: (payload as { value: string }).value,
      })),
    );
    socket.on("story:confirm", (raw: unknown, ack?: AckFn) =>
      gameplay("story:confirm", raw, ack, (playerId, payload) => ({
        type: "STORY_CONFIRM",
        playerId,
        fieldId: (payload as { fieldId: string }).fieldId,
      })),
    );
    socket.on("answer:submit", (raw: unknown, ack?: AckFn) =>
      gameplay("answer:submit", raw, ack, (playerId, payload) => ({
        type: "ANSWER",
        playerId,
        questionInstanceId: (payload as { questionInstanceId: string }).questionInstanceId,
        optionId: (payload as { optionId: string }).optionId,
      })),
    );
    socket.on("patch:vote", (raw: unknown, ack?: AckFn) =>
      gameplay("patch:vote", raw, ack, (playerId, payload) => ({
        type: "PATCH_VOTE",
        playerId,
        patchId: (payload as { patchId: string }).patchId,
      })),
    );

    socket.on("result:replay", (raw: unknown, ack?: AckFn) =>
      simple("result:replay", raw, ack, (s, _payload, requestId) => {
        const r = manager.replay({ code: s.code, playerId: s.playerId });
        return r.ok ? { ok: true, requestId, data: {} } : { ok: false, requestId, error: r.error };
      }),
    );

    socket.on("disconnect", () => {
      const changed = manager.handleDisconnect(socket.id);
      if (changed) emitRoom(changed.code);
    });
  });
}
