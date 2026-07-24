"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicRoomView, PrivatePlayerView } from "@al-riwayah/game-engine";
import { emitIntent, getSocket, loadSession, updateToken } from "./game-client";

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
  const [fatal, setFatal] = useState<string | null>(null);
  const revisionRef = useRef(0);

  useEffect(() => {
    const session = loadSession(code);
    if (!session) {
      setFatal("NO_SESSION");
      return;
    }
    const socket = getSocket();

    const onPublic = (v: PublicRoomView) => {
      revisionRef.current = v.phaseRevision;
      setPub(v);
    };
    const onPrivate = (v: PrivatePlayerView) => setPriv(v);
    const onRotated = (d: { recoveryToken: string }) => updateToken(code, d.recoveryToken);
    const onConnect = () => {
      setConnected(true);
      // (Re)bind this socket to the player via the recovery token.
      const s = loadSession(code);
      if (s) void emitIntent("room:restore", { recoveryToken: s.recoveryToken });
    };
    const onDisconnect = () => setConnected(false);

    socket.on("view:public", onPublic);
    socket.on("view:private", onPrivate);
    socket.on("session:rotated", onRotated);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off("view:public", onPublic);
      socket.off("view:private", onPrivate);
      socket.off("session:rotated", onRotated);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
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
  };

  return { pub, priv, connected, fatal, actions };
}
