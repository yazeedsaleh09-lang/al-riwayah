/**
 * Player-intent application and phase-completion checks. The engine is the sole
 * authority on what actions are legal in each phase and which options a player
 * may choose. The transport layer (server) validates session/deadline/replay
 * before calling here; the engine independently guards phase and option
 * legality so invalid input can never mutate state (SEC-005).
 */
import type { GameCase } from "./case-types";
import type { MatchState } from "./match-types";
import {
  INTERROGATION_PHASES,
  PATCH_PHASES,
} from "./phases";
import { currentReleasedContradiction } from "./match";
import { applicablePatches } from "./patches";

export type IntentError =
  | "INVALID_PHASE"
  | "ACTION_NOT_ALLOWED"
  | "ANSWER_ALREADY_LOCKED"
  | "SESSION_INVALID";

export type EngineIntent =
  | { type: "ACKNOWLEDGE"; playerId: string }
  | { type: "STORY_PROPOSE"; playerId: string; fieldId: string; value: string }
  | { type: "STORY_CONFIRM"; playerId: string; fieldId: string }
  | { type: "ANSWER"; playerId: string; questionInstanceId: string; optionId: string }
  | { type: "PATCH_VOTE"; playerId: string; patchId: string };

export type IntentResult =
  | { ok: true; state: MatchState }
  | { ok: false; error: IntentError };

const ACK_PHASES = new Set(["CASE_BRIEF", "PRIVATE_EVIDENCE", "PLAN_REVIEW", "SURPRISE_EVIDENCE"]);

function player(state: MatchState, id: string) {
  return state.players.find((p) => p.id === id);
}

function planningFieldsFor(state: MatchState, gameCase: GameCase, playerId: string) {
  switch (state.phase) {
    case "PLAN_REASON":
      return {
        fields: ["reason"],
        validValue: (_field: string, v: string) =>
          gameCase.planning.reasons.some((r) => r.id === v),
      };
    case "PLAN_LOCATIONS":
      return {
        fields: [`location.${playerId}`],
        validValue: (_field: string, v: string) =>
          gameCase.planning.locations.some((l) => l.id === v),
      };
    case "PLAN_ROLES":
      return {
        fields: gameCase.planning.roles.map((r) => `role.${r.id}`),
        validValue: (_field: string, v: string) => state.players.some((p) => p.id === v),
      };
    default:
      return null;
  }
}

