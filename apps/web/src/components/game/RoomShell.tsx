"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WAREHOUSE_CASE_ID, warehouseCaseV1 } from "@al-riwayah/content";
import {
  PHASE_SEQUENCE,
  phaseIndex,
  type GameCase,
  type PrivatePlayerView,
  type PublicRoomView,
  type WarehouseCaseDefinition,
} from "@al-riwayah/game-engine";
import { useGameRoom } from "@/lib/useGameRoom";
import { DeadlineRing, useDeadlineExpired } from "./DeadlineRing";
import { GameHeader } from "./GameHeader";
import { PreferenceControls } from "../PreferenceControls";
import { playCue, type Cue } from "@/lib/sound";
import { WarehouseRoom, isWarehousePrivateView, isWarehousePublicView } from "./WarehouseRoom";
import { BankRoom, isBankPrivateView, isBankPublicView } from "./BankRoom";

const PHASE_CUE: Record<string, Cue> = {
  PRIVATE_EVIDENCE: "evidence",
  CONTRADICTION_REVEAL_1: "contradiction",
  CONTRADICTION_REVEAL_2: "contradiction",
  PATCH_1: "patch",
  PATCH_2: "patch",
  SURPRISE_EVIDENCE: "evidence",
  VERDICT: "verdict",
};

const INTERROGATION = new Set([
  "INTERROGATION_FOUNDATION",
  "INTERROGATION_GAPS",
  "INTERROGATION_NO_GOOD_ANSWER",
  "INTERROGATION_FOLLOWUP",
  "FINAL_QUESTION",
]);

function isLegacyPrivateView(value: unknown): value is PrivatePlayerView {
  return (
    typeof value === "object" &&
    value !== null &&
    "currentQuestion" in value &&
    "answerLocked" in value
  );
}

