"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BankPublicView, BankRepairId } from "@al-riwayah/game-engine";
import { BANK_PHASES } from "@al-riwayah/game-engine";
import { BANK_AL_SAHA_CASE_ID } from "@al-riwayah/content";
import type { BankPrivateShell, BankPublicShell } from "@/lib/useGameRoom";
import { GameHeader } from "./GameHeader";
import styles from "./BankRoom.module.css";

type BankActions = {
  bankStoryLock: (factId: string, optionId: string, targetPlayerId?: string) => Promise<unknown>;
  bankAnswer: (questionId: string, optionId: string) => Promise<unknown>;
  bankRepairVote: (repairId: BankRepairId) => Promise<unknown>;
  replay: () => Promise<unknown>;
};

export function isBankPublicView(value: unknown): value is BankPublicShell {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { caseId?: unknown; phase?: unknown; suspicion?: unknown };
  return candidate.caseId === BANK_AL_SAHA_CASE_ID &&
    typeof candidate.phase === "string" &&
    (BANK_PHASES as readonly string[]).includes(candidate.phase) &&
    typeof candidate.suspicion === "number";
}

export function isBankPrivateView(value: unknown): value is BankPrivateShell {
  return typeof value === "object" && value !== null && "storyAssignments" in value && "lockedVote" in value;
}

const SCREEN_NUMBER: Record<BankPublicView["phase"], number> = {
  OPENING: 1,
  STORY_BUILDING: 2,
  FIRST_QUESTION: 3,
  ISSUE_REVEAL: 4,
  REPAIR_VOTE: 4,
  STORY_UPDATE: 5,
  FORENSIC_QUESTION: 6,
  GROUP_VERDICT: 7,
  PLAYER_RANKING: 8,
};

export function BankRoom({
  pub,
  priv,
  connected,
  busy,
  actionError,
  run,
  actions,
  goToNewGroup,
}: {
  pub: BankPublicShell;
  priv: BankPrivateShell;
  connected: boolean;
  busy: boolean;
  actionError: string;
  run: (fn: () => Promise<unknown>) => Promise<void> | void;
  actions: BankActions;
  goToNewGroup: () => Promise<void>;
}) {
  const phase = pub.phase;
  const [showReplay, setShowReplay] = useState(false);
  useEffect(() => {
    if (phase !== "PLAYER_RANKING") setShowReplay(false);
  }, [phase]);
  const screenNumber = phase === "PLAYER_RANKING" && showReplay ? 9 : SCREEN_NUMBER[phase];
  return (
    <main
      id="main"
      className={`game ${styles.room}`}
      data-testid="bank-room"
      data-phase={phase}
      data-screen={screenNumber}
    >
      <p className="visually-hidden" role="status" aria-live="polite">
        الشاشة {screenNumber} من ٩
      </p>
      {!connected && (
        <div className="reconnect-overlay" role="alert">
          <div><strong>انقطع الاتصال — نرجّع جلستك</strong><p>خلّ الصفحة مفتوحة.</p></div>
        </div>
      )}
      <GameHeader variant={phase === "PLAYER_RANKING" ? "result" : "case"} connected={connected} />
      <div className={styles.casebar}>
        <div><span>قضية بنك الساحة</span><bdi>11:42</bdi></div>
        <span className={styles.screen}>ملف {screenNumber} / ٩</span>
      </div>
      <Suspicion value={pub.suspicion} />
      <div className={styles.body} key={phase}>
        {actionError && <p className="action-error" role="alert">{actionError}</p>}
        {phase === "OPENING" && <Opening />}
        {phase === "STORY_BUILDING" && (
          <StoryBuilder pub={pub} priv={priv} busy={busy} run={run} actions={actions} />
        )}
        {phase === "FIRST_QUESTION" && (
          <PrivateQuestion pub={pub} priv={priv} busy={busy} run={run} actions={actions} forensic={false} />
        )}
        {phase === "ISSUE_REVEAL" && <IssueReveal pub={pub} />}
        {phase === "REPAIR_VOTE" && (
          <section className={styles.repairScreen} data-testid="bank-contradiction-repair">
            <IssueReveal pub={pub} compact />
            <RepairVote pub={pub} priv={priv} busy={busy} run={run} actions={actions} />
          </section>
        )}
        {phase === "STORY_UPDATE" && <StoryUpdate pub={pub} />}
        {phase === "FORENSIC_QUESTION" && (
          <PrivateQuestion pub={pub} priv={priv} busy={busy} run={run} actions={actions} forensic />
        )}
        {phase === "GROUP_VERDICT" && <GroupVerdict pub={pub} />}
        {phase === "PLAYER_RANKING" && !showReplay && (
          <Ranking
            pub={pub}
            onContinue={() => setShowReplay(true)}
          />
        )}
        {phase === "PLAYER_RANKING" && showReplay && (
          <Replay priv={priv} busy={busy} run={run} actions={actions} goToNewGroup={goToNewGroup} />
        )}
      </div>
    </main>
  );
}

