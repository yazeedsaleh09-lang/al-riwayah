/**
 * Runs authored contradiction rules and selects the single strongest
 * unreleased contradiction per reveal slot (GAME_DESIGN "Contradiction
 * selection"). Fully deterministic.
 */
import { CATEGORY_PRIORITY } from "./case-types";
import type { DetectedContradiction, DetectionContext, GameCase } from "./case-types";

/** Stable identity of a contradiction instance (rule + involved players). */
export function contradictionKey(c: DetectedContradiction): string {
  return `${c.ruleId}::${[...c.involvedPlayers].sort().join(",")}`;
}

/** Run every rule and flatten the detected instances. */
export function detectAll(ctx: DetectionContext, gameCase: GameCase): DetectedContradiction[] {
  const out: DetectedContradiction[] = [];
  for (const rule of gameCase.contradictionRules) {
    for (const detected of rule.detect(ctx)) {
      out.push(detected);
    }
  }
  return out;
}

/**
 * Rank candidates by the documented priority:
 * 1. category priority, 2. severity, 3. narrative importance,
 * 4. fewest players needed to understand, 5. deterministic key order.
 */
export function rankContradictions(candidates: DetectedContradiction[]): DetectedContradiction[] {
  return candidates.slice().sort((a, b) => {
    const catA = CATEGORY_PRIORITY[a.category];
    const catB = CATEGORY_PRIORITY[b.category];
    if (catA !== catB) return catA - catB;
    if (a.severity !== b.severity) return b.severity - a.severity;
    if (a.narrativeImportance !== b.narrativeImportance)
      return b.narrativeImportance - a.narrativeImportance;
    if (a.involvedPlayers.length !== b.involvedPlayers.length)
      return a.involvedPlayers.length - b.involvedPlayers.length;
    return contradictionKey(a).localeCompare(contradictionKey(b));
  });
}

/**
 * Select the strongest candidate whose instance key is not already released.
 * Deduplicates identical instances before ranking.
 */
export function selectNextContradiction(
  ctx: DetectionContext,
  gameCase: GameCase,
  alreadyReleasedKeys: readonly string[],
): DetectedContradiction | null {
  const released = new Set(alreadyReleasedKeys);
  const byKey = new Map<string, DetectedContradiction>();
  for (const c of detectAll(ctx, gameCase)) {
    const key = contradictionKey(c);
    if (released.has(key)) continue;
    // Keep the highest-severity instance for a given key.
    const existing = byKey.get(key);
    if (!existing || c.severity > existing.severity) byKey.set(key, c);
  }
  const ranked = rankContradictions([...byKey.values()]);
  return ranked[0] ?? null;
}
