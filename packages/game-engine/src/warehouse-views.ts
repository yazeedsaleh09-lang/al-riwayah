import type {
  WarehouseCaseDefinition,
  WarehouseCaseChapter,
  WarehouseDetectedIssue,
  WarehouseEvidenceEvaluation,
  WarehouseLockedAnswer,
  WarehousePhase,
  WarehouseQuestionAssignment,
  WarehouseRankedBallot,
  WarehouseSharedStory,
  WarehouseState,
} from "./warehouse-types";
import type { LocalizedText } from "./i18n";
import { isWarehouseQuestionActivatedByPatch } from "./warehouse";

export interface WarehousePublicView {
  sessionId: string;
  case: {
    id: string;
    version: string;
    title: LocalizedText;
    pitch: LocalizedText;
    premise: LocalizedText;
    complexity: LocalizedText;
    durationMinutes: readonly [number, number];
  };
  chapter: WarehouseCaseChapter;
  phase: WarehousePhase;
  phaseRevision: number;
  advisoryDeadlineAt: number | null;
  advisoryExpired: boolean;
  sharedStory: WarehouseSharedStory;
  players: readonly {
    id: string;
    name: string;
    seat: string;
    connected: boolean;
    skipped: boolean;
    disconnectedAt: number | null;
  }[];
  progress: {
    required: number;
    answersLocked: number;
    storyConfirmed: number;
    questionsStarted: number;
    discussionReady: number;
    ballotsSubmitted: number;
  };
  currentEvidence: {
    id: string;
    title: LocalizedText;
    detail: LocalizedText;
    timestamp: string;
  } | null;
  revealedIssues: readonly {
    id: string;
    type: WarehouseDetectedIssue["type"];
    title: LocalizedText;
    explanation: LocalizedText;
    statementA?: LocalizedText;
    statementB?: LocalizedText;
    rule?: LocalizedText;
  }[];
  issueHistory: readonly {
    id: string;
    chapter: "power" | "device" | "car";
    type: WarehouseDetectedIssue["type"];
    title: LocalizedText;
    explanation: LocalizedText;
  }[];
  hasDirectIssue: boolean;
  evidenceEvaluations: readonly WarehouseEvidenceEvaluation[];
  adoptedPatchIds: readonly string[];
  patchOptions: readonly {
    id: string;
    label: LocalizedText;
    description: LocalizedText;
    solves: LocalizedText;
    nextPressure: LocalizedText;
  }[];
  storyUpdate: {
    patchId: string;
    factsBefore: readonly { key: string; value: unknown }[];
    factsAfter: readonly { key: string; value: unknown }[];
    laterEffects: readonly { chapter: string; selectorKey: string }[];
  } | null;
  result: WarehouseState["scoreResult"];
  resultNarrative: readonly {
    type: "issue" | "patch" | "later_effect";
    refId: string;
    label: LocalizedText;
  }[];
  resultAttribution: {
    worstContradiction: {
      issueId: string;
      playerId: string;
      playerName: string;
      answer: LocalizedText;
      conflict: LocalizedText;
      explanation: LocalizedText;
    } | null;
    bestPatch: {
      patchId: string;
      playerId: string;
      playerName: string;
      contribution: LocalizedText;
      impact: LocalizedText;
    } | null;
  };
}

function localizedFactValue(
  state: WarehouseState,
  playerId: string,
  factKey: string,
  value: string | number | boolean | null,
): LocalizedText {
  const assignment = Object.values(state.questionAssignments).find(
    (candidate) => candidate.playerId === playerId && candidate.outputFactKey === factKey,
  );
  const option = assignment?.options.find((candidate) => candidate.value === value);
  return option?.label ?? { ar: String(value) };
}

