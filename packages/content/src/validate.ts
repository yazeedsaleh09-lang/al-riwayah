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
  type WarehouseCaseDefinition,
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
    if (!gameCase.playerCounts.includes(c)) errors.push(`Case must support player count ${c}.`);
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
    if (p.followUpQuestionIds.length === 0) errors.push(`Patch ${p.id} has no follow-up hooks.`);
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
    if (bands[0]!.minComposite !== 0) errors.push("Verdict bands must start at composite 0.");
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
  if (Math.abs(sum - 1) > 1e-6) errors.push(`Composite weights must sum to 1 (got ${sum}).`);

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

const WAREHOUSE_CHAPTERS = ["power", "device", "car"] as const;
const WAREHOUSE_ISSUE_TYPES = [
  "DIRECT_CONTRADICTION",
  "EVIDENCE_CONFLICT",
  "STORY_GAP",
  "UNEXPLAINED_EVIDENCE",
] as const;

/**
 * Locked Warehouse V1 structural validation. This intentionally validates only
 * authored data; runtime identity, phase, deadline and ballot checks belong to
 * the authoritative engine/server boundary.
 */
export function validateWarehouseCase(definition: WarehouseCaseDefinition): ValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  const addId = (id: string, kind: string) => {
    if (!id) errors.push(`${kind} has an empty id.`);
    if (ids.has(id)) errors.push(`Duplicate id "${id}" (${kind}).`);
    ids.add(id);
  };

  if (definition.id !== "case.warehouse.v1")
    errors.push("Warehouse case must use stable id case.warehouse.v1.");
  if (definition.version !== "1.0.0") errors.push("Warehouse case must use locked version 1.0.0.");
  if (definition.supportedPlayerCounts.join(",") !== "4,5,6")
    errors.push("Warehouse case must support exactly 4, 5, and 6 players.");
  if (definition.durationMinutes[0] !== 25 || definition.durationMinutes[1] !== 30)
    errors.push("Warehouse duration must be 25–30 minutes.");
  const exactOptionIds = (
    actual: readonly { id: string }[],
    expected: readonly string[],
    label: string,
  ) => {
    if (actual.map((option) => option.id).join(",") !== expected.join(","))
      errors.push(`Warehouse ${label} options do not match the locked V1 set.`);
    for (const option of actual) {
      if (!("label" in option) || !(option as { label?: { ar?: string } }).label?.ar)
        errors.push(`Warehouse ${label} option ${option.id} has no Arabic label.`);
    }
  };
  exactOptionIds(
    definition.storyOptions.entryReasons,
    ["retrieve_misplaced_shipment", "check_inventory_mismatch", "return_equipment_before_audit"],
    "entry reason",
  );
  exactOptionIds(
    definition.storyOptions.entryRoutes,
    ["side_door", "loading_gate", "delivery_vehicle"],
    "entry route",
  );
  exactOptionIds(
    definition.storyOptions.locations,
    [
      "inventory_room",
      "electrical_corridor",
      "admin_office",
      "loading_area",
      "parking",
      "main_aisle",
    ],
    "location",
  );
  exactOptionIds(
    definition.storyOptions.carPurposes,
    ["transport_people", "carry_equipment", "collect_shipment", "temporary_parking"],
    "car purpose",
  );

  for (const count of [4, 5, 6] as const) {
    for (const chapter of WAREHOUSE_CHAPTERS) {
      const questions = definition.questionMatrix[count][chapter];
      if (questions.length !== count)
        errors.push(
          `Chapter ${chapter} has ${questions.length} questions for ${count} players; expected ${count}.`,
        );
      const expectedSeats = Array.from({ length: count }, (_, index) => `P${index + 1}`);
      if (questions.map((question) => question.seat).join(",") !== expectedSeats.join(","))
        errors.push(
          `Chapter ${chapter} does not cover seats P1-P${count} exactly once for ${count} players.`,
        );
      for (const question of questions) {
        addId(question.id, "question");
        if (question.chapter !== chapter)
          errors.push(`Question ${question.id} is assigned to the wrong chapter.`);
        if (!question.prompt.ar) errors.push(`Question ${question.id} has no Arabic prompt.`);
        if (question.options.length < 2)
          errors.push(`Question ${question.id} has fewer than two structured options.`);
        if (!question.outputFactKey) errors.push(`Question ${question.id} has no output fact key.`);
        if (question.comparisonTargets.length === 0)
          errors.push(`Question ${question.id} has no comparison target.`);
        if (!question.compatibilityRule)
          errors.push(`Question ${question.id} has no compatibility rule.`);
        if (!question.conflictRule) errors.push(`Question ${question.id} has no conflict rule.`);
        if (question.relevance.length === 0)
          errors.push(`Question ${question.id} has no evidence, patch, or result relevance.`);
      }
    }
  }

  const patchIds = new Set(definition.patchOptions.map((patch) => patch.id));
  const issueIds = new Set(definition.issues.map((issue) => issue.id));
  for (const chapter of WAREHOUSE_CHAPTERS) {
    const chapterDefinition = definition.chapters[chapter];
    addId(chapterDefinition.evidence.id, "evidence");
    if (chapterDefinition.evidence.chapter !== chapter)
      errors.push(`Evidence ${chapterDefinition.evidence.id} is assigned to the wrong chapter.`);
    const expectedTimestamp = {
      power: "23:47",
      device: "23:48",
      car: "00:01",
    }[chapter];
    if (chapterDefinition.evidence.timestamp !== expectedTimestamp)
      errors.push(`Evidence ${chapterDefinition.evidence.id} has the wrong locked timestamp.`);
    if (!chapterDefinition.evidence.factKey || !chapterDefinition.evidence.pressureKey)
      errors.push(`Evidence ${chapterDefinition.evidence.id} is not structured.`);
    const chapterPatches = chapterDefinition.patchOptionIds
      .map((id) => definition.patchOptions.find((patch) => patch.id === id))
      .filter((patch) => patch !== undefined);
    if (chapterPatches.filter((patch) => patch.availability === undefined).length < 2)
      errors.push(`Chapter ${chapter} has fewer than two unconditional valid patches.`);
    for (const id of chapterDefinition.issueIds) {
      if (!issueIds.has(id)) errors.push(`Chapter ${chapter} references unknown issue ${id}.`);
    }
    for (const id of chapterDefinition.patchOptionIds) {
      if (!patchIds.has(id)) errors.push(`Chapter ${chapter} references unknown patch ${id}.`);
    }
  }

  const representedIssueTypes = new Set(definition.issues.map((issue) => issue.type));
  for (const type of WAREHOUSE_ISSUE_TYPES) {
    if (!representedIssueTypes.has(type))
      errors.push(`Warehouse content does not represent issue type ${type}.`);
  }
  for (const issue of definition.issues) {
    addId(issue.id, "issue");
    if (issue.factRefs.length === 0) errors.push(`Issue ${issue.id} has no fact references.`);
    if (issue.patchOptionIds.length < 2)
      errors.push(`Issue ${issue.id} has fewer than two valid patch options.`);
    if (!issue.publicTitle.ar || !issue.publicExplanation.ar)
      errors.push(`Issue ${issue.id} has incomplete Arabic public copy.`);
    for (const patchId of issue.patchOptionIds) {
      if (!patchIds.has(patchId))
        errors.push(`Issue ${issue.id} references unknown patch ${patchId}.`);
      const patch = definition.patchOptions.find((candidate) => candidate.id === patchId);
      if (patch && !patch.resolvesIssueIds.includes(issue.id))
        errors.push(`Issue ${issue.id} and patch ${patchId} are not linked bidirectionally.`);
    }
  }

  for (const patch of definition.patchOptions) {
    addId(patch.id, "patch");
    if (patch.resolvesIssueIds.length === 0) errors.push(`Patch ${patch.id} resolves no issue.`);
    if (patch.factsAfter.length === 0) errors.push(`Patch ${patch.id} has no factsAfter.`);
    if (patch.chapter !== "car" && patch.commitments.length === 0)
      errors.push(`Patch ${patch.id} creates no later commitment.`);
    if (patch.chapter !== "car" && patch.laterEffects.length === 0)
      errors.push(`Patch ${patch.id} has no deterministic later effect.`);
    if (
      patch.laterEffects.some(
        (effect) =>
          !([4, 5, 6] as const).every((count) =>
            definition.questionMatrix[count][effect.chapter].some(
              (question) => question.laterEffectSelector === effect.selectorKey,
            ),
          ),
      )
    )
      errors.push(`Patch ${patch.id} has an untested later-effect selector.`);
    if (
      !patch.publicLabel.ar ||
      !patch.description.ar ||
      !patch.solves.ar ||
      !patch.nextPressure.ar
    )
      errors.push(`Patch ${patch.id} has incomplete Arabic public copy.`);
    for (const issueId of patch.resolvesIssueIds) {
      if (!issueIds.has(issueId))
        errors.push(`Patch ${patch.id} resolves unknown issue ${issueId}.`);
      const issue = definition.issues.find((candidate) => candidate.id === issueId);
      if (issue && !issue.patchOptionIds.includes(patch.id))
        errors.push(`Patch ${patch.id} and issue ${issueId} are not linked bidirectionally.`);
    }
  }

  const sortedBands = [...definition.resultBands].sort((a, b) => a.min - b.min);
  if (sortedBands.length === 0 || sortedBands[0]?.min !== 0 || sortedBands.at(-1)?.max !== 100)
    errors.push("Warehouse result bands must cover 0–100.");
  for (let index = 1; index < sortedBands.length; index++) {
    if (sortedBands[index]!.min !== sortedBands[index - 1]!.max + 1)
      errors.push("Warehouse result bands must be contiguous.");
  }

  return { ok: errors.length === 0, errors };
}

export function validateWarehouseCaseOrThrow(definition: WarehouseCaseDefinition): void {
  const result = validateWarehouseCase(definition);
  if (!result.ok)
    throw new Error(
      `Warehouse case ${definition.id} failed validation:\n- ${result.errors.join("\n- ")}`,
    );
}
