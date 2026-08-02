"use client";

import { useEffect, useState } from "react";
import {
  type WarehouseCaseDefinition,
  type WarehousePhase,
  type WarehousePrivateView,
  type WarehousePublicView,
} from "@al-riwayah/game-engine";
import type { useGameRoom } from "@/lib/useGameRoom";
import { useDeadlineExpired } from "./DeadlineRing";
import { GameHeader } from "./GameHeader";
import { WarehouseIssueCards as IssueCards, WarehouseResult } from "./WarehouseEvidence";
import { WarehouseDisconnectedPanel } from "./WarehouseDisconnect";
import { WarehousePhaseBanner } from "./WarehousePhaseBanner";

const WAREHOUSE_PHASE_SET = new Set<string>([
  "STORY_BUILDING",
  "STORY_REVIEW",
  "SILENT_PHASE_INTRO",
  "CHAPTER_CONTEXT",
  "SILENT_ANSWERING",
  "WAITING_FOR_ANSWERS",
  "ISSUE_REVEAL",
  "OPEN_DISCUSSION",
  "PATCH_BALLOT",
  "PATCH_RESOLUTION",
  "STORY_UPDATE",
  "RESULT_CALCULATION",
  "RESULT_REVEAL",
]);
type RoomActions = ReturnType<typeof useGameRoom>["actions"];
type WarehousePublicShell = WarehousePublicView & {
  protocolVersion?: 1;
  roomCode: string;
  deadlineAt: number | null;
  serverTime: number;
  caseId: string;
  caseVersion?: string;
};
type WarehousePrivateWithShell = WarehousePrivateView & {
  protocolVersion?: 1;
  isHost?: boolean;
  connected?: boolean;
  phaseRevision?: number;
};

export function isWarehousePublicView(value: unknown): value is WarehousePublicShell {
  return (
    typeof value === "object" &&
    value !== null &&
    "case" in value &&
    "sharedStory" in value &&
    "progress" in value &&
    WAREHOUSE_PHASE_SET.has(String((value as { phase?: unknown }).phase))
  );
}

export function isWarehousePrivateView(value: unknown): value is WarehousePrivateWithShell {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    "lockedAnswer" in value &&
    "rankedBallot" in value
  );
}