export function RoomShell({ code }: { code: string }) {
  const router = useRouter();
  const { pub, priv, connected, connectionStage, fatal, actions } = useGameRoom(code);
  const [busy, setBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [showAnswerReceipt, setShowAnswerReceipt] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedPatchLabel, setSelectedPatchLabel] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const { expired: deadlineExpired } = useDeadlineExpired(pub?.deadlineAt ?? null, pub?.serverTime ?? 0);
  const warehouseCase = useMemo<WarehouseCaseDefinition | undefined>(
    () => (pub?.caseId === WAREHOUSE_CASE_ID ? warehouseCaseV1 : undefined),
    [pub],
  );
  const gameCase = warehouseCase as unknown as GameCase | undefined;
  const lastPhase = useRef<string | null>(null);

  useEffect(() => {
    if (!pub) return;
    if (lastPhase.current !== null && lastPhase.current !== pub.phase) {
      const cue = PHASE_CUE[pub.phase];
      if (cue) playCue(cue);
    }
    lastPhase.current = pub.phase;
  }, [pub]);

  useEffect(() => {
    setShowAnswerReceipt(false);
    if (!isLegacyPrivateView(priv) || !priv.answerLocked) return;
    const id = setTimeout(() => setShowAnswerReceipt(true), 650);
    return () => clearTimeout(id);
  }, [isLegacyPrivateView(priv) ? priv.answerLocked : false, pub?.phaseRevision]);

  useEffect(() => {
    setSelectedPatchLabel(null);
    setSelectedOptionId(null);
    setActionError("");
  }, [pub?.phaseRevision]);

  if (fatal === "NO_SESSION") {
    return (
      <main className="game" id="main">
        <div className="game__body">
          <h1>ما دخلت الغرفة بعد</h1>
          <p style={{ color: "var(--muted)" }}>تحتاج تدخل باسمك ورمز الغرفة أول.</p>
          <Link className="btn btn--evidence" href={`/join?code=${encodeURIComponent(code)}`}>
            ادخل برمز {code}
          </Link>
        </div>
      </main>
    );
  }

  if (fatal === "SESSION_REPLACED" || fatal === "SERVER_UNAVAILABLE") {
    const replaced = fatal === "SESSION_REPLACED";
    return (
      <main className="game" id="main">
        <div className="game__body" role="alert">
          <span className="stamp">{replaced ? "تم نقل الجلسة" : "تعذّر الاتصال"}</span>
          <h1 className="game__prompt">
            {replaced ? "انفتحت جلستك من جهاز ثاني" : "الخادم ما رد"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            {replaced
              ? "حفاظًا على خصوصية إجاباتك، هذا الجهاز ما عاد يقدر يرسل قرارات."
              : "حاولنا إيقاظ خادم اللعبة وإعادة الاتصال لمدة دقيقة. انتظر شوي ثم جرّب مرة ثانية."}
          </p>
          <div className="game__actions">
            <button className="btn btn--evidence" onClick={() => window.location.reload()}>
              حاول مرة ثانية
            </button>
            <Link className="btn btn--ghost" href="/join">
              ارجع للدخول
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!pub || !priv) {
    return (
      <main className="game" id="main">
        <div className="game__body" aria-busy="true">
          <p className="eyebrow">اتصال مشفّر</p>
          <h1 className="game__prompt">نرجّع جلستك.</h1>
          <p className="connection-status" role="status" aria-live="polite">
            {connectionStage === "retrying"
              ? "خادم اللعبة يصحى — مستمرين بالمحاولة، لا تقفل الصفحة."
              : "نثبّت الاتصال ونستعيد آخر حالة آمنة…"}
          </p>
        </div>
      </main>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError("");
    try {
      await fn();
    } catch {
      setActionError("ما ثبت القرار. حدّثنا حالة الغرفة؛ راجع اختيارك وحاول مرة ثانية.");
    } finally {
      setBusy(false);
    }
  };
  const goToNewGroup = async () => {
    setBusy(true);
    setActionError("");
    try {
      const session = await actions.newGroup();
      router.push(`/room/${session.roomCode}`);
    } catch {
      setActionError("تعذّر فتح مجموعة جديدة. حاول مرة ثانية.");
    } finally {
      setBusy(false);
    }
  };

  if (isBankPublicView(pub) && isBankPrivateView(priv)) {
    return (
      <BankRoom
        pub={pub}
        priv={priv}
        connected={connected}
        busy={busy}
        run={run}
        actionError={actionError}
        actions={actions}
        goToNewGroup={goToNewGroup}
      />
    );
  }

  if (isWarehousePublicView(pub) && isWarehousePrivateView(priv) && warehouseCase) {
    return (
      <WarehouseRoom
        code={code}
        pub={pub}
        priv={priv}
        connected={connected}
        busy={busy}
        run={run}
        actionError={actionError}
        actions={actions}
        warehouseCase={warehouseCase}
        goToNewGroup={goToNewGroup}
      />
    );
  }

  const legacyPub = pub as PublicRoomView;
  const legacyPriv = priv as PrivatePlayerView;

  const me = legacyPub.players.find((p) => p.id === legacyPriv.playerId);
  const phase = legacyPub.phase;
  const submittedOptionLabel = legacyPriv.currentQuestion?.options.find(
    (option) => option.id === legacyPriv.submittedOptionId,
  )?.label.ar;
  const shareRoom = async () => {
    const url = `${window.location.origin}/join?code=${encodeURIComponent(legacyPub.roomCode)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "الرواية — غرفة تحقيق",
          text: `ادخل غرفة الرواية بالرمز ${legacyPub.roomCode}`,
          url,
        });
        setShareStatus("تمت المشاركة");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("تم نسخ رابط الدخول");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("تعذّر النسخ — شارك الرمز الظاهر");
    }
  };

  const playerName = (id: string) => legacyPub.players.find((p) => p.id === id)?.name ?? id;
  const reasonLabel = (id: string) =>
    gameCase?.planning.reasons.find((r) => r.id === id)?.label.ar ?? id;
  const locationLabel = (id: string) =>
    gameCase?.planning.locations.find((l) => l.id === id)?.label.ar ?? id;
  const roleLabel = (id: string) =>
    gameCase?.planning.roles.find((r) => r.id === id)?.label.ar ?? id;
  const isQuestion = INTERROGATION.has(phase);
  const isResult = phase === "VERDICT" || phase === "RESULTS";

  return (
    <main
      className={`game ${phase === "LOBBY" ? "gm-lobby" : ""} ${
        isQuestion ? "gm-question" : ""
      } ${isResult ? "gm-result" : ""}`}
      id="main"
      data-phase={phase}
    >
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        المرحلة الحالية: {phaseTitle(phase)}
      </p>
      {!connected && (
        <div className="reconnect-overlay" role="alert">
          <div>
            <p style={{ fontWeight: 700 }}>انقطع الاتصال — نحاول نرجّعك</p>
            <p style={{ color: "var(--muted)" }}>خلّ جوالك مفتوح.</p>
          </div>
        </div>
      )}

      {phase === "LOBBY" ? (
        <GameHeader variant="lobby" connected={connected} />
      ) : isQuestion ? (
        <GameHeader
          variant="question"
          connected={connected}
          caseTitle={gameCase?.title.ar}
          questionNumber={questionNumber(phase)}
          deadlineAt={legacyPub.deadlineAt}
          serverTime={legacyPub.serverTime}
        />
      ) : isResult ? (
        <GameHeader variant="result" connected={connected} />
      ) : (
        <div className="game__top">
          <div className="game__phase">
            <span>{phaseTitle(phase)}</span>
            <bdi className="mono">
              {String(phaseIndex(phase) + 1).padStart(2, "0")} / {PHASE_SEQUENCE.length}
            </bdi>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <PreferenceControls compact />
            <DeadlineRing deadlineAt={legacyPub.deadlineAt} serverTime={legacyPub.serverTime} />
          </div>
        </div>
      )}

      {isQuestion && (
        <p className="game__banner" aria-live="polite">
          من هنا كل واحد لحاله — لا تتكلمون
        </p>
      )}

      <div className="game__body" key={phase}>
        {actionError && (
          <p className="action-error" role="alert">
            {actionError}
          </p>
        )}
        {/* LOBBY */}
        {phase === "LOBBY" && (
          <>
            <section className="gm-lobby__intro">
              <p>الجلسة جاهزة</p>
              <h1>جمّعوا الشلة.</h1>
              <div>
                شارك الرمز، وخليكم جاهزين. تبدأ اللعبة لما يدخل ٤ لاعبين على
                <br />
                الأقل.
              </div>
            </section>
            <section className="gm-room-card" aria-label="رمز الغرفة">
              <div>
                <span>رمز الغرفة</span>
                <bdi className="room-code">{legacyPub.roomCode}</bdi>
              </div>
              <button type="button" onClick={() => void shareRoom()} aria-label="شارك رابط الدخول">
                ↗
              </button>
            </section>
            <p className="share-status" aria-live="polite">
              {shareStatus}
            </p>
            <ul className="roster">
              {legacyPub.players.map((p) => (
                <li key={p.id}>
                  <span className="gm-player-avatar" aria-hidden>
                    {p.name.trim().charAt(0)}
                  </span>
                  <span className="gm-player-identity">
                    <strong>{p.name}</strong>
                    <small>
                      {!p.connected ? "غير متصل" : p.isHost ? "منشئ الغرفة" : "دخل قبل شوي"}
                    </small>
                  </span>
                  <span
                    className={`gm-player-badge ${
                      p.ready ? "gm-player-badge--ready" : "gm-player-badge--waiting"
                    }`}
                  >
                    {p.ready ? "جاهز" : "ينتظر"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="game__actions">
              <button
                className={`btn ${me?.ready ? "btn--ghost" : "btn--evidence"}`}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await actions.setReady(!me?.ready);
                    playCue("ready");
                  })
                }
              >
                {me?.ready ? "ألغِ الجاهزية" : "جاهز"}
              </button>
              {me?.isHost && (
                <button
                  className="btn"
                  disabled={busy || legacyPub.players.length < 4 || !legacyPub.players.every((p) => p.ready)}
                  onClick={() => run(actions.start)}
                >
                  ابدأ التحقيق
                </button>
              )}
              {me?.isHost && legacyPub.players.length < 4 && (
                <p style={{ color: "var(--muted)", textAlign: "center" }}>
                  نحتاج ٤ لاعبين على الأقل
                </p>
              )}
            </div>
          </>
        )}

        {/* CASE BRIEF */}
        {phase === "CASE_BRIEF" && gameCase && (
          <>
            <h1 className="game__prompt">{gameCase.title.ar}</h1>
            <p>{gameCase.premise.ar}</p>
            <ul className="features">
              {legacyPub.evidence.map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{e.title.ar}</strong> — {e.detail.ar}
                  </span>
                </li>
              ))}
            </ul>
            <AckBar priv={legacyPriv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* PRIVATE EVIDENCE */}
        {phase === "PRIVATE_EVIDENCE" && (
          <>
            <p className="eyebrow">هذا الدليل عندك لحالك</p>
            {legacyPriv.privateEvidence ? (
              <div className="evidence-private">
                <h2 style={{ marginTop: 0 }}>{legacyPriv.privateEvidence.title.ar}</h2>
                <p style={{ margin: 0 }}>{legacyPriv.privateEvidence.detail.ar}</p>
              </div>
            ) : (
              <p>ما عندك دليل خاص هالجولة.</p>
            )}
            <p style={{ color: "var(--muted)" }}>لا تورّي شاشتك لأحد.</p>
            <AckBar priv={legacyPriv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* PLAN: REASON */}
        {phase === "PLAN_REASON" && gameCase && (
          <PlanPicker
            title="ليش دخلتوا الشركة؟"
            options={gameCase.planning.reasons.map((r) => ({ id: r.id, label: r.label.ar }))}
            busy={busy}
            onPick={(v) =>
              run(async () => {
                await actions.propose("reason", v);
                await actions.confirm("reason");
              })
            }
          />
        )}

        {/* PLAN: LOCATIONS */}
        {phase === "PLAN_LOCATIONS" && gameCase && me && (
          <PlanPicker
            title="وين كنت وقت انطفت الكهرباء؟"
            options={gameCase.planning.locations.map((l) => ({ id: l.id, label: l.label.ar }))}
            busy={busy}
            onPick={(v) =>
              run(async () => {
                await actions.propose(`location.${me.id}`, v);
                await actions.confirm(`location.${me.id}`);
              })
            }
          />
        )}

        {/* PLAN: ROLES */}
        {phase === "PLAN_ROLES" && gameCase && (
          <RolesPicker
            roles={gameCase.planning.roles.map((r) => ({ id: r.id, label: r.label.ar }))}
            players={legacyPub.players.map((p) => ({ id: p.id, name: p.name }))}
            busy={busy}
            onPick={(roleId, playerId) =>
              run(async () => {
                await actions.propose(`role.${roleId}`, playerId);
                await actions.confirm(`role.${roleId}`);
              })
            }
          />
        )}

        {/* PLAN: REVIEW */}
        {phase === "PLAN_REVIEW" && (
          <>
            <h1 className="game__prompt">آخر مراجعة</h1>
            <p style={{ color: "var(--muted)" }}>بعدها تختفي الرواية.</p>
            <ul className="features">
              {legacyPub.releasedStory["reason"] && (
                <li>
                  <span>السبب: {reasonLabel(legacyPub.releasedStory["reason"])}</span>
                </li>
              )}
              {gameCase?.planning.roles.map((r) => {
                const pid = legacyPub.releasedStory[`role.${r.id}`];
                return pid ? (
                  <li key={r.id}>
                    <span>
                      {roleLabel(r.id)}: {playerName(pid)}
                    </span>
                  </li>
                ) : null;
              })}
              {legacyPub.players.map((p) => {
                const loc = legacyPub.releasedStory[`location.${p.id}`];
                return loc ? (
                  <li key={p.id}>
                    <span>
                      {p.name}: {locationLabel(loc)}
                    </span>
                  </li>
                ) : null;
              })}
            </ul>
            <AckBar priv={legacyPriv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* INTERROGATION / FINAL */}
        {INTERROGATION.has(phase) && (
          <>
            {legacyPriv.currentQuestion ? (
              !legacyPriv.answerLocked && deadlineExpired ? (
                <ExpiredDeadlineReceipt />
              ) : legacyPriv.answerLocked && showAnswerReceipt ? (
                <section className="answer-receipt" aria-live="polite">
                  <span className="answer-receipt__label">إجابة مقفلة · لك فقط</span>
                  <h1>{submittedOptionLabel ?? "تم تثبيت الإجابة"}</h1>
                  <p>
                    ما نعرض اختيارك لبقية الشلة. ننتظر اكتمال الإجابات قبل كشف النسخة
                    التالية من الرواية.
                  </p>
                  <div className="answer-receipt__wait" aria-hidden="true">
                    <span />
                  </div>
                  <strong>بانتظار بقية الشلة</strong>
                </section>
              ) : (
                <>
                <h1 className="game__prompt">{legacyPriv.currentQuestion.prompt.ar}</h1>
                <p className="gm-question__helper">
                  اختر اللي تتذكره أنه جزء من الرواية. ما تقدر ترجع بعد التثبيت.
                </p>
                <aside className="gm-private-info">
                  <span>المعلومة الخاصة بك:</span>{" "}
                  {legacyPriv.privateEvidence?.detail.ar ??
                    "الدليل اللي وصلك قبل التحقيق يخص إجابتك وحدك."}
                </aside>
                <div className="game__actions" role="radiogroup" aria-label="اختر إجابة واحدة">
                  {legacyPriv.currentQuestion.options.map((o) => (
                    <button
                      key={o.id}
                      role="radio"
                      aria-checked={
                        (legacyPriv.submittedOptionId ?? selectedOptionId) === o.id
                      }
                      className={`option-btn ${
                        (legacyPriv.submittedOptionId ?? selectedOptionId) === o.id
                          ? "is-selected"
                          : ""
                      }`}
                      disabled={legacyPriv.answerLocked || busy}
                      onClick={(event) => {
                        setSelectedOptionId(o.id);
                        event.currentTarget.focus();
                      }}
                      onKeyDown={(event) => {
                        if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                          return;
                        }
                        event.preventDefault();
                        const options = legacyPriv.currentQuestion!.options;
                        const currentIndex = options.findIndex((option) => option.id === o.id);
                        const direction =
                          event.key === "ArrowDown" || event.key === "ArrowLeft" ? 1 : -1;
                        const nextIndex = (currentIndex + direction + options.length) % options.length;
                        const nextOption = options[nextIndex]!;
                        setSelectedOptionId(nextOption.id);
                        const buttons =
                          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                            '[role="radio"]',
                          );
                        buttons?.[nextIndex]?.focus();
                      }}
                    >
                      <span>{o.label.ar}</span>
                      <span className="gm-option-radio" aria-hidden>
                        <i />
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  className="gm-question__confirm"
                  type="button"
                  disabled={
                    legacyPriv.answerLocked || busy || deadlineExpired || selectedOptionId === null
                  }
                  aria-label="ثبّت الإجابة"
                  onClick={() => {
                    if (!selectedOptionId || !legacyPriv.currentQuestion) return;
                    void run(async () => {
                      await actions.answer(legacyPriv.currentQuestion!.instanceId, selectedOptionId);
                      playCue("lock");
                    });
                  }}
                >
                  ثبّت الإجابة
                </button>
                {legacyPriv.answerLocked && (
                  <p
                    className="gm-question__locked"
                    aria-live="polite"
                    style={{ textAlign: "center", color: "var(--success-600)", fontWeight: 700 }}
                  >
                    تم تثبيت إجابتك — ارفع نظرك وانتظر البقية
                  </p>
                )}
                </>
              )
            ) : (
              <p>بانتظار السؤال…</p>
            )}
          </>
        )}

        {/* CONTRADICTION REVEAL */}
        {(phase === "CONTRADICTION_REVEAL_1" || phase === "CONTRADICTION_REVEAL_2") && (
          <>
            <span className="stamp">تناقض مسجّل</span>
            {legacyPub.releasedContradiction ? (
              <>
                <h1 className="game__prompt" style={{ marginTop: "var(--space-4)" }}>
                  كلامكم ما يركب
                </h1>
                <div className="demo__statements">
                  <div className="statement">
                    <span className="eyebrow">الشهادة الأولى</span>
                    <p style={{ margin: "var(--space-3) 0 0" }}>
                      {legacyPub.releasedContradiction.statementA.ar}
                    </p>
                  </div>
                  <div className="statement is-flagged">
                    <span className="eyebrow">الشهادة المقابلة</span>
                    <p style={{ margin: "var(--space-3) 0 0" }}>
                      {legacyPub.releasedContradiction.statementB.ar}
                    </p>
                  </div>
                </div>
                <p className="demo__rule">{legacyPub.releasedContradiction.rule.ar}</p>
              </>
            ) : (
              <section className="phase-proof phase-proof--clear" aria-label="نتيجة فحص التناقض">
                <span className="phase-proof__index mono">فحص ٠١</span>
                <h1 className="game__prompt">إلى الآن، ما انكسر شيء.</h1>
                <p>
                  ما ظهر تناقض واضح بين الشهادات الحالية. الرواية ما زالت متماسكة،
                  والتحقيق ينتقل إلى النقطة التالية.
                </p>
                <div className="phase-proof__status" aria-hidden="true">
                  <span />
                  <span />
                  <span className="is-current" />
                </div>
              </section>
            )}
          </>
        )}

        {/* PATCH */}
        {(phase === "PATCH_1" || phase === "PATCH_2") && (
          <>
            <h1 className="game__prompt">
              {legacyPub.patchOptions?.length ? "رقّعوا الرواية" : "النسخة الحالية ثابتة."}
            </h1>
            <p style={{ color: "var(--muted)" }}>
              {legacyPub.patchOptions?.length
                ? "كل حل بيفتح عليكم سؤال جديد."
                : "ما فيه تعديل يحتاج تصويتًا في هذه الجولة."}
            </p>
            {legacyPub.patchOptions?.length ? (
              deadlineExpired && selectedPatchLabel === null ? (
                <ExpiredDeadlineReceipt />
              ) : (
              <div className="game__actions">
                {legacyPub.patchOptions.map((p) => (
                  <button
                    key={p.id}
                    className="option-btn"
                    disabled={busy || selectedPatchLabel !== null || deadlineExpired}
                    onClick={() =>
                      run(async () => {
                        await actions.patchVote(p.id);
                        setSelectedPatchLabel(p.label.ar);
                      })
                    }
                  >
                    <strong>{p.label.ar}</strong>
                    <br />
                    <span style={{ color: "var(--muted)", fontWeight: 400 }}>{p.description.ar}</span>
                  </button>
                ))}
                {selectedPatchLabel && (
                  <div className="patch-choice-receipt" role="status">
                    <span>الترقيعة المختارة</span>
                    <strong>{selectedPatchLabel}</strong>
                    <p>صارت التزامًا جديدًا على الرواية، وبيُبنى عليها السؤال القادم.</p>
                  </div>
                )}
              </div>
              )
            ) : (
              <section className="phase-proof phase-proof--pending" aria-live="polite">
                <span className="phase-proof__index mono">مراجعة الشهادات</span>
                <p>
                  ما فيه تناقض يحتاج تصويتًا الآن. نثبّت النسخة الحالية ونجهّز السؤال
                  التالي.
                </p>
                <div className="phase-proof__track" aria-hidden="true">
                  <span />
                </div>
              </section>
            )}
          </>
        )}

        {/* SURPRISE EVIDENCE */}
        {phase === "SURPRISE_EVIDENCE" && (
          <>
            <span className="stamp">دليل جديد</span>
            {legacyPub.evidence.slice(-1).map((e) => (
              <div key={e.id} className="evidence-private" style={{ marginTop: "var(--space-4)" }}>
                <h2 style={{ marginTop: 0 }}>{e.title.ar}</h2>
                <p style={{ margin: 0 }}>{e.detail.ar}</p>
              </div>
            ))}
            <AckBar priv={legacyPriv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* VERDICT / RESULTS */}
        {(phase === "VERDICT" || phase === "RESULTS") && legacyPub.result && (
          <>
            <section className="gm-verdict-panel">
              <div className="gm-verdict-copy">
                <span>الحكم النهائي</span>
                <h1>
                  روايتكم
                  <br />
                  <em>{legacyPub.result.label.ar}</em>
                </h1>
              </div>
              <div className="gm-score-orbit" aria-label={`النتيجة ${legacyPub.result.composite} من 100`}>
                <strong className="verdict-band">{legacyPub.result.composite}</strong>
                <span>من 100</span>
              </div>
            </section>
            <section className="gm-metrics" aria-label="مقاييس النتيجة">
              <MetricCard label="الاتساق" value={legacyPub.result.scores.consistency} />
              <MetricCard label="المعقولية" value={legacyPub.result.scores.plausibility} />
              <MetricCard label="الثبات" value={legacyPub.result.scores.stability} />
            </section>
            <div className="result-story" aria-label="ملخص التحقيق">
              {legacyPub.result.firstFracture && (
                <div className="gm-recap gm-recap--danger">
                  <header>
                    <span>أسوأ تناقض</span>
                    {legacyPub.result.primarySuspectPlayerName && (
                      <b>{legacyPub.result.primarySuspectPlayerName}</b>
                    )}
                  </header>
                  <p>{legacyPub.result.firstFracture.ar}</p>
                  <small>هذا الجواب رفع الشك وفتح سؤالين إضافيين على المجموعة.</small>
                </div>
              )}
              {legacyPub.result.strongestPatch && (
                <div className="gm-recap gm-recap--success">
                  <header>
                    <span>أفضل ترقيعة</span>
                    {legacyPub.result.mostConsistentPlayerName && (
                      <b>{legacyPub.result.mostConsistentPlayerName}</b>
                    )}
                  </header>
                  <p>{legacyPub.result.strongestPatch.ar}</p>
                </div>
              )}
              {legacyPub.result.costliestPatch &&
                legacyPub.result.costliestPatch.ar !== legacyPub.result.strongestPatch?.ar && (
                <div className="gm-recap">
                  <span className="eyebrow">ترقيعة مكلفة</span>
                  <p>{legacyPub.result.costliestPatch.ar}</p>
                </div>
                )}
              {legacyPub.result.mostConsistentPlayerName && (
                <div>
                  <span className="eyebrow">أقوى شاهد</span>
                  <p>{legacyPub.result.mostConsistentPlayerName}</p>
                </div>
              )}
              {legacyPub.result.primarySuspectPlayerName && (
                <div className="is-pressure">
                  <span className="eyebrow">أكثر شخص ضرّ الرواية</span>
                  <p>{legacyPub.result.primarySuspectPlayerName}</p>
                </div>
              )}
            </div>
            <div className="axes gm-result__legacy-axes" aria-hidden="true">
              <ScoreAxis label="تماسك الرواية" v={legacyPub.result.scores.consistency} />
              <ScoreAxis label="معقولية الرواية" v={legacyPub.result.scores.plausibility} />
              <ScoreAxis label="الثبات" v={legacyPub.result.scores.stability} />
              <ScoreAxis label="التهرّب" v={legacyPub.result.scores.evasion} evasion />
            </div>
            {legacyPub.result.decisiveFactors.length > 0 && (
              <ul className="features">
                {legacyPub.result.decisiveFactors.map((f, i) => (
                  <li key={i}>
                    <span>{f.ar}</span>
                  </li>
                ))}
              </ul>
            )}
            {phase === "RESULTS" && (
              <div className="game__actions">
                {me?.isHost && (
                  <button
                    className="btn btn--evidence"
                    disabled={busy}
                    onClick={() => run(actions.replay)}
                  >
                    أعيدوا القضية
                  </button>
                )}
                {me?.isHost ? (
                  <button className="btn btn--ghost" disabled={busy} onClick={goToNewGroup}>
                    مجموعة جديدة
                  </button>
                ) : (
                  <Link className="btn btn--ghost" href="/create">
                    أنشئ مجموعة جديدة
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ExpiredDeadlineReceipt() {
  return (
    <section className="answer-receipt answer-receipt--expired" role="status" aria-live="polite">
      <span className="answer-receipt__label">انتهى وقت هذه الخطوة</span>
      <h1>بانتظار انتقال المرحلة</h1>
      <p>
        أُغلقت الاختيارات على هذا الجهاز. الخادم يراجع ما وصل من الشلة وينقل الجميع
        للخطوة التالية.
      </p>
      <div className="answer-receipt__wait" aria-hidden="true">
        <span />
      </div>
      <strong>لا تحتاج تسوي شيء الآن</strong>
    </section>
  );
}

function AckBar({
  priv,
  busy,
  onAck,
}: {
  priv: { allowedActions: string[] };
  busy: boolean;
  onAck: () => void;
}) {
  const waiting = priv.allowedActions.includes("WAIT");
  return (
    <div className="game__actions">
      <button className="btn" disabled={busy || waiting} onClick={onAck}>
        {waiting ? "بانتظار البقية…" : "جاهز، كمّل"}
      </button>
    </div>
  );
}

function PlanPicker({
  title,
  options,
  busy,
  onPick,
}: {
  title: string;
  options: { id: string; label: string }[];
  busy: boolean;
  onPick: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <h1 className="game__prompt">{title}</h1>
      <div className="game__actions" role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={picked === o.id}
            className={`option-btn ${picked === o.id ? "is-selected" : ""}`}
            disabled={busy}
            onClick={() => {
              setPicked(o.id);
              onPick(o.id);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

function RolesPicker({
  roles,
  players,
  busy,
  onPick,
}: {
  roles: { id: string; label: string }[];
  players: { id: string; name: string }[];
  busy: boolean;
  onPick: (roleId: string, playerId: string) => void;
}) {
  return (
    <>
      <h1 className="game__prompt">وزّعوا الأدوار</h1>
      {roles.map((r) => (
        <div key={r.id} style={{ marginBottom: "var(--space-4)" }}>
          <p style={{ fontWeight: 700, margin: "0 0 8px" }}>{r.label}</p>
          <div className="roster">
            {players.map((p) => (
              <button
                key={p.id}
                className="option-btn"
                style={{ width: "auto", minHeight: 44 }}
                disabled={busy}
                onClick={() => onPick(r.id, p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ScoreAxis({ label, v, evasion }: { label: string; v: number; evasion?: boolean }) {
  return (
    <div className={`axis ${evasion ? "is-evasion" : ""}`}>
      <div className="label">
        <span>{label}</span>
        <span className="mono">{v}</span>
      </div>
      <div className="bar">
        <span style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="gm-metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function phaseTitle(phase: string): string {
  const map: Record<string, string> = {
    LOBBY: "الغرفة",
    CASE_BRIEF: "القضية",
    PRIVATE_EVIDENCE: "دليلك الخاص",
    PLAN_REASON: "التخطيط · السبب",
    PLAN_LOCATIONS: "التخطيط · الأماكن",
    PLAN_ROLES: "التخطيط · الأدوار",
    PLAN_REVIEW: "المراجعة",
    INTERROGATION_FOUNDATION: "التحقيق",
    INTERROGATION_GAPS: "التحقيق",
    INTERROGATION_NO_GOOD_ANSWER: "التحقيق",
    INTERROGATION_FOLLOWUP: "التحقيق",
    CONTRADICTION_REVEAL_1: "تناقض",
    CONTRADICTION_REVEAL_2: "تناقض",
    PATCH_1: "الترقيع",
    PATCH_2: "الترقيع",
    SURPRISE_EVIDENCE: "دليل جديد",
    FINAL_QUESTION: "السؤال الأخير",
    VERDICT: "الحكم",
    RESULTS: "النتيجة",
  };
  return map[phase] ?? phase;
}

function questionNumber(phase: string): number {
  const map: Record<string, number> = {
    INTERROGATION_FOUNDATION: 1,
    INTERROGATION_GAPS: 2,
    INTERROGATION_NO_GOOD_ANSWER: 3,
    INTERROGATION_FOLLOWUP: 4,
    FINAL_QUESTION: 5,
  };
  return map[phase] ?? 1;
}
