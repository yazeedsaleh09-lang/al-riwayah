/**
 * Case validator. Enforces the invariants in CONTENT_SYSTEM.md so a broken case
 * fails the build/test rather than shipping. Pure — returns a list of errors.
 */
import {
  SCORE_AXES,
  assignPrivateEvidence,
  createRng,
  type GameCase,
  type PlayerState,
} from "@al-riwayah/game-engine";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function fakePlayers(n: number): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `لاعب ${i + 1}`,
    joinOrder: i,
    connected: true,
    ready: true,
    isHost: i === 0,
  }));
}

export function validateCase(gameCase: GameCase): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  const dupe = (id: string, kind: string) => {
    if (seen.has(id)) errors.push(`Duplicate id "${id}" (${kind}).`);
    seen.add(id);
  };

  // 1. Unique ids across entity kinds.
  for (const q of gameCase.questions) dupe(q.id, "question");
  for (const p of gameCase.patches) dupe(p.id, "patch");
  for (const e of gameCase.privateEvidencePool) dupe(e.id, "private-evidence");
  for (const e of gameCase.immutableEvidence) dupe(e.id, "immutable-evidence");
  dupe(gameCase.surpriseEvidence.id, "surprise-evidence");
  for (const r of gameCase.planning.reasons) dupe(r.id, "reason");
  for (const l of gameCase.planning.locations) dupe(l.id, "location");
  for (const r of gameCase.planning.roles) dupe(r.id, "role");

  // 2. Questions: localization + normalized options.
  for (const q of gameCase.questions) {
    if (!q.prompt.ar) errors.push(`Question ${q.id} missing Arabic prompt.`);
    if (!q.options && !q.dynamicOptions)
      errors.push(`Question ${q.id} has neither options nor dynamicOptions.`);
    const optIds = new Set<string>();
    for (const o of q.options ?? []) {
      if (!o.label.ar) errors.push(`Option ${o.id} in ${q.id} missing Arabic label.`);
      if (!o.normalized) errors.push(`Option ${o.id} in ${q.id} has no normalized value.`);
      if (optIds.has(o.id)) errors.push(`Duplicate option id ${o.id} in ${q.id}.`);
      optIds.add(o.id);
    }
  }

  // 3. Player counts.
  for (const c of [4, 5, 6]) {
    if (!gameCase.playerCounts.includes(c))
      errors.push(`Case must support player count ${c}.`);
  }

  // 4. Patches.
  const questionIds = new Set(gameCase.questions.map((q) => q.id));
  const ruleCategories = new Set(gameCase.contradictionRules.map((r) => r.category));
  for (const p of gameCase.patches) {
    if (p.commitments.length === 0) errors.push(`Patch ${p.id} creates no commitment.`);
    if (p.resolvesCategories.length === 0)
      errors.push(`Patch ${p.id} resolves no contradiction category.`);
    for (const cat of p.resolvesCategories) {
      if (!ruleCategories.has(cat))
        errors.push(`Patch ${p.id} resolves category ${cat} that no rule produces.`);
    }
    if (p.followUpQuestionIds.length === 0)
      errors.push(`Patch ${p.id} has no follow-up hooks.`);
    for (const fid of p.followUpQuestionIds) {
      if (!questionIds.has(fid))
        errors.push(`Patch ${p.id} references unknown follow-up question ${fid}.`);
    }
  }

  // Each rule category should have at least one patch that resolves it.
  for (const cat of ruleCategories) {
    if (!gameCase.patches.some((p) => p.resolvesCategories.includes(cat)))
      errors.push(`No patch resolves contradiction category ${cat}.`);
  }

  // 5. Verdict bands exhaustive over [0,100], non-overlapping, contiguous.
  const bands = gameCase.verdictBands.slice().sort((a, b) => a.minComposite - b.minComposite);
  if (bands.length === 0) {
    errors.push("No verdict bands defined.");
  } else {
    if (bands[0]!.minComposite !== 0)
      errors.push("Verdict bands must start at composite 0.");
    if (bands[bands.length - 1]!.maxComposite !== 100)
      errors.push("Verdict bands must end at composite 100.");
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i]!;
      if (b.maxComposite < b.minComposite)
        errors.push(`Verdict band ${b.band} has inverted range.`);
      if (i > 0) {
        const prev = bands[i - 1]!;
        if (b.minComposite !== prev.maxComposite + 1)
          errors.push(
            `Verdict bands ${prev.band}->${b.band} are not contiguous (gap or overlap at ${prev.maxComposite}/${b.minComposite}).`,
          );
      }
    }
  }

  // 6. Scoring config.
  for (const axis of SCORE_AXES) {
    if (typeof gameCase.scoring.initial[axis] !== "number")
      errors.push(`Scoring initial missing axis ${axis}.`);
  }
  const w = gameCase.scoring.compositeWeights;
  const sum = w.consistency + w.plausibility + w.stability;
  if (Math.abs(sum - 1) > 1e-6)
    errors.push(`Composite weights must sum to 1 (got ${sum}).`);

  // 7. Evidence assignment has a valid combination for every player count.
  for (const n of [4, 5, 6]) {
    const players = fakePlayers(n);
    const rng = createRng(`validate:${gameCase.id}:${n}`);
    let assignment: Record<string, string[]>;
    try {
      assignment = assignPrivateEvidence(rng, gameCase, players);
    } catch (e) {
      errors.push(`Evidence assignment threw for ${n} players: ${(e as Error).message}`);
      continue;
    }
    for (const p of players) {
      const ids = assignment[p.id] ?? [];
      if (ids.length !== 1)
        errors.push(`Player ${p.id} got ${ids.length} evidence items (${n}p), expected 1.`);
    }
    const required = gameCase.evidenceConstraints.requireExactlyOne;
    if (required && required.length > 0) {
      const holders = Object.values(assignment)
        .flat()
        .filter((id) => required.includes(id));
      if (holders.length !== 1)
        errors.push(
          `requireExactlyOne not satisfied for ${n} players (found ${holders.length} holders).`,
        );
    }
    for (const group of gameCase.evidenceConstraints.mutuallyExclusive ?? []) {
      const used = Object.values(assignment)
        .flat()
        .filter((id) => group.includes(id));
      if (used.length > 1)
        errors.push(`Mutually-exclusive group co-assigned for ${n} players: ${used.join(",")}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateCaseOrThrow(gameCase: GameCase): void {
  const result = validateCase(gameCase);
  if (!result.ok) {
    throw new Error(`Case ${gameCase.id} failed validation:\n- ${result.errors.join("\n- ")}`);
  }
}
