"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getCase } from "@al-riwayah/content";
import type { GameCase } from "@al-riwayah/game-engine";
import { useGameRoom } from "@/lib/useGameRoom";
import { DeadlineRing } from "./DeadlineRing";

const INTERROGATION = new Set([
  "INTERROGATION_FOUNDATION",
  "INTERROGATION_GAPS",
  "INTERROGATION_NO_GOOD_ANSWER",
  "INTERROGATION_FOLLOWUP",
  "FINAL_QUESTION",
]);

export function RoomShell({ code }: { code: string }) {
  const { pub, priv, connected, fatal, actions } = useGameRoom(code);
  const [busy, setBusy] = useState(false);
  const gameCase = useMemo<GameCase | undefined>(() => (pub ? getCase(pub.caseId) : undefined), [pub]);

  if (fatal === "NO_SESSION") {
    return (
      <div className="game">
        <div className="game__body">
          <h1>ما دخلت الغرفة بعد</h1>
          <p style={{ color: "var(--muted)" }}>تحتاج تدخل باسمك ورمز الغرفة أول.</p>
          <Link className="btn btn--evidence" href={`/play?code=${encodeURIComponent(code)}`}>
            ادخل برمز {code}
          </Link>
        </div>
      </div>
    );
  }

  if (!pub || !priv) {
    return (
      <div className="game">
        <div className="game__body" aria-busy="true">
          <p>نجهّز الغرفة…</p>
        </div>
      </div>
    );
  }

  const me = pub.players.find((p) => p.id === priv.playerId);
  const phase = pub.phase;
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const playerName = (id: string) => pub.players.find((p) => p.id === id)?.name ?? id;
  const reasonLabel = (id: string) => gameCase?.planning.reasons.find((r) => r.id === id)?.label.ar ?? id;
  const locationLabel = (id: string) => gameCase?.planning.locations.find((l) => l.id === id)?.label.ar ?? id;
  const roleLabel = (id: string) => gameCase?.planning.roles.find((r) => r.id === id)?.label.ar ?? id;

  return (
    <div className="game">
      {!connected && (
        <div className="reconnect-overlay" role="alert">
          <div>
            <p style={{ fontWeight: 700 }}>انقطع الاتصال — نحاول نرجّعك</p>
            <p style={{ color: "var(--muted)" }}>خلّ جوالك مفتوح.</p>
          </div>
        </div>
      )}

      <div className="game__top">
        <span className="game__phase">{phaseTitle(phase)}</span>
        <DeadlineRing deadlineAt={pub.deadlineAt} serverTime={pub.serverTime} />
      </div>

      {INTERROGATION.has(phase) && (
        <p className="game__banner" aria-live="polite">
          من هنا كل واحد لحاله — لا تتكلمون
        </p>
      )}

      <div className="game__body">
        {/* LOBBY */}
        {phase === "LOBBY" && (
          <>
            <p className="eyebrow">رمز الغرفة</p>
            <p className="room-code">{pub.roomCode}</p>
            <p style={{ color: "var(--muted)" }}>شارك الرمز مع الشلة</p>
            <ul className="roster">
              {pub.players.map((p) => (
                <li key={p.id}>
                  <span className={`dot ${p.connected ? "is-on" : ""} ${p.ready ? "is-ready" : ""}`} />
                  {p.name}
                  {p.isHost ? " ★" : ""}
                </li>
              ))}
            </ul>
            <div className="game__actions">
              <button
                className={`btn ${me?.ready ? "btn--ghost" : "btn--evidence"}`}
                disabled={busy}
                onClick={() => run(() => actions.setReady(!me?.ready))}
              >
                {me?.ready ? "ألغِ الجاهزية" : "جاهز"}
              </button>
              {me?.isHost && (
                <button
                  className="btn"
                  disabled={busy || pub.players.length < 4 || !pub.players.every((p) => p.ready)}
                  onClick={() => run(actions.start)}
                >
                  ابدأ التحقيق
                </button>
              )}
              {me?.isHost && pub.players.length < 4 && (
                <p style={{ color: "var(--muted)", textAlign: "center" }}>نحتاج ٤ لاعبين على الأقل</p>
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
              {pub.evidence.map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{e.title.ar}</strong> — {e.detail.ar}
                  </span>
                </li>
              ))}
            </ul>
            <AckBar priv={priv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* PRIVATE EVIDENCE */}
        {phase === "PRIVATE_EVIDENCE" && (
          <>
            <p className="eyebrow">هذا الدليل عندك لحالك</p>
            {priv.privateEvidence ? (
              <div className="evidence-private">
                <h2 style={{ marginTop: 0 }}>{priv.privateEvidence.title.ar}</h2>
                <p style={{ margin: 0 }}>{priv.privateEvidence.detail.ar}</p>
              </div>
            ) : (
              <p>ما عندك دليل خاص هالجولة.</p>
            )}
            <p style={{ color: "var(--muted)" }}>لا تورّي شاشتك لأحد.</p>
            <AckBar priv={priv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* PLAN: REASON */}
        {phase === "PLAN_REASON" && gameCase && (
          <PlanPicker
            title="ليش دخلتوا الشركة؟"
            options={gameCase.planning.reasons.map((r) => ({ id: r.id, label: r.label.ar }))}
            busy={busy}
            onPick={(v) => run(async () => {
              await actions.propose("reason", v);
              await actions.confirm("reason");
            })}
          />
        )}

        {/* PLAN: LOCATIONS */}
        {phase === "PLAN_LOCATIONS" && gameCase && me && (
          <PlanPicker
            title="وين كنت وقت انطفت الكهرباء؟"
            options={gameCase.planning.locations.map((l) => ({ id: l.id, label: l.label.ar }))}
            busy={busy}
            onPick={(v) => run(async () => {
              await actions.propose(`location.${me.id}`, v);
              await actions.confirm(`location.${me.id}`);
            })}
          />
        )}

        {/* PLAN: ROLES */}
        {phase === "PLAN_ROLES" && gameCase && (
          <RolesPicker
            roles={gameCase.planning.roles.map((r) => ({ id: r.id, label: r.label.ar }))}
            players={pub.players.map((p) => ({ id: p.id, name: p.name }))}
            busy={busy}
            onPick={(roleId, playerId) => run(async () => {
              await actions.propose(`role.${roleId}`, playerId);
              await actions.confirm(`role.${roleId}`);
            })}
          />
        )}

        {/* PLAN: REVIEW */}
        {phase === "PLAN_REVIEW" && (
          <>
            <h1 className="game__prompt">آخر مراجعة</h1>
            <p style={{ color: "var(--muted)" }}>بعدها تختفي الرواية.</p>
            <ul className="features">
              {pub.releasedStory["reason"] && (
                <li><span>السبب: {reasonLabel(pub.releasedStory["reason"])}</span></li>
              )}
              {gameCase?.planning.roles.map((r) => {
                const pid = pub.releasedStory[`role.${r.id}`];
                return pid ? <li key={r.id}><span>{roleLabel(r.id)}: {playerName(pid)}</span></li> : null;
              })}
              {pub.players.map((p) => {
                const loc = pub.releasedStory[`location.${p.id}`];
                return loc ? <li key={p.id}><span>{p.name}: {locationLabel(loc)}</span></li> : null;
              })}
            </ul>
            <AckBar priv={priv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* INTERROGATION / FINAL */}
        {INTERROGATION.has(phase) && (
          <>
            {priv.currentQuestion ? (
              <>
                <h1 className="game__prompt">{priv.currentQuestion.prompt.ar}</h1>
                <div className="game__actions">
                  {priv.currentQuestion.options.map((o) => (
                    <button
                      key={o.id}
                      className={`option-btn ${priv.submittedOptionId === o.id ? "is-selected" : ""}`}
                      disabled={priv.answerLocked || busy}
                      onClick={() => run(() => actions.answer(priv.currentQuestion!.instanceId, o.id))}
                    >
                      {o.label.ar}
                    </button>
                  ))}
                </div>
                {priv.answerLocked && (
                  <p aria-live="polite" style={{ textAlign: "center", color: "var(--success-600)", fontWeight: 700 }}>
                    تم تثبيت إجابتك — ارفع نظرك وانتظر البقية
                  </p>
                )}
              </>
            ) : (
              <p>بانتظار السؤال…</p>
            )}
          </>
        )}

        {/* CONTRADICTION REVEAL */}
        {(phase === "CONTRADICTION_REVEAL_1" || phase === "CONTRADICTION_REVEAL_2") && (
          <>
            <span className="stamp">تناقض مسجّل</span>
            {pub.releasedContradiction ? (
              <>
                <h1 className="game__prompt" style={{ marginTop: "var(--space-4)" }}>
                  كلامكم ما يركب
                </h1>
                <p className="demo__rule">{pub.releasedContradiction.rule.ar}</p>
              </>
            ) : (
              <p>ما فيه تناقض واضح — رواية متماسكة حتى الآن.</p>
            )}
          </>
        )}

        {/* PATCH */}
        {(phase === "PATCH_1" || phase === "PATCH_2") && (
          <>
            <h1 className="game__prompt">رقّعوا الرواية</h1>
            <p style={{ color: "var(--muted)" }}>كل حل بيفتح عليكم سؤال جديد.</p>
            <div className="game__actions">
              {(pub.patchOptions ?? []).map((p) => (
                <button
                  key={p.id}
                  className="option-btn"
                  disabled={busy}
                  onClick={() => run(() => actions.patchVote(p.id))}
                >
                  <strong>{p.label.ar}</strong>
                  <br />
                  <span style={{ color: "var(--muted)", fontWeight: 400 }}>{p.description.ar}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* SURPRISE EVIDENCE */}
        {phase === "SURPRISE_EVIDENCE" && (
          <>
            <span className="stamp">دليل جديد</span>
            {pub.evidence.slice(-1).map((e) => (
              <div key={e.id} className="evidence-private" style={{ marginTop: "var(--space-4)" }}>
                <h2 style={{ marginTop: 0 }}>{e.title.ar}</h2>
                <p style={{ margin: 0 }}>{e.detail.ar}</p>
              </div>
            ))}
            <AckBar priv={priv} busy={busy} onAck={() => run(actions.acknowledge)} />
          </>
        )}

        {/* VERDICT / RESULTS */}
        {(phase === "VERDICT" || phase === "RESULTS") && pub.result && (
          <>
            <p className="eyebrow">الحكم</p>
            <p className="verdict-band">{pub.result.band}</p>
            <h1 className="game__prompt">{pub.result.label.ar}</h1>
            <p>{pub.result.summary.ar}</p>
            <div className="axes">
              <ScoreAxis label="تماسك الرواية" v={pub.result.scores.consistency} />
              <ScoreAxis label="معقولية الرواية" v={pub.result.scores.plausibility} />
              <ScoreAxis label="الثبات" v={pub.result.scores.stability} />
              <ScoreAxis label="التهرّب" v={pub.result.scores.evasion} evasion />
            </div>
            {pub.result.decisiveFactors.length > 0 && (
              <ul className="features">
                {pub.result.decisiveFactors.map((f, i) => (
                  <li key={i}><span>{f.ar}</span></li>
                ))}
              </ul>
            )}
            {phase === "RESULTS" && (
              <div className="game__actions">
                {pub.result.mostConsistentPlayerName && (
                  <p style={{ textAlign: "center" }}>
                    أكثر واحد حافظ الرواية: <strong>{pub.result.mostConsistentPlayerName}</strong>
                  </p>
                )}
                {me?.isHost && (
                  <button className="btn btn--evidence" disabled={busy} onClick={() => run(actions.replay)}>
                    أعيدوا القضية
                  </button>
                )}
                <Link className="btn btn--ghost" href="/create">
                  مجموعة جديدة
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
      <div className="game__actions">
        {options.map((o) => (
          <button
            key={o.id}
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