function buildResultAttribution(
  state: WarehouseState,
  definition: WarehouseCaseDefinition,
): WarehousePublicView["resultAttribution"] {
  if (state.chapter !== "result") {
    return { worstContradiction: null, bestPatch: null };
  }
  const issueEvents = state.eventLedger.filter((item) => item.type === "ISSUE_REVEALED");
  const worstIssue = state.issueLedger
    .filter(
      (issue) =>
        (issue.type === "DIRECT_CONTRADICTION" || issue.type === "EVIDENCE_CONFLICT") &&
        issue.attribution !== undefined &&
        issueEvents.some((item) => item.refs[0] === issue.id),
    )
    .slice()
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))[0];
  const issueEvent = worstIssue
    ? issueEvents.find((item) => item.refs[0] === worstIssue.id)
    : undefined;
  const sourcePlayerId = issueEvent?.playerId ?? worstIssue?.attribution?.sourcePlayerId;
  const sourcePlayer = sourcePlayerId
    ? state.players.find((player) => player.id === sourcePlayerId)
    : undefined;
  const authoredIssue = worstIssue
    ? definition.issues.find((candidate) => candidate.id === worstIssue.id)
    : undefined;
  const worstContradiction =
    worstIssue?.attribution && sourcePlayer && authoredIssue
      ? {
          issueId: worstIssue.id,
          playerId: sourcePlayer.id,
          playerName: sourcePlayer.name,
          answer: localizedFactValue(
            state,
            sourcePlayer.id,
            worstIssue.attribution.sourceFactKey,
            worstIssue.attribution.sourceValue,
          ),
          conflict: localizedFactValue(
            state,
            worstIssue.attribution.targetPlayerId ?? sourcePlayer.id,
            worstIssue.attribution.targetFactKey,
            worstIssue.attribution.targetValue,
          ),
          explanation: authoredIssue.publicExplanation,
        }
      : null;

  const patchEvents = state.eventLedger.filter((item) => item.type === "PATCH_ADOPTED");
  const evaluatedCommitments = (patch: WarehouseState["adoptedPatches"][number]) =>
    patch.commitmentsCreated.map(
      (created) => state.commitments.find((current) => current.id === created.id) ?? created,
    );
  const successfulPatch = state.adoptedPatches
    .filter(
      (patch) =>
        patchEvents.some((item) => item.refs[0] === patch.patchId) &&
        !evaluatedCommitments(patch).some((commitment) => commitment.status === "broken"),
    )
    .slice()
    .sort(
      (a, b) =>
        evaluatedCommitments(b).filter((commitment) => commitment.status === "satisfied").length -
          evaluatedCommitments(a).filter((commitment) => commitment.status === "satisfied").length ||
        a.chapter.localeCompare(b.chapter),
    )[0];
  const supporterEvent = successfulPatch
    ? state.eventLedger
        .filter(
          (item) =>
            item.type === "RANKED_BALLOT_SUBMITTED" &&
            item.refs.includes(successfulPatch.patchId) &&
            item.playerId,
        )
        .slice()
        .sort(
          (a, b) =>
            a.refs.indexOf(successfulPatch.patchId) - b.refs.indexOf(successfulPatch.patchId) ||
            a.timestamp - b.timestamp ||
            a.id.localeCompare(b.id),
        )[0]
    : undefined;
  const supporter = supporterEvent?.playerId
    ? state.players.find((player) => player.id === supporterEvent.playerId)
    : undefined;
  const authoredPatch = successfulPatch
    ? definition.patchOptions.find((candidate) => candidate.id === successfulPatch.patchId)
    : undefined;
  const bestPatch =
    successfulPatch && supporter && authoredPatch
      ? {
          patchId: successfulPatch.patchId,
          playerId: supporter.id,
          playerName: supporter.name,
          contribution: {
            ar: `رتّب «${authoredPatch.publicLabel.ar}» في المرتبة ${supporterEvent!.refs.indexOf(successfulPatch.patchId) + 1}.`,
          },
          impact: authoredPatch.nextPressure,
        }
      : null;
  return { worstContradiction, bestPatch };
}

export interface WarehousePrivateView {
  playerId: string;
  chapter: WarehouseCaseChapter;
  phase: WarehousePhase;
  question: WarehouseQuestionAssignment | null;
  questionActivatedByPatch: boolean;
  lockedAnswer: WarehouseLockedAnswer | null;
  rankedBallot: WarehouseRankedBallot | null;
  allowedActions: readonly (
    | "SET_STORY"
    | "SUBMIT_STORY"
    | "CONFIRM_STORY"
    | "START_QUESTION"
    | "LOCK_ANSWER"
    | "READY_FOR_VOTE"
    | "SUBMIT_RANKED_BALLOT"
    | "WAIT"
  )[];
}

