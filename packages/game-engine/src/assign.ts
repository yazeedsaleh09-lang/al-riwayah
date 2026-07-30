/**
 * Deterministic private-evidence and question assignment. Given identical seed
 * + players, assignments are identical (ENG-008). Evidence assignment respects
 * the case's constraints (exactly-one, mutually-exclusive).
 */
import type {
  AnswerOption,
  GameCase,
  Question,
  QuestionFamily,
} from "./case-types";
import type { PhaseId } from "./phases";
import type { AssignedQuestion, PlayerState } from "./match-types";
import type { Rng } from "./rng";

/**
 * Assign exactly one private evidence item to each player. Deterministic and
 * constraint-aware:
 *  - `requireExactlyOne`: guarantee exactly one player holds one of the listed
 *    ids (e.g. the Wi-Fi-storage device).
 *  - `mutuallyExclusive`: never assign two ids from the same group.
 */
export function assignPrivateEvidence(
  rng: Rng,
  gameCase: GameCase,
  players: readonly PlayerState[],
): Record<string, string[]> {
  const count = players.length;
  const pool = gameCase.privateEvidencePool.filter(
    (e) => !e.playerCounts || e.playerCounts.includes(count),
  );
  const constraints = gameCase.evidenceConstraints;
  const result: Record<string, string[]> = {};
  const orderedPlayers = players.slice().sort((a, b) => a.joinOrder - b.joinOrder);
  const assignedIds = new Set<string>();

  const exclusiveGroupOf = (id: string): string[] | undefined =>
    constraints.mutuallyExclusive?.find((g) => g.includes(id));

  const conflicts = (id: string): boolean => {
    const group = exclusiveGroupOf(id);
    if (!group) return false;
    return group.some((gid) => gid !== id && assignedIds.has(gid));
  };

  // Shuffle players and pool deterministically.
  const shuffledPlayers = rng.shuffle(orderedPlayers);
  const remaining = rng.shuffle(pool.map((e) => e.id));

  // Satisfy requireExactlyOne first: give one required item to the first player.
  const required = constraints.requireExactlyOne;
  let requiredAssignedTo: string | null = null;
  if (required && required.length > 0) {
    const chosen = rng.pick(required);
    const firstPlayer = shuffledPlayers[0]!;
    result[firstPlayer.id] = [chosen];
    assignedIds.add(chosen);
    requiredAssignedTo = firstPlayer.id;
  }

  for (const player of shuffledPlayers) {
    if (result[player.id]) continue; // already got the required item
    let picked: string | undefined;
    for (const id of remaining) {
      if (assignedIds.has(id)) continue;
      // Do not hand out a second copy of a required-group item.
      if (required?.includes(id) && requiredAssignedTo) continue;
      if (conflicts(id)) continue;
      picked = id;
      break;
    }
    if (!picked) {
      // Fallback: allow reuse of a non-conflicting item to avoid empty hands.
      picked = remaining.find((id) => !conflicts(id)) ?? remaining[0]!;
    }
    result[player.id] = [picked];
    assignedIds.add(picked);
  }

  return result;
}

/** Families drawn per interrogation phase (variety within a match). */
const PHASE_FAMILIES: Partial<Record<PhaseId, QuestionFamily[]>> = {
  INTERROGATION_FOUNDATION: ["foundation"],
  INTERROGATION_GAPS: ["gaps", "witness", "timeline", "location"],
  INTERROGATION_NO_GOOD_ANSWER: ["no_good_answer"],
  FINAL_QUESTION: ["no_good_answer", "gaps"],
};

function resolveOptions(
  question: Question,
  player: PlayerState,
  players: readonly PlayerState[],
): AnswerOption[] {
  if (question.dynamicOptions === "other_players") {
    return players
      .filter((p) => p.id !== player.id)
      .sort((a, b) => a.joinOrder - b.joinOrder)
      .map((p) => ({ id: `player:${p.id}`, label: { ar: p.name }, normalized: p.id }));
  }
  return question.options ?? [];
}

/**
 * Assign one question per player for an interrogation phase. Uses the seeded
 * RNG so the exact sequence varies by match but is reproducible. `usedIds`
 * accumulates across phases to avoid repeats where the pool allows.
 */
export function assignQuestionsForPhase(
  rng: Rng,
  gameCase: GameCase,
  players: readonly PlayerState[],
  phase: PhaseId,
  usedIds: Set<string>,
  followUpIds: readonly string[] = [],
  privateEvidenceByPlayer: Record<string, string[]> = {},
): Record<string, AssignedQuestion> {
  const out: Record<string, AssignedQuestion> = {};
  let pool: Question[];

  if (phase === "INTERROGATION_FOLLOWUP") {
    const followSet = new Set(followUpIds);
    pool = gameCase.questions.filter((q) => followSet.has(q.id));
    if (pool.length === 0) {
      // No patches were applied → fall back to gap questions so the phase runs.
      pool = gameCase.questions.filter((q) => q.family === "gaps");
    }
  } else {
    const families = PHASE_FAMILIES[phase] ?? ["gaps"];
    pool = gameCase.questions.filter((q) => families.includes(q.family));
  }

  const ordered = players.slice().sort((a, b) => a.joinOrder - b.joinOrder);
  const questionByTag = (tag: string) => gameCase.questions.find((question) => question.tag === tag);
  const wifiHolderId = Object.entries(privateEvidenceByPlayer).find(([, evidenceIds]) =>
    evidenceIds.includes("pe.own_device_wifi"),
  )?.[0];
  const nonWifiPlayers = ordered.filter((player) => player.id !== wifiHolderId);

  for (const [index, player] of ordered.entries()) {
    let anchoredQuestion: Question | undefined;
    if (phase === "INTERROGATION_FOUNDATION" && index < 2) {
      anchoredQuestion = questionByTag("driver");
    } else if (phase === "INTERROGATION_GAPS" && player.id === wifiHolderId) {
      anchoredQuestion = questionByTag("storage_visit");
    } else if (phase === "INTERROGATION_GAPS" && player.id === nonWifiPlayers[0]?.id) {
      anchoredQuestion = questionByTag("with_player");
    } else if (phase === "INTERROGATION_GAPS" && player.id === nonWifiPlayers[1]?.id) {
      anchoredQuestion = questionByTag("was_alone");
    }

    const fresh = rng.shuffle(pool.filter((question) => !usedIds.has(question.id)));
    const question = anchoredQuestion ?? fresh[0] ?? rng.pick(pool);
    usedIds.add(question.id);
    out[player.id] = {
      instanceId: `${phase}:${player.id}:${question.id}`,
      questionId: question.id,
      tag: question.tag,
      family: question.family,
      prompt: question.prompt,
      options: resolveOptions(question, player, players),
    };
  }
  return out;
}