function Suspicion({ value }: { value: number }) {
  const label = value < 30 ? "روايتكم ماشية." : value < 60 ? "المحقق بدأ يشك." : value < 85 ? "الأدلة تضيق عليكم." : value < 100 ? "باقي غلطة وتنفضحون." : "انكشفت روايتكم.";
  return (
    <section className={styles.suspicion} aria-label={`الشبهة ${value} بالمئة`}>
      <div><span>الشبهة</span><strong><bdi>{value}%</bdi></strong></div>
      <div className={styles.meter} aria-hidden><span style={{ inlineSize: `${value}%` }} /></div>
      <p>{label}</p>
    </section>
  );
}

function Opening() {
  return (
    <section className={styles.opening}>
      <p className={styles.eyebrow}>قبل ١٢ دقيقة</p>
      <h1>انسرق بنك الساحة.</h1>
      <p>الشرطة وقفت سيارتكم قريب من الموقع، والحين كل واحد فيكم بينسأل لحاله.</p>
      <div className={styles.initialClue}>
        <ClueIcon kind="camera" />
        <p>لوحة سيارتكم ظهرت في كاميرا قريبة من البنك.<strong>الشبهة الأولية: <bdi>24%</bdi></strong></p>
      </div>
      <p className={styles.objective}>هدفكم: اضبطوا رواية وحدة، وخلّوا الشبهة منخفضة لين يخلص التحقيق.</p>
    </section>
  );
}

const PLACE_LABELS: Record<string, string> = {
  cafe_counter: "كاونتر المقهى", parking_vehicle: "عند السيارة",
  alley: "الزقاق", petrol_station: "محطة البنزين", cafe_entrance: "باب المقهى",
  nearby_street: "الشارع القريب",
};

function ClueIcon({ kind }: { kind: "key" | "bag" | "camera" }) {
  if (kind === "key") return <svg className={styles.icon} viewBox="0 0 24 24" aria-label="معه المفتاح"><circle cx="8" cy="12" r="4" /><path d="M12 12h9m-3 0v3m-3-3v2" /></svg>;
  if (kind === "bag") return <svg className={styles.icon} viewBox="0 0 24 24" aria-label="معه الحقيبة"><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
  return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" /><circle cx="12" cy="13" r="3" /></svg>;
}

function LocationBoard({ pub, showTimeline = false }: { pub: BankPublicShell; showTimeline?: boolean }) {
  const places = Object.entries(PLACE_LABELS).map(([id, label]) => ({
    id,
    label,
    players: pub.players.filter((player) => pub.storyFacts[`alarm_location:${player.id}`] === id),
  })).filter((place) => place.players.length > 0);
  const keyHolder = String(pub.storyFacts.vehicle_key_holder ?? pub.storyFacts["key-holder:11:44"] ?? "");
  const bagHolder = String(pub.storyFacts.suspicious_object_holder ?? pub.storyFacts["bag-holder:11:44"] ?? "");
  const repairedTimeline = pub.selectedRepair?.id === "movement"
    ? ["السيارة", "11:42", "المقهى", "11:44"]
    : ["السيارة", "11:42", "باب المقهى", "11:44"];
  return (
    <figure className={styles.locationBoard} data-testid="bank-location-board" aria-label="لوحة المواقع والرواية المشتركة">
      <figcaption>الرواية المشتركة · <bdi>11:42</bdi></figcaption>
      <div className={styles.locations}>
        {places.map((place) => <section key={place.id}><strong>{place.label}</strong><p>{place.players.map((player) => <span key={player.id}><bdi>{player.displayName}</bdi>{player.id === keyHolder && <ClueIcon kind="key" />}{player.id === bagHolder && <ClueIcon kind="bag" />}</span>)}</p></section>)}
        {places.length === 0 && <p className={styles.emptyBoard}>المواقع تظهر هنا أول ما تثبتونها.</p>}
      </div>
      {showTimeline && <div className={styles.movement}><span>{repairedTimeline[0]} <bdi>{repairedTimeline[1]}</bdi></span><i aria-hidden>←</i><span>{repairedTimeline[2]} <bdi>{repairedTimeline[3]}</bdi></span></div>}
    </figure>
  );
}

