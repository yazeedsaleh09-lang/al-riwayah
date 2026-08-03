import {
  BANK_AL_SAHA_CASE_ID,
  type BankAlSahaCaseDefinition,
  type BankQuestionSet,
  type BankRepairId,
} from "./cases/bank-al-saha.v1";
import type { ValidationResult } from "./validate";
import { areBankLinkedOptionsCompatible } from "./cases/bank-al-saha-question-options";

const PLAYER_COUNTS = [4, 5, 6] as const;
const QUESTION_SETS: BankQuestionSet[] = ["first", "movement", "identity"];
const REPAIRS: BankRepairId[] = ["movement", "identity"];
const PLAYER_ROLES = ["saud", "yazid", "fahad", "rakan", "nawaf", "joud"] as const;
const FORBIDDEN_VISIBLE = /\b(?:experimental|beta|preview|V2|test case)\b/i;
const INTERNAL_PLAYER_CODE = /\bP[1-6]\b/;

function collectArabicCopy(value: unknown, path = "root"): string[] {
  if (typeof value === "string") return path.endsWith(".ar") ? [value] : [];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectArabicCopy(entry, `${path}.${index}`));
  }
  return Object.entries(value).flatMap(([key, entry]) =>
    collectArabicCopy(entry, `${path}.${key}`),
  );
}

