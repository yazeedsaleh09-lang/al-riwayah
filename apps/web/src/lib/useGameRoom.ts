"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicRoomView, PrivatePlayerView } from "@al-riwayah/game-engine";
import { createNewGroup, emitIntent, getSocket, loadSession, updateToken } from "./game-client";
import type { ConnectionStage } from "./game-client";

export interface RoomState {
  publicView: PublicRoomView | null;
  privateView: PrivatePlayerView | null;
  connected: boolean;
  fatal: string | null;
  playerId: string | null;
}

export function useGameRoom(code: string) {
  const [pub, setPub] = useState<PublicRoomView | null>(null);
  const [priv, setPriv] = useState<PrivatePlayerView | null>(null);
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

    const onPublic = (v: PublicRoomView) => {
      revisionRef.current = v.phaseRevision;
      setPub(v);
    };
    const onPrivate = (v: PrivatePlayerView) => setPriv(v);
    const onRotated = (d: { recoveryToken: string }) => updateToken(code, d.recoveryToken);
    const onReplaced = () => setFatal("SESSION_REPLACED");
    const onConnectError = () => {
      setConnected(false);
      setConnectionStage("retrying");
      startUnavailableTimer();
    };
    const onConnect = () => {
      clearUnavailableTimer();
      setConnected(true);
      setConnectionStage("ready");
      setFatal(null);
      // (Re)bind this socket to the player via the recovery token.
      const s = loadSession(code);
      if (s) void emitIntent("room:restore", { recoveryToken: s.recoveryToken });
    };
    const onDisconnect = () => {
      setConnected(false);
      setConnectionStage("retrying");
      startUnavailableTimer();
    };

    socket.on("view:public", onPublic);
    socket.on("view:private", onPrivate);
    socket.on("session:rotated", onRotated);
    socket.on("connection:replaced", onReplaced);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);

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
      clearUnavailableTimer();
    };
  }, [code]);

  const withRev = useCallback(
    (event: string, payload: unknown) =>
      emitIntent(event, payload, { phaseRevision: revisionRef.current }),
    [],
  );

  const actions = {
    setReady: (ready: boolean) => emitIntent("player:setReady", { ready }),
    start: () => emitIntent("match:start", {}),
    acknowledge: () => withRev("phase:acknowledge", {}),
    propose: (fieldId: string, value: string) => withRev("story:propose", { fieldId, value }),
    confirm: (fieldId: string) => withRev("story:confirm", { fieldId }),
    answer: (questionInstanceId: string, optionId: string) =>
      withRev("answer:submit", { questionInstanceId, optionId }),
    patchVote: (patchId: string) => withRev("patch:vote", { patchId }),
    replay: () => emitIntent("result:replay", {}),
    newGroup: () => createNewGroup(code),
  };

  return { pub, priv, connected, connectionStage, fatal, actions };
}
