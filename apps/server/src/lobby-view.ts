import type { PublicRoomView } from "@al-riwayah/game-engine";

export function buildLobbyPublicView(input: {
  roomCode: string;
  caseId: string;
  caseVersion: string;
  serverTime: number;
  players: readonly {
    id: string;
    name: string;
    joinOrder: number;
    ready: boolean;
    connected: boolean;
    isHost: boolean;
  }[];
}): PublicRoomView {
  return {
    protocolVersion: 1,
    roomCode: input.roomCode,
    phase: "LOBBY",
    phaseRevision: 0,
    deadlineAt: null,
    serverTime: input.serverTime,
    caseId: input.caseId,
    caseVersion: input.caseVersion,
    players: input.players
      .slice()
      .sort((a, b) => a.joinOrder - b.joinOrder)
      .map(({ id, name, joinOrder, ready, connected, isHost }) => ({
        id,
        name,
        joinOrder,
        ready,
        connected,
        isHost,
      })),
    releasedStory: {},
    evidence: [],
    releasedContradiction: null,
    patchOptions: null,
    commitments: [],
    result: null,
  };
}