export function toWarehousePublicView(
  state: WarehouseState,
  definition: WarehouseCaseDefinition,
): WarehousePublicView {
  const required = state.players.filter((player) => !state.skippedPlayerIds.includes(player.id));
  const currentChapter =
    state.chapter === "power" || state.chapter === "device" || state.chapter === "car"
      ? state.chapter
      : null;
  const currentEvidence = currentChapter ? definition.chapters[currentChapter].evidence : null;
  const canRevealIssues =
    state.phase === "ISSUE_REVEAL" ||
    state.phase === "OPEN_DISCUSSION" ||
    state.phase === "PATCH_BALLOT" ||
    state.phase === "PATCH_RESOLUTION" ||
    state.phase === "STORY_UPDATE";
  const revealedIssues = canRevealIssues
    ? state.issueLedger
        .filter((issue) => issue.chapter === currentChapter)
        .slice(-2)
        .map((issue) => {
          const authored = definition.issues.find((candidate) => candidate.id === issue.id);
          if (!authored) return null;
          return {
            id: issue.id,
            type: issue.type,
            title: authored.publicTitle,
            explanation: authored.publicExplanation,
            ...(authored.statementA ? { statementA: authored.statementA } : {}),
            ...(authored.statementB ? { statementB: authored.statementB } : {}),
            ...(authored.rule ? { rule: authored.rule } : {}),
          };
        })
        .filter((issue): issue is NonNullable<typeof issue> => issue !== null)
    : [];
  const issueHistory =
    state.chapter === "result"
      ? state.issueLedger.flatMap((issue) => {
          const authored = definition.issues.find((candidate) => candidate.id === issue.id);
          return authored
            ? [
                {
                  id: issue.id,
                  chapter: issue.chapter,
                  type: issue.type,
                  title: authored.publicTitle,
                  explanation: authored.publicExplanation,
                },
              ]
            : [];
        })
      : [];
  const patchOptions =
    state.phase === "PATCH_BALLOT"
      ? state.ballotOptionIds
          .map((id) => definition.patchOptions.find((option) => option.id === id))
          .filter((option): option is NonNullable<typeof option> => option !== undefined)
          .map((option) => ({
            id: option.id,
            label: option.publicLabel,
            description: option.description,
            solves: option.solves,
            nextPressure: option.nextPressure,
          }))
      : [];
  const latestPatch = state.adoptedPatches[state.adoptedPatches.length - 1] ?? null;
  return {
    sessionId: state.sessionId,
    case: {
      id: definition.id,
      version: definition.version,
      title: definition.title,
      pitch: definition.pitch,
      premise: definition.premise,
      complexity: definition.complexity,
      durationMinutes: definition.durationMinutes,
    },
    chapter: state.chapter,
    phase: state.phase,
    phaseRevision: state.phaseRevision,
    advisoryDeadlineAt: state.advisoryDeadlineAt,
    advisoryExpired: state.advisoryExpired,
    sharedStory: {
      ...state.sharedStory,
      location2346: { ...state.sharedStory.location2346 },
    },
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      connected: player.connected,
      skipped: state.skippedPlayerIds.includes(player.id),
      disconnectedAt: state.disconnectedAtByPlayer[player.id] ?? null,
    })),
    progress: {
      required: required.length,
      answersLocked: state.lockedAnswers.filter((answer) => answer.chapter === state.chapter).length,
      storyConfirmed: state.storyConfirmedPlayerIds.length,
      questionsStarted: state.questionStartedPlayerIds.length,
      discussionReady: state.readyForVotePlayerIds.length,
      ballotsSubmitted: state.rankedBallots.length,
    },
    currentEvidence:
      currentEvidence && state.phase !== "STORY_BUILDING" && state.phase !== "STORY_REVIEW"
        ? {
            id: currentEvidence.id,
            title: currentEvidence.title,
            detail: currentEvidence.detail,
            timestamp: currentEvidence.timestamp,
          }
        : null,
    revealedIssues,
    issueHistory,
    hasDirectIssue: state.issueLedger.some(
      (issue) =>
        issue.type === "DIRECT_CONTRADICTION" || issue.type === "EVIDENCE_CONFLICT",
    ),
    evidenceEvaluations: state.evidenceLedger.map((evaluation) => ({ ...evaluation })),
    adoptedPatchIds: state.adoptedPatches.map((patch) => patch.patchId),
    patchOptions,
    storyUpdate:
      latestPatch && (state.phase === "PATCH_RESOLUTION" || state.phase === "STORY_UPDATE")
        ? {
            patchId: latestPatch.patchId,
            factsBefore: latestPatch.factsBefore.map((fact) => ({ ...fact })),
            factsAfter: latestPatch.factsAfter.map((fact) => ({ ...fact })),
            laterEffects: latestPatch.laterEffects.map((effect) => ({ ...effect })),
          }
        : null,
    result: state.chapter === "result" ? state.scoreResult : null,
    resultNarrative:
      state.chapter === "result"
        ? state.eventLedger.reduce<WarehousePublicView["resultNarrative"]>((items, item) => {
            if (item.type === "ISSUE_REVEALED") {
              const issue = definition.issues.find((candidate) => candidate.id === item.refs[0]);
              return issue
                ? [...items, { type: "issue", refId: issue.id, label: issue.publicExplanation }]
                : items;
            }
            if (item.type === "PATCH_ADOPTED") {
              const patch = definition.patchOptions.find((candidate) => candidate.id === item.refs[0]);
              return patch
                ? [...items, { type: "patch", refId: patch.id, label: patch.description }]
                : items;
            }
            if (item.type === "COMMITMENT_CHECKED") {
              const status = String(item.data.status ?? "untested");
              const statusCopy: Record<string, string> = {
                satisfied: "ثبت أثر الترقيعة في الفصل التالي.",
                partial: "ظهر أثر الترقيعة جزئيًا في الفصل التالي.",
                broken: "الإجابة اللاحقة خالفت التزام الترقيعة.",
                untested: "لم يمكن اختبار أثر الترقيعة في هذا المسار.",
              };
              return [
                ...items,
                {
                  type: "later_effect",
                  refId: item.refs[0] ?? item.id,
                  label: { ar: statusCopy[status] ?? statusCopy.untested! },
                },
              ];
            }
            return items;
          }, [])
        : [],
    resultAttribution: buildResultAttribution(state, definition),
  };
}