export function WarehouseRoom({
  pub,
  priv,
  connected,
  busy,
  run,
  actionError,
  actions,
  warehouseCase,
  goToNewGroup,
}: {
  code: string;
  pub: WarehousePublicShell;
  priv: WarehousePrivateWithShell;
  connected: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  actionError: string;
  actions: RoomActions;
  warehouseCase: WarehouseCaseDefinition;
  goToNewGroup: () => Promise<void>;
}) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [rankedOptionIds, setRankedOptionIds] = useState<readonly string[]>([]);
  const { expired: advisoryExpired } = useDeadlineExpired(pub.advisoryDeadlineAt, pub.serverTime);
  const me = pub.players.find((player) => player.id === priv.playerId);
  const isQuestion = pub.phase === "SILENT_ANSWERING" || pub.phase === "WAITING_FOR_ANSWERS";
  const isResult = pub.phase === "RESULT_REVEAL";

  useEffect(() => {
    setSelectedOptionId(null);
    setRankedOptionIds(pub.patchOptions.map((option) => option.id));
  }, [pub.phaseRevision, pub.patchOptions]);

  const label = storyLabeler(warehouseCase, pub.players);
  const shellClass = `game ${pub.phase === "STORY_BUILDING" ? "gm-lobby" : ""} ${
    isQuestion ? "gm-question" : ""
  } ${isResult ? "gm-result" : ""}`;

  const advance = () => run(actions.acknowledge);
  const storyProgress = `${pub.progress.storyConfirmed} من ${pub.progress.required}`;
  const questionStartProgress = `${pub.progress.questionsStarted} من ${pub.progress.required}`;
  const answerProgress = `${pub.progress.answersLocked} من ${pub.progress.required}`;
  const discussionProgress = `${pub.progress.discussionReady} من ${pub.progress.required}`;
  const ballotProgress = `${pub.progress.ballotsSubmitted} من ${pub.progress.required}`;

  return (
    <main className={shellClass} id="main" data-phase={pub.phase} data-testid="warehouse-room">
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        المرحلة الحالية: {warehousePhaseTitle(pub.phase)}
      </p>
      {!connected && (
        <div className="reconnect-overlay" role="alert">
          <div>
            <p style={{ fontWeight: 700 }}>انقطع الاتصال — نحاول نرجّعك</p>
            <p style={{ color: "var(--muted)" }}>نحفظ سؤالك أو ورقة التصويت لهذا الجهاز.</p>
          </div>
        </div>
      )}

      {isQuestion ? (
        <GameHeader
          variant="question"
          connected={connected}
          caseTitle={chapterTitle(pub.chapter)}
          questionNumber={chapterNumber(pub.chapter)}
          deadlineAt={pub.advisoryDeadlineAt}
          serverTime={pub.serverTime}
        />
      ) : isResult ? (
        <GameHeader variant="result" connected={connected} />
      ) : (
        <GameHeader variant="lobby" connected={connected} />
      )}

      <WarehousePhaseBanner phase={pub.phase} />

      <div className="game__body" key={pub.phase}>
        {actionError && (
          <p className="action-error" role="alert">
            {actionError}
          </p>
        )}

        {pub.phase === "STORY_BUILDING" && (
          <>
            <section className="gm-lobby__intro">
              <p>بناء الرواية</p>
              <h1>اتفقوا على رواية واحدة.</h1>
              <div>اختاروا سبب الدخول، الطريق، حامل المفتاح، أماكنكم عند 23:46، وسبب السيارة.</div>
            </section>
            <StoryBuilder
              pub={pub}
              warehouseCase={warehouseCase}
              busy={busy}
              run={run}
              actions={actions}
            />
            <WarehouseDisconnectedPanel
              pub={pub}
              isHost={Boolean(priv.isHost)}
              busy={busy}
              run={run}
              skipPlayer={actions.skipPlayer}
            />
            <div className="game__actions warehouse-actions">
              <button
                className="btn btn--evidence"
                disabled={busy || !priv.allowedActions.includes("SUBMIT_STORY")}
                onClick={() => run(actions.submitStory)}
              >
                اعتمدوا الرواية للمراجعة
              </button>
            </div>
          </>
        )}

        {pub.phase === "STORY_REVIEW" && (
          <>
            <span className="stamp">مراجعة جماعية</span>
            <h1 className="game__prompt">آخر قراءة قبل الصمت.</h1>
            <SharedStoryList pub={pub} label={label} />
            <ProgressNote label="فهموا الرواية" value={storyProgress} />
            <div className="game__actions warehouse-actions">
              <button
                className="btn btn--evidence"
                disabled={busy || !priv.allowedActions.includes("CONFIRM_STORY")}
                onClick={() => run(actions.reviewStory)}
              >
                فهمت الرواية
              </button>
            </div>
          </>
        )}

        {pub.phase === "SILENT_PHASE_INTRO" && (
          <section
            className="phase-proof phase-proof--pending"
            data-testid="warehouse-silent-intro"
          >
            <span className="phase-proof__index mono">صمت</span>
            <h1 className="game__prompt">مرحلة الصمت.</h1>
            <p>{warehouseCase.copy.silentPhaseIntro.ar}</p>
            <ProgressNote label="بدأوا أسئلتهم" value={questionStartProgress} />
            <button
              className="btn btn--evidence"
              disabled={busy || !priv.allowedActions.includes("START_QUESTION")}
              onClick={() => run(actions.startQuestion)}
            >
              ابدأ سؤالي
            </button>
          </section>
        )}

        {pub.phase === "CHAPTER_CONTEXT" && (
          <>
            <span className="stamp">{chapterTitle(pub.chapter)}</span>
            <h1 className="game__prompt">{pub.currentEvidence?.title.ar}</h1>
            <div className="evidence-private warehouse-evidence" data-testid="warehouse-evidence">
              <bdi className="mono">{pub.currentEvidence?.timestamp}</bdi>
              <p>{pub.currentEvidence?.detail.ar}</p>
            </div>
            <button
              className="btn btn--evidence"
              disabled={busy || !priv.isHost}
              onClick={advance}
            >
              ابدأوا الأسئلة بصمت
            </button>
          </>
        )}

        {isQuestion && (
          <WarehouseQuestionPanel
            pub={pub}
            priv={priv}
            busy={busy}
            advisoryExpired={advisoryExpired || pub.advisoryExpired}
            selectedOptionId={selectedOptionId}
            setSelectedOptionId={setSelectedOptionId}
            run={run}
            actions={actions}
            answerProgress={answerProgress}
          />
        )}

        {pub.phase === "ISSUE_REVEAL" && (
          <>
            <span className="stamp">كشف المشكلة</span>
            <h1 className="game__prompt">وش ما ركب؟</h1>
            <IssueCards issues={pub.revealedIssues} />
            <button
              className="btn btn--evidence"
              disabled={busy || !priv.isHost}
              onClick={advance}
            >
              افتحوا النقاش
            </button>
          </>
        )}

        {pub.phase === "OPEN_DISCUSSION" && (
          <>
            <span className="stamp">نقاش مفتوح</span>
            <h1 className="game__prompt">ناقشوا الترقيع بصوت واضح.</h1>
            <IssueCards issues={pub.revealedIssues} />
            <ProgressNote label="جاهزون للتصويت" value={discussionProgress} />
            <WarehouseDisconnectedPanel
              pub={pub}
              isHost={Boolean(priv.isHost)}
              busy={busy}
              run={run}
              skipPlayer={actions.skipPlayer}
            />
            <div className="game__actions warehouse-actions">
              <button
                className="btn btn--evidence"
                disabled={busy || !priv.allowedActions.includes("READY_FOR_VOTE")}
                onClick={() => run(actions.discussionReady)}
              >
                خلصت نقاش
              </button>
            </div>
          </>
        )}

        {pub.phase === "PATCH_BALLOT" && (
          <>
            <span className="stamp">تصويت ترتيبي</span>
            <h1 className="game__prompt">رتبوا الترقيعات.</h1>
            {(advisoryExpired || pub.advisoryExpired) && (
              <p className="warehouse-advisory" role="status">
                خذ وقتك — بانتظار ترتيبك
              </p>
            )}
            <RankedBallot
              options={pub.patchOptions}
              rankedOptionIds={rankedOptionIds}
              setRankedOptionIds={setRankedOptionIds}
              disabled={busy || priv.rankedBallot !== null}
            />
            <ProgressNote label="سلّموا الترتيب" value={ballotProgress} />
            <WarehouseDisconnectedPanel
              pub={pub}
              isHost={Boolean(priv.isHost)}
              busy={busy}
              run={run}
              skipPlayer={actions.skipPlayer}
            />
            <div className="game__actions warehouse-actions">
              <button
                className="btn btn--evidence"
                disabled={
                  busy ||
                  priv.rankedBallot !== null ||
                  !priv.allowedActions.includes("SUBMIT_RANKED_BALLOT") ||
                  rankedOptionIds.length !== pub.patchOptions.length
                }
                onClick={() => run(() => actions.rankedBallot(rankedOptionIds))}
              >
                ثبّت الترتيب
              </button>
            </div>
          </>
        )}

        {pub.phase === "PATCH_RESOLUTION" && (
          <>
            <span className="stamp">الترقيعة المعتمدة</span>
            <h1 className="game__prompt">{patchLabel(warehouseCase, pub.storyUpdate?.patchId)}</h1>
            <StoryUpdate pub={pub} warehouseCase={warehouseCase} />
            <button
              className="btn btn--evidence"
              disabled={busy || !priv.isHost}
              onClick={advance}
            >
              شوفوا تحديث الرواية
            </button>
          </>
        )}

        {pub.phase === "STORY_UPDATE" && (
          <>
            <span className="stamp">تحديث الرواية</span>
            <h1 className="game__prompt">وش تغير؟</h1>
            <StoryUpdate pub={pub} warehouseCase={warehouseCase} />
            <ProgressNote label="فهموا التعديل" value={storyProgress} />
            <button
              className="btn btn--evidence"
              disabled={busy || !priv.allowedActions.includes("CONFIRM_STORY")}
              onClick={() => run(actions.reviewStory)}
            >
              فهمت التعديل
            </button>
          </>
        )}

        {pub.phase === "RESULT_CALCULATION" && (
          <section className="phase-proof phase-proof--pending" data-testid="warehouse-result-calc">
            <span className="phase-proof__index mono">حساب جماعي</span>
            <h1 className="game__prompt">نراجع الأدلة الثلاثة.</h1>
            <p>الحساب يفشل إذا كانت البيانات ناقصة؛ ما نعطي نتيجة مزيفة.</p>
            <button
              className="btn btn--evidence"
              disabled={busy || !priv.isHost}
              onClick={advance}
            >
              اعرض النتيجة
            </button>
          </section>
        )}

        {isResult && (
          <WarehouseResult
            pub={pub}
            warehouseCase={warehouseCase}
            isHost={Boolean(me && priv.isHost)}
            busy={busy}
            run={run}
            replay={actions.replay}
            goToNewGroup={goToNewGroup}
          />
        )}
      </div>
    </main>
  );
}

