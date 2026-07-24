/**
 * Builds the read-only DetectionContext consumed by contradiction and
 * plausibility rule predicates. Pure: derived entirely from match state + case.
 */
import type { GameCase, DetectionContext, PlayerRef } from "./case-types";
import type { MatchState } from "./match-types";

export function buildDetectionContext(state: MatchState, gameCase: GameCase): DetectionContext {
  const players: PlayerRef[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    joinOrder: p.joinOrder,
  }));
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  const evidenceById = new Map(gameCase.privateEvidencePool.map((e) => [e.id, e]));

  const revealed = new Set(state.revealedEvidenceIds);
  const evidenceFacts = gameCase.immutableEvidence
    .concat(gameCase.surpriseEvidence)
    .filter((e) => revealed.has(e.id))
    .flatMap((e) => e.asserts ?? []);

  return {
    players,
    sharedStory: state.sharedStory,
    evidenceByPlayer: state.privateEvidenceByPlayer,
    evidenceFacts,
    answers: state.answers,
    commitments: state.commitments,
    revealedEvidenceIds: state.revealedEvidenceIds,
    getAnswer(playerId, tag) {
      // Latest answer for the tag wins (follow-ups can supersede).
      for (let i = state.answers.length - 1; i >= 0; i--) {
        const a = state.answers[i]!;
        if (a.playerId === playerId && a.tag === tag) return a;
      }
      return undefined;
    },
    answersByTag(tag) {
      return state.answers.filter((a) => a.tag === tag);
    },
    playerName(playerId) {
      return nameById.get(playerId) ?? playerId;
    },
    privateEvidenceFacts(playerId) {
      const ids = state.privateEvidenceByPlayer[playerId] ?? [];
      return ids.flatMap((id) => evidenceById.get(id)?.asserts ?? []);
    },
  };
}