export function applyIntent(
  state: MatchState,
  gameCase: GameCase,
  intent: EngineIntent,
  _now: number,
): IntentResult {
  const actor = player(state, intent.playerId);
  if (!actor) return { ok: false, error: "SESSION_INVALID" };

  switch (intent.type) {
    case "ACKNOWLEDGE": {
      if (!ACK_PHASES.has(state.phase)) return { ok: false, error: "INVALID_PHASE" };
      if (!state.acknowledgedThisPhase.includes(actor.id)) {
        state.acknowledgedThisPhase.push(actor.id);
      }
      return { ok: true, state };
    }

    case "STORY_PROPOSE": {
      const cfg = planningFieldsFor(state, gameCase, actor.id);
      if (!cfg) return { ok: false, error: "INVALID_PHASE" };
      if (!cfg.fields.includes(intent.fieldId)) return { ok: false, error: "ACTION_NOT_ALLOWED" };
      if (!cfg.validValue(intent.fieldId, intent.value))
        return { ok: false, error: "ACTION_NOT_ALLOWED" };
      (state.proposals[intent.fieldId] ??= []).push({ value: intent.value, byPlayer: actor.id });
      return { ok: true, state };
    }

    case "STORY_CONFIRM": {
      const cfg = planningFieldsFor(state, gameCase, actor.id);
      if (!cfg) return { ok: false, error: "INVALID_PHASE" };
      if (!cfg.fields.includes(intent.fieldId)) return { ok: false, error: "ACTION_NOT_ALLOWED" };
      const set = (state.confirmations[intent.fieldId] ??= []);
      if (!set.includes(actor.id)) set.push(actor.id);
      return { ok: true, state };
    }

    case "ANSWER": {
      if (!INTERROGATION_PHASES.includes(state.phase))
        return { ok: false, error: "INVALID_PHASE" };
      const q = state.questionsByPlayer[actor.id];
      if (!q || q.instanceId !== intent.questionInstanceId)
        return { ok: false, error: "ACTION_NOT_ALLOWED" };
      if (state.answeredThisPhase.includes(actor.id))
        return { ok: false, error: "ANSWER_ALREADY_LOCKED" };
      const option = q.options.find((o) => o.id === intent.optionId);
      if (!option) return { ok: false, error: "ACTION_NOT_ALLOWED" };

      state.answers.push({
        playerId: actor.id,
        questionId: q.questionId,
        tag: q.tag,
        optionId: option.id,
        normalized: option.normalized,
        evasive: option.evasive ?? false,
        fallback: false,
      });
      state.answeredThisPhase.push(actor.id);
      if (option.evasive) {
        state.scoreLedger.push({
          axis: "evasion",
          delta: gameCase.scoring.evasionPerAnswer,
          reasonCode: "answer.evasive",
          refs: [actor.id, q.questionId],
          release: "summary",
        });
      }
      return { ok: true, state };
    }

    case "PATCH_VOTE": {
      if (!PATCH_PHASES.includes(state.phase)) return { ok: false, error: "INVALID_PHASE" };
      const contradiction = currentReleasedContradiction(state);
      if (!contradiction) return { ok: false, error: "ACTION_NOT_ALLOWED" };
      const options = applicablePatches(gameCase, contradiction);
      if (!options.some((p) => p.id === intent.patchId))
        return { ok: false, error: "ACTION_NOT_ALLOWED" };
      const byPhase = (state.patchVotes[state.phase] ??= {});
      byPhase[actor.id] = intent.patchId;
      return { ok: true, state };
    }

    default:
      return { ok: false, error: "ACTION_NOT_ALLOWED" };
  }
}

/** Number of votes needed for a room decision. */
function majority(n: number): number {
  return Math.floor(n / 2) + 1;
}

/**
 * True when the current phase's completion condition is met by player action
 * (server then advances without a forced deadline). Reveal and verdict phases
 * are timer-only and always return false here.
 */
export function isPhaseComplete(state: MatchState, gameCase: GameCase): boolean {
  const connected = state.players.filter((p) => p.connected);
  const connectedIds = new Set(connected.map((p) => p.id));
  const n = connected.length;
  if (n === 0) return false;

  switch (state.phase) {
    case "CASE_BRIEF":
    case "PRIVATE_EVIDENCE":
    case "PLAN_REVIEW":
    case "SURPRISE_EVIDENCE":
      return connected.every((p) => state.acknowledgedThisPhase.includes(p.id));

    case "PLAN_REASON":
      return (state.confirmations["reason"]?.filter((id) => connectedIds.has(id)).length ?? 0) >=
        majority(n);

    case "PLAN_LOCATIONS":
      return connected.every((p) =>
        (state.confirmations[`location.${p.id}`] ?? []).includes(p.id),
      );

    case "PLAN_ROLES":
      return gameCase.planning.roles.every(
        (r) => (state.confirmations[`role.${r.id}`]?.length ?? 0) >= 1,
      );

    case "INTERROGATION_FOUNDATION":
    case "INTERROGATION_GAPS":
    case "INTERROGATION_NO_GOOD_ANSWER":
    case "INTERROGATION_FOLLOWUP":
    case "FINAL_QUESTION":
      return connected.every((p) => state.answeredThisPhase.includes(p.id));

    case "PATCH_1":
    case "PATCH_2": {
      const votes = state.patchVotes[state.phase] ?? {};
      return connected.every((p) => votes[p.id] !== undefined);

    }
    default:
      // LOBBY, CONTRADICTION_REVEAL_*, VERDICT, RESULTS: timer or host driven.
      return false;
  }
}
