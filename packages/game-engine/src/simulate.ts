/**
 * Deterministic full-match simulator. Drives every phase from a script of
 * decisions. Used by tests and by the content inspector's "run random answer
 * simulation" requirement (CONTENT_SYSTEM.md). Given identical (seed, script)
 * it produces an identical final state (ENG-008).
 */
import { advancePhase, currentReleasedContradiction, initializeMatch } from "./match";
import { applyIntent, isPhaseComplete } from "./engine";
import type { GameCase } from "./case-types";
import type { MatchState, PlayerState } from "./match-types";

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

export interface MatchScript {
  reason?: string;
  /** playerId -> locationId at 23:46 */
  locations?: Record<string, string>;
  /** roleId -> playerId */
  roles?: Record<string, string>;
  /** Choose an option id for a question, given its tag + resolved options. */
  answer: (
    playerId: string,
    q: { tag: string; options: { id: string; normalized: string }[] },
  ) => string;
  /** Choose a patch id given the applicable options; defaults to first option. */
  patchVote?: (playerId: string, options: { id: string }[]) => string;
  /** Player ids treated as disconnected (never act). */
  absent?: string[];
}

/** Pick the option id whose normalized value matches, else the first option. */
export function optByNormalized(
  options: { id: string; normalized: string }[],
  normalized: string,
): string {
  return options.find((o) => o.normalized === normalized)?.id ?? options[0]!.id;
}

function firstApplicablePatchId(state: MatchState, gameCase: GameCase): string | undefined {
  const c = currentReleasedContradiction(state);
  if (!c) return undefined;
  return gameCase.patches.find((p) => p.resolvesCategories.includes(c.category))?.id;
}

function drivePhase(state: MatchState, gameCase: GameCase, script: MatchScript, now: number): void {
  const absent = new Set(script.absent ?? []);
  const acting = state.players.filter((p) => p.connected && !absent.has(p.id));
  const phase = state.phase;

  if (["CASE_BRIEF", "PRIVATE_EVIDENCE", "PLAN_REVIEW", "SURPRISE_EVIDENCE"].includes(phase)) {
    for (const p of acting)
      applyIntent(state, gameCase, { type: "ACKNOWLEDGE", playerId: p.id }, now);
  } else if (phase === "PLAN_REASON") {
    const reason = script.reason ?? gameCase.planning.reasons[0]!.id;
    for (const p of acting) {
      applyIntent(state, gameCase, { type: "STORY_PROPOSE", playerId: p.id, fieldId: "reason", value: reason }, now);
      applyIntent(state, gameCase, { type: "STORY_CONFIRM", playerId: p.id, fieldId: "reason" }, now);
    }
  } else if (phase === "PLAN_LOCATIONS") {
    for (const p of acting) {
      const loc = script.locations?.[p.id] ?? gameCase.planning.locations[0]!.id;
      const field = `location.${p.id}`;
      applyIntent(state, gameCase, { type: "STORY_PROPOSE", playerId: p.id, fieldId: field, value: loc }, now);
      applyIntent(state, gameCase, { type: "STORY_CONFIRM", playerId: p.id, fieldId: field }, now);
    }
  } else if (phase === "PLAN_ROLES") {
    const host = acting[0];
    if (host) {
      for (const role of gameCase.planning.roles) {
        const target = script.roles?.[role.id] ?? acting[0]!.id;
        const field = `role.${role.id}`;
        applyIntent(state, gameCase, { type: "STORY_PROPOSE", playerId: host.id, fieldId: field, value: target }, now);
        applyIntent(state, gameCase, { type: "STORY_CONFIRM", playerId: host.id, fieldId: field }, now);
      }
    }
  } else if (
    ["INTERROGATION_FOUNDATION", "INTERROGATION_GAPS", "INTERROGATION_NO_GOOD_ANSWER", "INTERROGATION_FOLLOWUP", "FINAL_QUESTION"].includes(phase)
  ) {
    for (const p of acting) {
      const q = state.questionsByPlayer[p.id];
      if (!q) continue;
      const optionId = script.answer(p.id, { tag: q.tag, options: q.options });
      applyIntent(state, gameCase, { type: "ANSWER", playerId: p.id, questionInstanceId: q.instanceId, optionId }, now);
    }
  } else if (phase === "PATCH_1" || phase === "PATCH_2") {
    for (const p of acting) {
      const patchId = script.patchVote
        ? script.patchVote(p.id, gameCase.patches)
        : firstApplicablePatchId(state, gameCase);
      if (patchId) applyIntent(state, gameCase, { type: "PATCH_VOTE", playerId: p.id, patchId }, now);
    }
  }
}

export interface SimulateOptions {
  now?: number;
  extendedPlanning?: boolean;
}

/** Run a full match to RESULTS and return the final authoritative state. */
export function simulateMatch(
  gameCase: GameCase,
  players: PlayerState[],
  seed: string,
  script: MatchScript,
  options: SimulateOptions = {},
): MatchState {
  const now = options.now ?? 1_000_000;
  const state = initializeMatch({
    matchId: "sim",
    seed,
    gameCase,
    players,
    now,
    ...(options.extendedPlanning !== undefined ? { extendedPlanning: options.extendedPlanning } : {}),
  });
  let guard = 0;
  while (state.phase !== "RESULTS" && guard < 40) {
    drivePhase(state, gameCase, script, now);
    const complete = isPhaseComplete(state, gameCase);
    advancePhase(state, gameCase, now, { forced: !complete });
    guard++;
  }
  return state;
}
