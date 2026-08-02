"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PublicRoomView,
  PrivatePlayerView,
  WarehousePublicView,
  WarehousePrivateView,
} from "@al-riwayah/game-engine";
import { createNewGroup, emitIntent, getSocket, loadSession, updateToken } from "./game-client";
import type { ConnectionStage, SessionInfo } from "./game-client";

type WarehousePublicShell = WarehousePublicView & {
  protocolVersion?: 1;
  roomCode: string;
  deadlineAt: number | null;
  serverTime: number;
  caseId: string;
  caseVersion?: string;
};

type WarehousePrivateShell = WarehousePrivateView & {
  protocolVersion?: 1;
  isHost?: boolean;
  connected?: boolean;
  phaseRevision?: number;
};

export interface RoomState {
  publicView: PublicRoomView | WarehousePublicShell | null;
  privateView: PrivatePlayerView | WarehousePrivateShell | null;
  connected: boolean;
  fatal: string | null;
  playerId: string | null;
}

async function checkedIntent<T = unknown>(
  event: string,
  payload: unknown,
  extra: Record<string, unknown> = {},
): Promise<T> {
  const ack = await emitIntent<T>(event, payload, extra);
  if (!ack.ok) throw new Error(ack.error.code);
  return ack.data;
}

export function useGameRoom(code: string) {
  const [pub, setPub] = useState<PublicRoomView | WarehousePublicShell | null>(null);
  const [priv, setPriv] = useState<PrivatePlayerView | WarehousePrivateShell | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStage, setConnectionStage] = useState<ConnectionStage>("connecting");
  const [fatal, setFatal] = useState<string | null>(null);
  const revisionRef = useRef(0);

  useEffect(() => {
    const session = loadSession(code);
    if (!session) {
      setFatal("NO_SESSION");
      return;
    }
    const socket = getSocket();
    let unavailableTimer: ReturnType<typeof setTimeout> | null = null;
    const startUnavailableTimer = () => {
      if (unavailableTimer) return;
      unavailableTimer = setTimeout(() => {
        setFatal((current) => current ?? "SERVER_UNAVAILABLE");
      }, 75_000);
    };
    const clearUnavailableTimer = () => {
      if (unavailableTimer) clearTimeout(unavailableTimer);
      unavailableTimer = null;
    };

    const onPublic = (v: PublicRoomView | WarehousePublicShell) => {
      revisionRef.current = v.phaseRevision;
      setPub(v);
    };
    const onPrivate = (v: PrivatePlayerView | WarehousePrivateShell) => setPriv(v);
    const onRotated = (d: { recoveryToken: string }) => updateToken(code, d.recoveryToken);
    const onReplaced = () => setFatal("SESSION_REPLACED");
    const onConnectError = () => {
      setConnected(false);
      setConnectionStage("retrying");
      startUnavailableTimer();
    };
    const restoreSession = async () => {
      const current = loadSession(code);
      if (!current) {
        setFatal("NO_SESSION");
        return;
      }
      const ack = await emitIntent<Partial<SessionInfo> & { synced?: boolean }>("room:restore", {
        recoveryToken: current.recoveryToken,
      });
      if (ack.ok) {
        if (ack.data.recoveryToken) updateToken(code, ack.data.recoveryToken);
        return;
      }
      setFatal(ack.error.code === "SESSION_INVALID" ? "NO_SESSION" : "SERVER_UNAVAILABLE");
    };
    const onConnect = () => {
      clearUnavailableTimer();
      setConnected(true);
      setConnectionStage("ready");
      setFatal(null);
      // (Re)bind this socket to the player via the recovery token.
      void restoreSession();
    };
    const onDisconnect = () => {
      setConnected(false);
      setConnectionStage("retrying");
      startUnavailableTimer();
    };
    const onBrowserOffline = () => onDisconnect();
    const onBrowserOnline = () => {
      setConnectionStage("connecting");
      if (!socket.connected) socket.connect();
    };

    socket.on("view:public", onPublic);
    socket.on("view:private", onPrivate);
    socket.on("session:rotated", onRotated);
    socket.on("connection:replaced", onReplaced);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    window.addEventListener("offline", onBrowserOffline);
    window.addEventListener("online", onBrowserOnline);

    if (socket.connected) onConnect();
    else startUnavailableTimer();

    return () => {
      socket.off("view:public", onPublic);
      socket.off("view:private", onPrivate);
      socket.off("session:rotated", onRotated);
      socket.off("connection:replaced", onReplaced);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      window.removeEventListener("offline", onBrowserOffline);
      window.removeEventListener("online", onBrowserOnline);
      clearUnavailableTimer();
    };
  }, [code]);

  const withRev = useCallback(
    (event: string, payload: unknown) =>
      checkedIntent(event, payload, { phaseRevision: revisionRef.current }),
    [],
  );

  const actions = {
    setReady: (ready: boolean) => checkedIntent("player:setReady", { ready }),
    start: () => checkedIntent("match:start", {}),
    acknowledge: () => withRev("phase:acknowledge", {}),
    propose: (fieldId: string, value: string) => withRev("story:propose", { fieldId, value }),
    confirm: (fieldId: string) => withRev("story:confirm", { fieldId }),
    setStory: (fieldId: string, value: string | boolean, targetPlayerId?: string) =>
      withRev("story:set", { fieldId, value, ...(targetPlayerId ? { targetPlayerId } : {}) }),
    submitStory: () => withRev("story:submit", {}),
    reviewStory: () => withRev("story:review", {}),
    startQuestion: () => withRev("question:start", {}),
    answer: (questionInstanceId: string, optionId: string) =>
      withRev("answer:submit", { questionInstanceId, optionId }),
    patchVote: (patchId: string) => withRev("patch:vote", { patchId }),
    discussionReady: () => withRev("discussion:ready", {}),
    rankedBallot: (rankedOptionIds: readonly string[]) =>
      withRev("patch:ballot", { rankedOptionIds }),
    skipPlayer: (playerId: string) => withRev("player:skip", { playerId }),
    replay: () => checkedIntent("result:replay", {}),
    newGroup: () => createNewGroup(code),
  };

  return { pub, priv, connected, connectionStage, fatal, actions };
}
