import {
  initializeMatch,
  type AnswerRecord,
  type GameCase,
  type MatchState,
  type PlayerState,
} from "@al-riwayah/game-engine";

export function makePlayers(n: number): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `لاعب ${i + 1}`,
    joinOrder: i,
    connected: true,
    ready: true,
    isHost: i === 0,
  }));
}

/** Build a MatchState with the real case and apply overrides for detection tests. */
export function buildState(
  gameCase: GameCase,
  overrides: Partial<MatchState> = {},
  playerCount = 4,
): MatchState {
  const players = overrides.players ?? makePlayers(playerCount);
  const base = initializeMatch({ matchId: "t", seed: "seed", gameCase, players, now: 1_000_000 });
  return { ...base, ...overrides, players };
}

export function ans(
  playerId: string,
  tag: string,
  normalized: string,
  extra: Partial<AnswerRecord> = {},
): AnswerRecord {
  return {
    playerId,
    questionId: `q.${tag}`,
    tag,
    optionId: `opt.${normalized}`,
    normalized,
    evasive: false,
    fallback: false,
    ...extra,
  };
}
