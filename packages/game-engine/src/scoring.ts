/**
 * Deterministic, auditable scoring. Axis totals are derived purely from ledger
 * entries (ENG-009). Verdict maps a composite to exactly one band (ENG-010).
 */
import { SCORE_AXES } from "./case-types";
import type { GameCase, ScoreAxis } from "./case-types";
import type { MatchState, ScoreLedgerEntry, VerdictResult } from "./match-types";
import { buildDetectionContext } from "./context";

/** Axis total = initial value + sum of all ledger deltas for that axis. */
export function axisTotals(
  ledger: readonly ScoreLedgerEntry[],
  gameCase: GameCase,
): Record<ScoreAxis, number> {
  const totals = { ...gameCase.scoring.initial } as Record<ScoreAxis, number>;
  for (const entry of ledger) {
    totals[entry.axis] += entry.delta;
  }
  // Clamp positive axes to [0,100]; evasion floored at 0.
  for (const axis of SCORE_AXES) {
    if (axis === "evasion") totals[axis] = Math.max(0, totals[axis]);
    else totals[axis] = Math.max(0, Math.min(100, totals[axis]));
  }
  return totals;
}

/** Weighted composite in [0,100]: positive axes minus evasion weight. */
export function computeComposite(
  scores: Record<ScoreAxis, number>,
  gameCase: GameCase,
): number {
  const w = gameCase.scoring.compositeWeights;
  const positive =
    scores.consistency * w.consistency +
    scores.plausibility * w.plausibility +
    scores.stability * w.stability;
  const composite = positive - scores.evasion * gameCase.scoring.evasionCompositeWeight;
  return Math.max(0, Math.min(100, Math.round(composite)));
}

/** Map a composite to its verdict band. Bands are validated exhaustive/disjoint. */
export function resolveBand(composite: number, gameCase: GameCase) {
  const band = gameCase.verdictBands.find(
    (b) => composite >= b.minComposite && composite <= b.maxComposite,
  );
  if (!band) {
    // Should be impossible after validation; fail loud rather than silently.
    throw new Error(`No verdict band covers composite ${composite}`);
  }
  return band;
}

/**
 * Produce the final verdict. Evaluates plausibility rules into the ledger,
 * computes axis totals, composite, band, and recap labels. Returns the verdict
 * plus any ledger entries that must be appended.
 */
export function finalizeVerdict(
  state: MatchState,
  gameCase: GameCase,
): { verdict: VerdictResult; ledgerAdditions: ScoreLedgerEntry[] } {
  const ctx = buildDetectionContext(state, gameCase);
  const additions: ScoreLedgerEntry[] = [];

  for (const rule of gameCase.plausibilityRules) {
    if (rule.applies(ctx)) {
      additions.push({
        axis: "plausibility",
        delta: rule.delta,
        reasonCode: rule.id,
        refs: [],
        release: "summary",
        explanation: rule.reason,
      });
    }
  }

  const fullLedger = state.scoreLedger.concat(additions);
  const scores = axisTotals(fullLedger, gameCase);
  const composite = computeComposite(scores, gameCase);
  const band = resolveBand(composite, gameCase);

  // Recap: most consistent = fewest contradictions involved + least evasion.
  const contradictionsByPlayer = new Map<string, number>();
  for (const c of state.detectedContradictions) {
    if (!state.releasedContradictionIds.length) break;
    for (const pid of c.involvedPlayers) {
      contradictionsByPlayer.set(pid, (contradictionsByPlayer.get(pid) ?? 0) + 1);
    }
  }
  const evasionByPlayer = new Map<string, number>();
  for (const a of state.answers) {
    if (a.evasive) evasionByPlayer.set(a.playerId, (evasionByPlayer.get(a.playerId) ?? 0) + 1);
  }

  const players = state.players;
  const blameScore = (pid: string) =>
    (contradictionsByPlayer.get(pid) ?? 0) * 2 + (evasionByPlayer.get(pid) ?? 0);

  let mostConsistent: string | null = null;
  let primarySuspect: string | null = null;
  if (players.length > 0) {
    const sorted = players.slice().sort((a, b) => {
      const diff = blameScore(a.id) - blameScore(b.id);
      return diff !== 0 ? diff : a.joinOrder - b.joinOrder;
    });
    mostConsistent = sorted[0]!.id;
    const worst = sorted[sorted.length - 1]!;
    primarySuspect = blameScore(worst.id) > 0 ? worst.id : null;
  }

  const decisiveFactors = additions
    .filter((a) => a.explanation)
    .map((a) => a.explanation!)
    .concat(
      state.scoreLedger
        .filter((e) => e.release === "summary" && e.explanation)
        .map((e) => e.explanation!),
    )
    .slice(0, 4);

  const verdict: VerdictResult = {
    band: band.band,
    label: band.label,
    summary: band.summary,
    composite,
    scores,
    decisiveFactors,
    mostConsistentPlayerId: mostConsistent,
    primarySuspectPlayerId: primarySuspect,
  };

  return { verdict, ledgerAdditions: additions };
}