function StoryBuilder({ pub, priv, busy, run, actions }: {
  pub: BankPublicShell; priv: BankPrivateShell; busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void> | void; actions: BankActions;
}) {
  return (
    <section>
      <p className={styles.eyebrow}>ابنوا الرواية</p>
      <h1>ثبتوا وين كان كل واحد.</h1>
      <p className={styles.lede}>جاوبوا باختيار واحد. اللوحة ترتّب روايتكم تلقائيًا.</p>
      <LocationBoard pub={pub} />
      <div className={styles.assignmentList}>
        {priv.storyAssignments.map((assignment) => {
          const factId = assignment.factKey.startsWith("alarm_location:") ? "alarm_location" : assignment.factKey;
          const targetPlayerId = factId === "alarm_location" ? assignment.factKey.split(":")[1] : undefined;
          const locked = Object.hasOwn(pub.storyFacts, assignment.factKey);
          if (locked) return null;
          return (
            <fieldset key={assignment.factKey} data-testid="bank-story-assignment" className={styles.assignment}>
              <legend>{assignment.prompt}</legend>
              <div>
                {assignment.options.map((option) => (
                  <button key={option.id} type="button" disabled={busy} onClick={() => run(() => actions.bankStoryLock(factId, option.id, targetPlayerId))}>
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
        {priv.storyAssignments.every((assignment) => Object.hasOwn(pub.storyFacts, assignment.factKey)) && <p className={styles.receipt} role="status">ثبتت جزئك — باقي تفاصيل الشلة.</p>}
      </div>
    </section>
  );
}

function PrivateQuestion({ pub, priv, busy, run, actions, forensic }: {
  pub: BankPublicShell; priv: BankPrivateShell; busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void> | void; actions: BankActions; forensic: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [priv.question?.id]);
  const done = Boolean(priv.lockedAnswer);
  const count = forensic ? pub.progress.forensicAnswers : pub.progress.firstAnswers;
  if (!priv.question) return <p role="status">نستعيد سؤالك الخاص…</p>;
  return (
    <section className={styles.question}>
      {forensic && pub.evidence && <Evidence evidence={pub.evidence} />}
      <p className={styles.privateLabel}>سؤال خاص لك — لا تعرض شاشتك</p>
      <h1>{priv.question.prompt}</h1>
      {!done ? (
        <>
          <div role="radiogroup" aria-label={priv.question.prompt} className={styles.options}>
            {priv.question.options.map((option) => (
              <button key={option.id} data-testid="bank-answer-option" role="radio" aria-checked={selected === option.id} className={selected === option.id ? styles.selected : ""} onClick={() => setSelected(option.id)} disabled={busy}>
                {option.label}
              </button>
            ))}
          </div>
          <button className={styles.primary} disabled={!selected || busy} onClick={() => selected && run(() => actions.bankAnswer(priv.question!.id, selected))}>ثبّت الإجابة</button>
        </>
      ) : (
        <div className={styles.receipt} data-testid="bank-answer-receipt" role="status" aria-live="polite">
          <strong>تسجلت إجابتك — باقي {Math.max(0, pub.progress.required - count)}</strong>
        </div>
      )}
    </section>
  );
}

function IssueReveal({ pub, compact = false }: { pub: BankPublicShell; compact?: boolean }) {
  const names = pub.reveal?.sources.map((id) => pub.players.find((player) => player.id === id)?.displayName).filter(Boolean);
  const explanation = pub.reveal?.kind === "direct_contradiction"
    ? `${names?.[0] ?? "واحد منكم"} قال إن سعود كان عند السيارة الساعة 11:42. ${names?.[1] ?? "شاهد ثاني"} قال إن سعود كان داخل المقهى بنفس اللحظة. ما يقدر يكون في المكانين بنفس الوقت.`
    : pub.reveal?.explanation ?? "طريق الشنطة للمواقف بقي من دون تفسير.";
  return (
    <section className={styles.reveal}>
      <p className={styles.eyebrow}>التناقض الأول</p><h1>المحقق مسك عليكم {pub.reveal?.kind === "direct_contradiction" ? "تناقض." : "فجوة."}</h1>
      {names && names.length > 0 && <p className={styles.named}><bdi>{names.join(" و ")}</bdi></p>}
      <blockquote>{explanation}</blockquote>
      <p className={styles.delta}>الشبهة ارتفعت بسبب هالنقطة: <bdi>{Math.max(24, pub.suspicion - (pub.reveal?.delta ?? 0))}% → {pub.suspicion}%</bdi></p>
      {!compact && <p>تكلموا الحين: وش التفسير اللي يقدر يصمد قدام الدليل؟</p>}
    </section>
  );
}

function RepairVote({ pub, priv, busy, run, actions }: {
  pub: BankPublicShell; priv: BankPrivateShell; busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void> | void; actions: BankActions;
}) {
  const voted = Boolean(priv.lockedVote);
  const voteStatus = getBankVoteStatus(pub.progress.required);
  const officialTruth = (repairId: BankRepairId) => repairId === "movement"
    ? "سعود كان عند السيارة الساعة 11:42، ثم دخل المقهى الساعة 11:44."
    : "سعود بقي عند السيارة، والشخص اللي ظهر عند الباب كان نواف.";
  return (
    <section>
      <p className={styles.eyebrow}>نفس الملف · اختاروا الترقيعة</p>
      <h1>وش تفسيركم؟</h1>
      <p className={styles.lede}>اختاروا الاحتمال اللي بتكملون عليه.</p>
      <div className={styles.repairs}>
        {pub.repairs.map((repair) => (
          <button
            key={repair.id}
            data-testid="bank-repair-option"
            aria-pressed={priv.lockedVote === repair.id}
            disabled={busy}
            onClick={() => run(() => actions.bankRepairVote(repair.id))}
          >
            <span>{repair.id === "movement" ? "أ" : "ب"}</span><strong>{repair.title}</strong>
            <small><b>يصير رسمي</b>{officialTruth(repair.id)}</small>
            <small><b>يصلح</b>{repair.id === "movement" ? "كلام سعود ويزيد يقدر يكون صحيح." : "سعود يبقى عند السيارة."}</small>
            <small><b>يفتح عليكم</b>{repair.id === "movement" ? "كاميرات المواقف." : "صورة الباب والجاكيت."}</small>
          </button>
        ))}
      </div>
      {voted && <p className={styles.receipt} data-testid="bank-vote-receipt" role="status">{voteStatus.beforeMajority} <bdi>{voteStatus.strictMajority}</bdi> {voteStatus.afterMajority}</p>}
    </section>
  );
}

export function getBankVoteStatus(playerCount: number): {
  strictMajority: number;
  beforeMajority: string;
  afterMajority: string;
} {
  return {
    strictMajority: Math.floor(playerCount / 2) + 1,
    beforeMajority: "تسجل صوتك. باقي إن واحد من الخيارين يوصل إلى",
    afterMajority: "أصوات متفقة. تقدر تغيّر صوتك، والتصويت يبقى مفتوح لين يوصل أحد الخيارين للأغلبية.",
  };
}

function StoryUpdate({ pub }: { pub: BankPublicShell }) {
  return (
    <section className={styles.storyUpdate} data-testid="bank-story-update">
      <p className={styles.eyebrow}>الرواية المحدّثة</p><h1>اعتمدتوا هالتفسير</h1>
      <p className={styles.statement}>{pub.selectedRepair?.id === "movement" ? "سعود انتقل من السيارة للمقهى بعد الإنذار." : "يزيد خلط بين سعود ونواف عند باب المقهى."}</p>
      <LocationBoard pub={pub} showTimeline />
      <p className={styles.delta}>الشبهة الآن <bdi>{pub.suspicion}%</bdi>، لأن هالتفسير فتح تسجيلًا جديدًا للتحقق.</p>
      <p>هالاختيار فتح عليكم {pub.selectedRepair?.id === "movement" ? "كاميرات المواقف" : "صورة الباب والجاكيت"}. الأدلة الجنائية الحين بتختبر كلامكم.</p>
    </section>
  );
}

function Evidence({ evidence }: { evidence: NonNullable<BankPublicView["evidence"]> }) {
  const keyFact = evidence.summary.includes("مفتاح") ? "التفصيل المهم: علامة المفتاح هي اللي تربط الشخص بالمكان." : "التفصيل المهم: مسار الشخص هو اللي يختبر تفسيركم.";
  const evidenceLabel = evidence.id.includes("doorway") ? "صورة الباب والجاكيت" : "كاميرا المواقف";
  return (
    <figure className={styles.evidence}>
      <div aria-hidden><span className={styles.scanline} /><i>REC</i><bdi>{evidence.timestamp}</bdi></div>
      <figcaption><strong>دليل هالترقيعة · {evidenceLabel}</strong><p>{evidence.summary}</p><mark>{keyFact}</mark></figcaption>
    </figure>
  );
}

export function getBankVerdictBand(suspicion: number): { title: string; copy: string } {
  if (suspicion === 100) {
    return {
      title: "انكشفت روايتكم.",
      copy: "وصلت الشبهة 100%، والأدلة كشفت روايتكم بالكامل.",
    };
  }
  if (suspicion < 30) return { title: "طلعتوا نظيفين.", copy: "روايتكم ركبت على الأدلة، والشرطة ما قدرت تثبت عليكم شي." };
  if (suspicion < 60) return { title: "نجوتوا… لكن تحت المراقبة", copy: "الشرطة ما قدرت تثبت العملية، لكن سيارتكم بقيت تحت المراقبة." };
  if (suspicion < 85) return { title: "روايتكم تحت المراقبة.", copy: "عدّيتوا التحقيق، لكن الفجوات خلت الأدلة تضيق عليكم." };
  return { title: "انهارت روايتكم.", copy: "الأدلة ما ركبت على كلامكم، وانكشفت الرواية." };
}

function GroupVerdict({ pub }: { pub: BankPublicShell }) {
  const suspicion = pub.verdict?.suspicion ?? pub.suspicion;
  const band = getBankVerdictBand(suspicion);
  return (
    <section data-testid="bank-group-verdict" className={styles.verdict}>
      <p className={styles.eyebrow}>حكم المجموعة</p>
      <h1>{band.title}</h1>
      <div><span>الشبهة النهائية</span><strong><bdi>{suspicion}%</bdi></strong></div>
      <ol className={styles.recap}><li>بدأت المشكلة من موقع سعود.</li><li>اخترتوا «{pub.selectedRepair?.title}».</li><li>{band.copy}</li></ol>
    </section>
  );
}

function Ranking({ pub, onContinue }: { pub: BankPublicShell; onContinue: () => void }) {
  const rankings = pub.rankings;
  const complete = pub.rankingStatus === "complete" && rankings.length === pub.players.length && rankings.every((item) =>
    item.score !== null && item.sharedRank !== null && Boolean(item.reason.trim() && item.explanation.trim()),
  );
  return (
    <section data-testid="bank-ranking">
      <p className={styles.eyebrow}>بعد حكم المجموعة</p><h1>مين حمى الرواية أكثر؟</h1>
      <div className={styles.rankingHead}><span>الترتيب</span><span>اللاعب</span><span>النقاط</span></div>
      {complete ? <ol className={styles.ranking}>
        {rankings.map((item) => (
          <li key={item.playerId}><span>{item.sharedRank}</span><div><strong><bdi>{item.displayName}</bdi></strong><small>{item.reason}</small></div><bdi>{item.score} نقطة</bdi></li>
        ))}
      </ol> : <p className={styles.receipt} data-testid="bank-ranking-incomplete" role="status">ترتيب اللاعبين ما اكتمل بشكل قابل للمراجعة، لذلك ما بنعرض درجات ناقصة.</p>}
      <button className={styles.primary} onClick={onContinue}>كملوا لإعادة اللعب</button>
    </section>
  );
}

function Replay({ priv, busy, run, actions, goToNewGroup }: {
  priv: BankPrivateShell; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void> | void;
  actions: BankActions; goToNewGroup: () => Promise<void>;
}) {
  return <section data-testid="bank-replay" className={styles.replay}>
    <p className={styles.eyebrow}>الجولة الجاية</p><h1>تلعبونها مرة ثانية؟</h1>
    <p>الأدلة والمسار ممكن يتغيرون.</p>
    <div className={styles.finalActions}>
      {priv.isHost ? <button className={styles.primary} disabled={busy} onClick={() => run(actions.replay)}>أعيدوا قضية بنك الساحة</button> : <p>منشئ الغرفة يقدر يعيد القضية.</p>}
      {priv.isHost ? <button disabled={busy} onClick={() => void goToNewGroup()}>شلة جديدة</button> : <Link href="/create">شلة جديدة</Link>}
    </div>
  </section>;
}