function StoryBuilder({
  pub,
  warehouseCase,
  busy,
  run,
  actions,
}: {
  pub: WarehousePublicShell;
  warehouseCase: WarehouseCaseDefinition;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  actions: RoomActions;
}) {
  const label = storyLabeler(warehouseCase, pub.players);
  return (
    <section className="warehouse-story-builder" data-testid="warehouse-story-builder">
      <StoryChoiceGroup
        title="سبب الدخول"
        value={pub.sharedStory.entryReason}
        options={warehouseCase.storyOptions.entryReasons}
        disabled={busy}
        onPick={(value) => run(() => actions.setStory("entryReason", value))}
      />
      <StoryChoiceGroup
        title="طريق الدخول"
        value={pub.sharedStory.entryRoute}
        options={warehouseCase.storyOptions.entryRoutes}
        disabled={busy}
        onPick={(value) => run(() => actions.setStory("entryRoute", value))}
      />
      <StoryChoiceGroup
        title="حامل المفتاح"
        value={pub.sharedStory.keyHolderInitial}
        options={pub.players.map((player) => ({ id: player.id, label: { ar: player.name } }))}
        disabled={busy}
        onPick={(value) => run(() => actions.setStory("keyHolderInitial", value))}
      />
      <StoryChoiceGroup
        title="سبب وجود السيارة"
        value={pub.sharedStory.carPurpose}
        options={warehouseCase.storyOptions.carPurposes}
        disabled={busy}
        onPick={(value) => run(() => actions.setStory("carPurpose", value))}
      />
      <StoryChoiceGroup
        title="مغادرة السيارة قبل 00:05"
        value={String(pub.sharedStory.carDepartureExpected)}
        options={[
          { id: "true", label: { ar: "متوقعة" } },
          { id: "false", label: { ar: "غير متوقعة" } },
        ]}
        disabled={busy}
        onPick={(value) => run(() => actions.setStory("carDepartureExpected", value === "true"))}
      />
      <div className="warehouse-fieldset">
        <h2>أماكن اللاعبين عند 23:46</h2>
        {pub.players.map((player) => (
          <label key={player.id} className="warehouse-select-row">
            <span>{player.name}</span>
            <select
              value={pub.sharedStory.location2346[player.id]}
              disabled={busy}
              onChange={(event) =>
                void run(() =>
                  actions.setStory("location2346", event.currentTarget.value, player.id),
                )
              }
            >
              {warehouseCase.storyOptions.locations.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label.ar}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="warehouse-story-summary">
        <h2>ملخص الرواية الحالية</h2>
        <p>{label.entryReason(pub.sharedStory.entryReason)}</p>
        <p>{label.entryRoute(pub.sharedStory.entryRoute)}</p>
        <p>{label.player(pub.sharedStory.keyHolderInitial)}</p>
      </div>
    </section>
  );
}

function StoryChoiceGroup({
  title,
  value,
  options,
  disabled,
  onPick,
}: {
  title: string;
  value: string;
  options: readonly { id: string; label: { ar: string } }[];
  disabled: boolean;
  onPick: (value: string) => void;
}) {
  return (
    <fieldset className="warehouse-fieldset">
      <legend>{title}</legend>
      <div className="warehouse-choice-grid">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`option-btn ${value === option.id ? "is-selected" : ""}`}
            disabled={disabled}
            aria-pressed={value === option.id}
            onClick={() => onPick(option.id)}
          >
            {option.label.ar}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function WarehouseQuestionPanel({
  pub,
  priv,
  busy,
  advisoryExpired,
  selectedOptionId,
  setSelectedOptionId,
  run,
  actions,
  answerProgress,
}: {
  pub: WarehousePublicView;
  priv: WarehousePrivateView;
  busy: boolean;
  advisoryExpired: boolean;
  selectedOptionId: string | null;
  setSelectedOptionId: (id: string) => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  actions: RoomActions;
  answerProgress: string;
}) {
  const question = priv.question;
  const chosen = priv.lockedAnswer?.fact.value?.toString() ?? selectedOptionId;
  if (!question) {
    return (
      <section className="answer-receipt" aria-live="polite">
        <span className="answer-receipt__label">بانتظار السؤال</span>
        <h1>نجهز ورقتك.</h1>
      </section>
    );
  }
  if (priv.lockedAnswer) {
    return (
      <section className="answer-receipt" aria-live="polite" data-testid="warehouse-answer-wait">
        <span className="answer-receipt__label">إجابة مقفلة · لك فقط</span>
        <h1>{question.options.find((option) => option.id === chosen)?.label.ar ?? "تم التثبيت"}</h1>
        <p>ما نعرض اختيارك لبقية الشلة. ننتظر اكتمال الإجابات قبل كشف المشكلة.</p>
        <ProgressNote label="ثبّتوا إجاباتهم" value={answerProgress} />
      </section>
    );
  }
  return (
    <>
      <p className="gm-question__helper">{chapterTitle(pub.chapter)}</p>
      <h1 className="game__prompt">{question.prompt.ar}</h1>
      {advisoryExpired && (
        <p className="warehouse-advisory" role="status">
          خذ وقتك — بانتظار إجابتك
        </p>
      )}
      <aside className="gm-private-info">
        <span>إجابتك سرية:</span> لا تظهر لبقية اللاعبين قبل اكتمال الجميع.
      </aside>
      <div className="game__actions" role="radiogroup" aria-label="اختر إجابة واحدة">
        {question.options.map((option, index) => (
          <button
            key={option.id}
            role="radio"
            aria-checked={chosen === option.id}
            className={`option-btn ${chosen === option.id ? "is-selected" : ""}`}
            disabled={busy}
            onClick={(event) => {
              setSelectedOptionId(option.id);
              event.currentTarget.focus();
            }}
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              const direction = event.key === "ArrowDown" || event.key === "ArrowLeft" ? 1 : -1;
              const nextIndex =
                (index + direction + question.options.length) % question.options.length;
              const next = question.options[nextIndex]!;
              setSelectedOptionId(next.id);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                [nextIndex]?.focus();
            }}
          >
            <span>{option.label.ar}</span>
            <span className="gm-option-radio" aria-hidden>
              <i />
            </span>
          </button>
        ))}
      </div>
      <ProgressNote label="ثبّتوا إجاباتهم" value={answerProgress} />
      <button
        className="gm-question__confirm"
        type="button"
        disabled={busy || selectedOptionId === null}
        onClick={() => {
          if (!selectedOptionId) return;
          void run(() => actions.answer(question.instanceId, selectedOptionId));
        }}
      >
        ثبّت الإجابة
      </button>
    </>
  );
}

function RankedBallot({
  options,
  rankedOptionIds,
  setRankedOptionIds,
  disabled,
}: {
  options: WarehousePublicView["patchOptions"];
  rankedOptionIds: readonly string[];
  setRankedOptionIds: (ids: readonly string[]) => void;
  disabled: boolean;
}) {
  const optionById = new Map(options.map((option) => [option.id, option]));
  const move = (optionId: string, direction: -1 | 1) => {
    const current = rankedOptionIds.indexOf(optionId);
    const next = current + direction;
    if (current < 0 || next < 0 || next >= rankedOptionIds.length) return;
    const copy = [...rankedOptionIds];
    [copy[current], copy[next]] = [copy[next]!, copy[current]!];
    setRankedOptionIds(copy);
  };
  return (
    <ol className="warehouse-ranked-ballot" data-testid="warehouse-ranked-ballot">
      {rankedOptionIds.map((id, index) => {
        const option = optionById.get(id);
        if (!option) return null;
        return (
          <li key={id}>
            <span className="warehouse-rank mono">{index + 1}</span>
            <div>
              <strong>{option.label.ar}</strong>
              <p>{option.description.ar}</p>
              <small>{option.solves.ar}</small>
              <small>{option.nextPressure.ar}</small>
            </div>
            <div className="warehouse-rank-controls">
              <button
                type="button"
                aria-label={`حرّك ${option.label.ar} للأعلى`}
                disabled={disabled || index === 0}
                onClick={() => move(id, -1)}
              >
                للأعلى
              </button>
              <button
                type="button"
                aria-label={`حرّك ${option.label.ar} للأسفل`}
                disabled={disabled || index === rankedOptionIds.length - 1}
                onClick={() => move(id, 1)}
              >
                للأسفل
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SharedStoryList({
  pub,
  label,
}: {
  pub: WarehousePublicView;
  label: ReturnType<typeof storyLabeler>;
}) {
  return (
    <ul className="features warehouse-story-list" data-testid="warehouse-story-review">
      <li>دخلنا بسبب: {label.entryReason(pub.sharedStory.entryReason)}</li>
      <li>دخلنا من: {label.entryRoute(pub.sharedStory.entryRoute)}</li>
      <li>المفتاح كان مع: {label.player(pub.sharedStory.keyHolderInitial)}</li>
      {pub.players.map((player) => (
        <li key={player.id}>
          عند انقطاع الكهرباء: {player.name} في{" "}
          {label.location(pub.sharedStory.location2346[player.id])}
        </li>
      ))}
      <li>السيارة موجودة من أجل: {label.carPurpose(pub.sharedStory.carPurpose)}</li>
      <li>
        مغادرة السيارة قبل 00:05: {pub.sharedStory.carDepartureExpected ? "متوقعة" : "غير متوقعة"}
      </li>
    </ul>
  );
}

function StoryUpdate({
  pub,
  warehouseCase,
}: {
  pub: WarehousePublicView;
  warehouseCase: WarehouseCaseDefinition;
}) {
  if (!pub.storyUpdate) {
    return <p className="warehouse-advisory">لا توجد ترقيعة معتمدة في هذا الفصل.</p>;
  }
  return (
    <section className="patch-choice-receipt" data-testid="warehouse-story-update">
      <span>تحديث الرواية</span>
      <strong>{patchLabel(warehouseCase, pub.storyUpdate.patchId)}</strong>
      <ul>
        {pub.storyUpdate.factsAfter.map((fact) => (
          <li key={fact.key}>
            {storyFactLabel(fact.key)}: {storyFactValue(fact.value)}
          </li>
        ))}
      </ul>
      {pub.storyUpdate.laterEffects.length > 0 && (
        <p>
          سيضغط هذا القرار على{" "}
          {pub.storyUpdate.laterEffects.map((effect) => chapterTitle(effect.chapter)).join("، ")}.
        </p>
      )}
    </section>
  );
}

function ProgressNote({ label, value }: { label: string; value: string }) {
  return (
    <p className="warehouse-progress" role="status" aria-live="polite">
      {label}: <bdi>{value}</bdi>
    </p>
  );
}

const STORY_FACT_LABELS: Readonly<Record<string, string>> = {
  "movement.selectedPlayer": "حركة اللاعب المحدد",
  gate_open_reason: "سبب فتح بوابة التحميل",
  car_is_relevant: "صلة السيارة بالرواية",
  key_used_after_outage: "استخدام المفتاح بعد الانقطاع",
  gate_reset_actor: "من أعاد تشغيل البوابة",
  loading_check_expected: "توقّع فحص منطقة التحميل",
  inventory_screen_expected: "توقّع فتح شاشة المخزون",
  device_explanation: "تفسير اتصال الجهاز",
  device_location_2348: "مكان الجهاز عند 23:48",
  inventory_access_intentional: "تعمد فتح نظام المخزون",
  device_linked_to_car: "صلة الجهاز بالسيارة",
  car_departure_reason: "سبب مغادرة السيارة",
  car_departure_temporary: "هل كانت المغادرة مؤقتة",
  car_cargo: "حمولة السيارة",
  departure_intentional: "مدى تعمد المغادرة",
};

const STORY_FACT_VALUES: Readonly<Record<string, string>> = {
  fetch_tool: "إحضار أداة",
  to_loading_area_2346_2348: "إلى منطقة التحميل بين 23:46 و23:48",
  manual_reset: "إعادة تشغيل يدوية",
  selected_player: "اللاعب المحدد",
  check_goods: "فحص البضاعة",
  shared_tablet: "جهاز لوحي مشترك",
  auto_connected_phone: "هاتف اتصل تلقائيًا",
  device_in_car: "الجهاز داخل السيارة",
  admin_office: "المكتب الإداري",
  admin_office_range: "ضمن نطاق المكتب الإداري",
  parking_near_admin: "المواقف قرب المكتب الإداري",
  tool_run: "مشوار لإحضار أداة",
  move_goods: "نقل البضاعة",
  clear_gate: "إخلاء البوابة",
  goods: "بضاعة",
  none: "بلا حمولة",
  limited: "بشكل محدود",
};

function storyFactLabel(key: string): string {
  return STORY_FACT_LABELS[key] ?? "تفصيلة محدّثة";
}

function storyFactValue(value: unknown): string {
  if (value === true) return "نعم";
  if (value === false) return "لا";
  if (value === null || value === undefined) return "غير محدد";
  return STORY_FACT_VALUES[String(value)] ?? String(value).replaceAll("_", " ");
}

function storyLabeler(
  warehouseCase: WarehouseCaseDefinition,
  players: WarehousePublicView["players"],
) {
  return {
    entryReason: (id: string) =>
      warehouseCase.storyOptions.entryReasons.find((option) => option.id === id)?.label.ar ?? id,
    entryRoute: (id: string) =>
      warehouseCase.storyOptions.entryRoutes.find((option) => option.id === id)?.label.ar ?? id,
    location: (id: string | undefined) =>
      warehouseCase.storyOptions.locations.find((option) => option.id === id)?.label.ar ?? id ?? "",
    carPurpose: (id: string) =>
      warehouseCase.storyOptions.carPurposes.find((option) => option.id === id)?.label.ar ?? id,
    player: (id: string) => players.find((player) => player.id === id)?.name ?? id,
  };
}

function patchLabel(warehouseCase: WarehouseCaseDefinition, patchId: string | undefined) {
  return (
    warehouseCase.patchOptions.find((option) => option.id === patchId)?.publicLabel.ar ??
    "ترقيعة الرواية"
  );
}

function warehousePhaseTitle(phase: WarehousePhase): string {
  const map: Record<WarehousePhase, string> = {
    STORY_BUILDING: "بناء الرواية",
    STORY_REVIEW: "مراجعة الرواية",
    SILENT_PHASE_INTRO: "مرحلة الصمت",
    CHAPTER_CONTEXT: "سياق الفصل",
    SILENT_ANSWERING: "إجابات صامتة",
    WAITING_FOR_ANSWERS: "انتظار الإجابات",
    ISSUE_REVEAL: "كشف المشكلة",
    OPEN_DISCUSSION: "نقاش مفتوح",
    PATCH_BALLOT: "تصويت الترقيع",
    PATCH_RESOLUTION: "اعتماد الترقيعة",
    STORY_UPDATE: "تحديث الرواية",
    RESULT_CALCULATION: "حساب النتيجة",
    RESULT_REVEAL: "النتيجة",
  };
  return map[phase];
}

function chapterTitle(chapter: string): string {
  const map: Record<string, string> = {
    story: "الرواية المشتركة",
    power: "انقطاع الكهرباء",
    device: "اتصال الجهاز",
    car: "مغادرة السيارة",
    result: "النتيجة",
  };
  return map[chapter] ?? chapter;
}

function chapterNumber(chapter: string): number {
  const map: Record<string, number> = { power: 1, device: 2, car: 3 };
  return map[chapter] ?? 1;
}