export function toWarehousePrivateView(
  state: WarehouseState,
  playerId: string,
  isHost = false,
): WarehousePrivateView | null {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return null;
  const question =
    (state.phase === "SILENT_ANSWERING" || state.phase === "WAITING_FOR_ANSWERS") &&
    state.questionStartedPlayerIds.includes(playerId) &&
    (state.chapter === "power" || state.chapter === "device" || state.chapter === "car")
      ? state.questionAssignments[`${state.chapter}:${player.seat}`] ?? null
      : null;
  const lockedAnswer =
    state.lockedAnswers.find((answer) => answer.questionInstanceId === question?.instanceId) ?? null;
  const rankedBallot =
    state.rankedBallots.find((ballot) => ballot.playerId === playerId) ?? null;
  let allowedActions: WarehousePrivateView["allowedActions"] = ["WAIT"];
  if (state.phase === "STORY_BUILDING") {
    allowedActions = isHost ? ["SET_STORY", "SUBMIT_STORY"] : ["SET_STORY"];
  }
  else if (
    (state.phase === "STORY_REVIEW" || state.phase === "STORY_UPDATE") &&
    !state.storyConfirmedPlayerIds.includes(playerId)
  ) {
    allowedActions = ["CONFIRM_STORY"];
  } else if (
    state.phase === "SILENT_PHASE_INTRO" &&
    !state.questionStartedPlayerIds.includes(playerId) &&
    !state.skippedPlayerIds.includes(playerId)
  ) {
    allowedActions = ["START_QUESTION"];
  } else if (
    (state.phase === "SILENT_ANSWERING" || state.phase === "WAITING_FOR_ANSWERS") &&
    question &&
    !lockedAnswer
  ) {
    allowedActions = ["LOCK_ANSWER"];
  } else if (
    state.phase === "OPEN_DISCUSSION" &&
    player.connected &&
    !state.readyForVotePlayerIds.includes(playerId)
  ) {
    allowedActions = ["READY_FOR_VOTE"];
  } else if (
    state.phase === "PATCH_BALLOT" &&
    !rankedBallot &&
    !state.skippedPlayerIds.includes(playerId)
  ) {
    allowedActions = ["SUBMIT_RANKED_BALLOT"];
  }
  return {
    playerId,
    chapter: state.chapter,
    phase: state.phase,
    question,
    questionActivatedByPatch: question
      ? isWarehouseQuestionActivatedByPatch(state, question)
      : false,
    lockedAnswer,
    rankedBallot,
    allowedActions,
  };
}
