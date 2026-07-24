/**
 * Patch resolution. A patch resolves a contradiction but always creates at
 * least one new narrative commitment and score cost (ADR-004, GAME_DESIGN
 * "Patch system"). A patch never simply replaces an answer.
 */
import type {
  Commitment,
  DetectedContradiction,
  GameCase,
  PatchDefinition,
} from "./case-types";
import type { ScoreLedgerEntry } from "./match-types";
import { fillLocalized } from "./i18n";

/** Patches whose categories can resolve the given released contradiction. */
export function applicablePatches(
  gameCase: GameCase,
  contradiction: DetectedContradiction,
): PatchDefinition[] {
  return gameCase.patches.filter((p) => p.resolvesCategories.includes(contradiction.category));
}

export interface AppliedPatch {
  commitments: Commitment[];
  ledgerAdditions: ScoreLedgerEntry[];
  followUpQuestionIds: string[];
}

/**
 * Apply a patch to a contradiction. Deterministic: commitment ids are derived
 * from the patch id and index. Player refs resolve from the contradiction's
 * involved players.
 */
export function applyPatch(
  patch: PatchDefinition,
  contradiction: DetectedContradiction,
  gameCase: GameCase,
  playerName: (id: string) => string,
): AppliedPatch {
  const primaryPlayer = contradiction.involvedPlayers[0];
  const secondaryPlayer = contradiction.involvedPlayers[1];

  const commitments: Commitment[] = patch.commitments.map((tpl, i) => {
    const playerId =
      tpl.fromContradiction === "primaryPlayer"
        ? primaryPlayer
        : tpl.fromContradiction === "secondaryPlayer"
          ? secondaryPlayer
          : undefined;
    const params: Record<string, string> = {};
    if (primaryPlayer) params.A = playerName(primaryPlayer);
    if (secondaryPlayer) params.B = playerName(secondaryPlayer);
    if (playerId) params.player = playerName(playerId);
    return {
      id: `${patch.id}.commit.${i}`,
      factKey: tpl.factKey,
      value: tpl.value ?? playerId ?? "",
      fromPatchId: patch.id,
      ...(playerId ? { playerId } : {}),
      label: fillLocalized(tpl.label, params),
    };
  });

  const ledgerAdditions: ScoreLedgerEntry[] = [];
  for (const axis of Object.keys(patch.scoreEffects) as (keyof typeof patch.scoreEffects)[]) {
    const delta = patch.scoreEffects[axis];
    if (delta === undefined || delta === 0) continue;
    ledgerAdditions.push({
      axis,
      delta,
      reasonCode: `patch.${patch.id}`,
      refs: [contradiction.ruleId],
      release: "summary",
      explanation: patch.publicLabel,
    });
  }
  // Every applied patch costs stability (changing a locked story is not free).
  ledgerAdditions.push({
    axis: "stability",
    delta: -gameCase.scoring.stabilityBreakPenalty,
    reasonCode: "stability.patch_applied",
    refs: [patch.id],
    release: "summary",
  });

  return { commitments, ledgerAdditions, followUpQuestionIds: patch.followUpQuestionIds };
}

/**
 * Resolve a patch vote map to a winning patch id. Majority wins; ties break to
 * the least-destructive option (smallest total negative score effect), then by
 * patch id for determinism.
 */
export function resolvePatchVote(
  votes: Record<string, string>,
  options: PatchDefinition[],
): string | null {
  if (options.length === 0) return null;
  const tally = new Map<string, number>();
  for (const patchId of Object.values(votes)) {
    tally.set(patchId, (tally.get(patchId) ?? 0) + 1);
  }
  const cost = (p: PatchDefinition) =>
    Object.values(p.scoreEffects).reduce((s, d) => s + Math.min(0, d ?? 0), 0);

  return (
    options
      .slice()
      .sort((a, b) => {
        const va = tally.get(a.id) ?? 0;
        const vb = tally.get(b.id) ?? 0;
        if (va !== vb) return vb - va; // most votes first
        const ca = cost(a);
        const cb = cost(b);
        if (ca !== cb) return cb - ca; // least destructive (closest to 0) first
        return a.id.localeCompare(b.id);
      })[0]?.id ?? null
  );
}