export function validateBankAlSahaCase(definition: BankAlSahaCaseDefinition): ValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  const addId = (id: string, kind: string) => {
    if (!id) errors.push(`${kind} has an empty id.`);
    if (ids.has(id)) errors.push(`Duplicate id "${id}" (${kind}).`);
    ids.add(id);
  };

  if (definition.id !== BANK_AL_SAHA_CASE_ID)
    errors.push(`Bank case must use stable id ${BANK_AL_SAHA_CASE_ID}.`);
  if (definition.title.ar !== "قضية بنك الساحة") errors.push("Bank case title is not canonical.");
  if (definition.supportedPlayerCounts.join(",") !== "4,5,6")
    errors.push("Bank case must support exactly 4, 5, and 6 players.");
  if (definition.durationMinutes[0] !== 10 || definition.durationMinutes[1] !== 15)
    errors.push("Bank case duration must be 10–15 minutes.");
  const requiredStoryFacts = [
    "near_bank_reason",
    "alarm_location",
    "vehicle_key_holder",
    "suspicious_object_holder",
    "departure_plan",
    "cafe_door_witness",
    "parking_camera_sightline",
  ];
  if (definition.scene.requiredFacts.map(({ id }) => id).join(",") !== requiredStoryFacts.join(","))
    errors.push("Bank shared account does not contain the canonical causal fact set.");

  for (const count of PLAYER_COUNTS) {
    for (const set of QUESTION_SETS) {
      const questions = definition.questionMatrix[count]?.[set] ?? [];
      if (questions.length !== count)
        errors.push(
          `Question set ${set} has ${questions.length} questions for ${count} players; expected ${count}.`,
        );
      const expectedSeats = Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
      if (questions.map(({ seatKey }) => seatKey).join(",") !== expectedSeats.join(","))
        errors.push(`Question set ${set} does not cover every seat for ${count} players.`);
      for (const question of questions) {
        addId(question.id, "question");
        if (question.set !== set)
          errors.push(`Question ${question.id} is assigned to the wrong set.`);
        if (!question.prompt.ar) errors.push(`Question ${question.id} has no Arabic prompt.`);
        if (question.options.length < 2)
          errors.push(`Question ${question.id} has fewer than two options.`);
        if (question.factKeys.length === 0) errors.push(`Question ${question.id} emits no facts.`);
        if (question.comparisonRefs.length === 0)
          errors.push(`Question ${question.id} has no comparison.`);
        if (set === "first") {
          if (!question.checks.storyRef)
            errors.push(`First question ${question.id} has no story scoring reference.`);
          const linkedRef = question.checks.firstLinkedRef;
          if (!linkedRef?.startsWith("linked.")) {
            errors.push(`First question ${question.id} has no explicit linked.* target.`);
          } else {
            const target = linkedRef.slice("linked.".length);
            const availableRoles: readonly string[] = PLAYER_ROLES.slice(0, count);
            const ownRole = PLAYER_ROLES[Number(question.seatKey.slice("seat-".length)) - 1];
            if (!availableRoles.includes(target))
              errors.push(`First question ${question.id} links to unavailable role ${target}.`);
            else if (target === ownRole)
              errors.push(`First question ${question.id} links to its own role ${target}.`);
            if (!question.comparisonRefs.includes(linkedRef))
              errors.push(`First question ${question.id} linked target is not in comparisonRefs.`);
          }
        }
        if (
          set !== "first" &&
          (!question.checks.repairRef ||
            !question.checks.evidenceRef ||
            !question.checks.finalLinkedRef)
        )
          errors.push(`Forensic question ${question.id} has incomplete scoring references.`);
        if (set !== "first") {
          const linkedRef = question.checks.finalLinkedRef;
          if (!linkedRef?.startsWith("linked.")) {
            errors.push(`Forensic question ${question.id} has no explicit linked.* target.`);
          } else {
            const target = linkedRef.slice("linked.".length);
            const availableRoles: readonly string[] = PLAYER_ROLES.slice(0, count);
            const ownRole = PLAYER_ROLES[Number(question.seatKey.slice("seat-".length)) - 1];
            if (!availableRoles.includes(target))
              errors.push(`Forensic question ${question.id} links to unavailable role ${target}.`);
            else if (target === ownRole)
              errors.push(`Forensic question ${question.id} links to its own role ${target}.`);
            if (!question.comparisonRefs.includes(linkedRef))
              errors.push(`Forensic question ${question.id} linked target is not in comparisonRefs.`);
          }
        }
        const linkedRef = set === "first"
          ? question.checks.firstLinkedRef
          : question.checks.finalLinkedRef;
        const targetRole = linkedRef?.startsWith("linked.")
          ? linkedRef.slice("linked.".length)
          : "";
        const targetIndex = PLAYER_ROLES.slice(0, count).indexOf(
          targetRole as (typeof PLAYER_ROLES)[number],
        );
        const target = questions[targetIndex];
        const mapping = question.checks.linkedOptionMatches;
        if (target && mapping) {
          const ownerOptionIds = question.options.map(({ id }) => id).sort();
          if (Object.keys(mapping).sort().join(",") !== ownerOptionIds.join(",")) {
            errors.push(`Question ${question.id} linked option predicate does not cover every owner option.`);
          }
          const targetOptionIds = new Set(target.options.map(({ id }) => id));
          for (const ownerOption of question.options) {
            const matches = mapping[ownerOption.id] ?? [];
            if (matches.length === 0)
              errors.push(`Question ${question.id} owner option ${ownerOption.id} has no linked match.`);
            for (const targetOptionId of matches) {
              if (!targetOptionIds.has(targetOptionId))
                errors.push(`Question ${question.id} maps to unknown target option ${targetOptionId}.`);
            }
            if (target.options.length > 1 && target.options.every(({ id }) => matches.includes(id)))
              errors.push(`Question ${question.id} owner option ${ownerOption.id} has no linked mismatch.`);
            for (const targetOption of target.options) {
              const expected = areBankLinkedOptionsCompatible(set, ownerOption, targetOption);
              if (matches.includes(targetOption.id) !== expected) {
                errors.push(
                  `Question ${question.id} has a semantically invalid linked pair ${ownerOption.id} -> ${targetOption.id}.`,
                );
              }
            }
          }
        } else if (!mapping) {
          errors.push(`Question ${question.id} has no linked option predicate.`);
        }
        if (set === "first") {
          const storyFits = question.checks.storyOptionFits;
          if (!storyFits) {
            errors.push(`First question ${question.id} has no story option predicate.`);
          } else {
            if (Object.keys(storyFits.byOptionId).sort().join(",") !==
              question.options.map(({ id }) => id).sort().join(","))
              errors.push(`First question ${question.id} story predicate does not cover every option.`);
            const referenceValues = Object.keys(
              storyFits.byOptionId[question.options[0]?.id ?? ""] ?? {},
            ).sort();
            for (const option of question.options) {
              const fits = storyFits.byOptionId[option.id] ?? {};
              if (Object.keys(fits).sort().join(",") !== referenceValues.join(","))
                errors.push(`First question ${question.id} story predicate has inconsistent reference values for ${option.id}.`);
              const outcomes = Object.values(fits);
              if (outcomes.some((fit) => fit === 0.5))
                errors.push(`First question ${question.id} uses unjustified ambiguous story credit.`);
            }
            const storyOutcomes = Object.values(storyFits.byOptionId).flatMap(Object.values);
            if (!storyOutcomes.includes(1) || !storyOutcomes.includes(0))
              errors.push(`First question ${question.id} lacks a real story match or mismatch.`);
          }
        } else {
          const evidenceFits = question.checks.evidenceOptionFitsByPacket;
          if (!evidenceFits) {
            errors.push(`Forensic question ${question.id} has no packet evidence predicate.`);
          } else {
            for (const packet of ["movement_true", "identity_true", "ambiguous"] as const) {
              const fits = evidenceFits[packet] ?? {};
              if (Object.keys(fits).sort().join(",") !== question.options.map(({ id }) => id).sort().join(","))
                errors.push(`Forensic question ${question.id} evidence predicate does not cover every option for ${packet}.`);
              const outcomes = Object.values(fits);
              if (packet === "ambiguous") {
                if (outcomes.some((fit) => fit !== 0.5))
                  errors.push(`Forensic question ${question.id} has non-ambiguous credit in the ambiguous packet.`);
              } else if (outcomes.some((fit) => fit !== 0 && fit !== 1)) {
                errors.push(`Forensic question ${question.id} uses unjustified ambiguous evidence credit for ${packet}.`);
              }
            }
            const evidenceOutcomes = ["movement_true", "identity_true"].flatMap((packet) =>
              Object.values(evidenceFits[packet as "movement_true" | "identity_true"]),
            );
            if (!evidenceOutcomes.includes(1) || !evidenceOutcomes.includes(0))
              errors.push(`Forensic question ${question.id} lacks a real evidence match or mismatch.`);
          }
        }
      }
    }
  }

  for (const repairId of REPAIRS) {
    const repair = definition.repairBranches[repairId];
    addId(repair.id, "repair");
    if (repair.officialFacts.length === 0)
      errors.push(`Repair ${repairId} creates no official facts.`);
    if (repair.forensicQuestionSet !== repairId)
      errors.push(`Repair ${repairId} does not select its branch-specific question set.`);
    const request = definition.evidenceRequests[repair.evidenceRequestId];
    if (!request) {
      errors.push(`Repair ${repairId} references unknown evidence ${repair.evidenceRequestId}.`);
    } else if (request.causedByRepairId !== repairId) {
      errors.push(`Evidence request ${request.id} is not caused by repair ${repairId}.`);
    }
  }

  for (const [requestKey, request] of Object.entries(definition.evidenceRequests)) {
    if (requestKey !== request.id) {
      errors.push(`Evidence request map key ${requestKey} does not match id ${request.id}.`);
    }
  }

  if (
    Object.keys(definition.truthPackets).sort().join(",") !==
    "ambiguous,identity_true,movement_true"
  )
    errors.push("Bank case must define exactly the three canonical truth packets.");
  for (const packet of Object.values(definition.truthPackets)) {
    addId(packet.id, "truth-packet");
    if (packet.lockAt !== "match_creation")
      errors.push(`Truth packet ${packet.id} is not locked at match creation.`);
    for (const repairId of REPAIRS) {
      if (!packet.repairOutcomes[repairId])
        errors.push(`Truth packet ${packet.id} has no outcome for ${repairId}.`);
    }
    for (const requestId of Object.keys(definition.evidenceRequests)) {
      if (!packet.evidenceByRequest[requestId])
        errors.push(`Truth packet ${packet.id} has no evidence for ${requestId}.`);
    }
    for (const requestId of Object.keys(packet.evidenceByRequest)) {
      if (!definition.evidenceRequests[requestId])
        errors.push(`Truth packet ${packet.id} has unknown evidence ${requestId}.`);
    }
  }

  const weights = Object.values(definition.scoringWeights).reduce((sum, weight) => sum + weight, 0);
  if (weights !== 100) errors.push(`Individual scoring weights must sum to 100 (got ${weights}).`);

  const bands = [...definition.suspicionBands].sort((a, b) => a.min - b.min);
  if (bands[0]?.min !== 0 || bands.at(-1)?.max !== 100)
    errors.push("Suspicion bands must cover 0–100.");
  for (let index = 1; index < bands.length; index += 1) {
    if (bands[index]!.min !== bands[index - 1]!.max + 1)
      errors.push("Suspicion bands must be contiguous.");
  }

  for (const copy of collectArabicCopy(definition)) {
    if (FORBIDDEN_VISIBLE.test(copy))
      errors.push(`Visible copy contains a banned launch label: ${copy}`);
    if (INTERNAL_PLAYER_CODE.test(copy))
      errors.push(`Visible copy contains an internal player code: ${copy}`);
  }

  return { ok: errors.length === 0, errors };
}

export function validateBankAlSahaCaseOrThrow(definition: BankAlSahaCaseDefinition): void {
  const result = validateBankAlSahaCase(definition);
  if (!result.ok) throw new Error(`Bank case validation failed:\n- ${result.errors.join("\n- ")}`);
}
