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
  REPAIR_VOTE: 5,
  STORY_UPDATE: 6,
  FORENSIC_QUESTION: 7,
  GROUP_VERDICT: 8,
  PLAYER_RANKING: 9,
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
  return (
    <main
      id="main"
      className={`game ${styles.room}`}
      data-testid="bank-room"
      data-phase={phase}
    >
      <p className="visually-hidden" role="status" aria-live="polite">
        الشاشة {SCREEN_NUMBER[phase]} من ٩
      </p>
      {!connected && (
        <div className="reconnect-overlay" role="alert">
          <div><strong>انقطع الاتصال — نرجّع جلستك</strong><p>خلّ الصفحة مفتوحة.</p></div>
        </div>
      )}
      <GameHeader variant={phase === "PLAYER_RANKING" ? "result" : "case"} connected={connected} />
      <div className={styles.casebar}>
        <div><span>قضية بنك الساحة</span><bdi>11:42</bdi></div>
        <span className={styles.screen}>ملف {SCREEN_NUMBER[phase]} / ٩</span>
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
          <RepairVote pub={pub} priv={priv} busy={busy} run={run} actions={actions} />
        )}
        {phase === "STORY_UPDATE" && <StoryUpdate pub={pub} />}
        {phase === "FORENSIC_QUESTION" && (
          <PrivateQuestion pub={pub} priv={priv} busy={busy} run={run} actions={actions} forensic />
        )}
        {phase === "GROUP_VERDICT" && <GroupVerdict pub={pub} />}
        {phase === "PLAYER_RANKING" && (
          <Ranking
            pub={pub}
            priv={priv}
            busy={busy}
            run={run}
            actions={actions}
            goToNewGroup={goToNewGroup}
          />
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
      <p>الأدلة ناقصة، بس أي تناقض يرفع الشبهة. اضبطوا رواية وحدة وخلوها تصمد لين يخلص التحقيق.</p>
      <div className={styles.initialClue}>
        <span aria-hidden>×</span>
        <p>لوحة سيارتكم ظهرت قريب من البنك.<strong>الشبهة الأولية: <bdi>24%</bdi></strong></p>
      </div>
    </section>
  );
}

const PLACE_LABELS: Record<string, string> = {
  cafe_counter: "كاونتر المقهى", parking_vehicle: "عند السيارة",
  alley: "الزقاق", petrol_station: "محطة البنزين", cafe_entrance: "باب المقهى",
  nearby_street: "الشارع القريب",
};

const DEPARTURE_LABELS: Record<string, string> = {
  side_street: "الخروج من الشارع الجانبي",
  main_street: "الخروج من الشارع الرئيسي",
  return_to_cafe: "الرجوع للمقهى",
};

function StoryMap({ pub }: { pub: BankPublicShell }) {
  const repairedTimeline = pub.selectedRepair?.id === "movement"
    ? "سعود وصل باب المقهى"
    : pub.selectedRepair?.id === "identity"
      ? "نواف هو الشخص عند الباب"
      : "لقطة باب المقهى قيد المراجعة";
  const departure = String(pub.storyFacts.departure_plan ?? "");
  return (
    <figure className={styles.map} aria-label="خريطة موقع بنك الساحة والرواية المشتركة">
      <svg viewBox="0 0 360 218" role="img" aria-label="البنك والمقهى والمواقف والسيارة والزقاق ومحطة البنزين والشارع القريب">
        <path className={styles.road} d="M12 166 C88 126 130 186 210 146 S310 96 350 120" />
        <path className={styles.thread} d="M62 112 L155 166 L260 78 L320 146" />
        <g transform="translate(218 16)"><rect width="112" height="52" /><text x="56" y="31">بنك الساحة</text></g>
        <g transform="translate(24 32)"><rect width="94" height="49" /><text x="47" y="29">المقهى</text></g>
        <g transform="translate(128 142)"><rect width="80" height="42" /><text x="40" y="25">المواقف</text></g>
        <g transform="translate(250 151)"><rect width="88" height="38" /><text x="44" y="24">محطة البنزين</text></g>
        <circle cx="161" cy="164" r="10" /><text x="161" y="168" className={styles.car}>سيارة</text>
      </svg>
      <figcaption className={styles.markers}>
        {pub.players.map((player, index) => {
          const place = String(pub.storyFacts[`alarm_location:${player.id}`] ?? "");
          return <span key={player.id}><i aria-hidden>{index + 1}</i><b><bdi>{player.displayName}</bdi></b><small>{PLACE_LABELS[place] ?? "المكان ما تثبت للحين"}</small></span>;
        })}
      </figcaption>
      <ol className={styles.timeline}>
        <li><bdi>11:42</bdi><span>اشتغل إنذار البنك</span></li>
        <li><bdi>11:44</bdi><span>{repairedTimeline}</span></li>
        <li><bdi>11:47</bdi><span>{DEPARTURE_LABELS[departure] ?? "خطة الخروج ما تثبتت"}</span></li>
      </ol>
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
      <h1>ثبتوا اللي صار على الخريطة.</h1>
      <p className={styles.lede}>كل واحد يثبت الجزء اللي عنده. لما تكتمل الرواية يبدأ التحقيق تلقائيًا.</p>
      <StoryMap pub={pub} />
      <div className={styles.assignmentList}>
        {priv.storyAssignments.map((assignment) => {
          const factId = assignment.factKey.startsWith("alarm_location:") ? "alarm_location" : assignment.factKey;
          const targetPlayerId = factId === "alarm_location" ? assignment.factKey.split(":")[1] : undefined;
          const locked = Object.hasOwn(pub.storyFacts, assignment.factKey);
          return (
            <fieldset key={assignment.factKey} data-testid="bank-story-assignment" className={styles.assignment}>
              <legend>{assignment.prompt}</legend>
              {locked ? <p role="status">ثبتت هالنقطة.</p> : <div>
                {assignment.options.map((option) => (
                  <button key={option.id} type="button" disabled={busy} onClick={() => run(() => actions.bankStoryLock(factId, option.id, targetPlayerId))}>
                    {option.label}
                  </button>
                ))}
              </div>}
            </fieldset>
          );
        })}
        {priv.storyAssignments.length === 0 && <p role="status">ثبتت جزئك — باقي تفاصيل الشلة.</p>}
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
      <p className={styles.privateLabel}>إجابتك سرية</p>
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
          <strong>تسجلت إجابتك</strong><span>— باقي {Math.max(0, pub.progress.required - count)}</span>
          <p>خلك على نفس الشاشة. ننتقل تلقائيًا بعد ما يجاوبون الكل.</p>
        </div>
      )}
    </section>
  );
}

function IssueReveal({ pub }: { pub: BankPublicShell }) {
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
      <p>تكلموا الحين: وش التفسير اللي يقدر يصمد قدام الدليل؟</p>
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
      <p className={styles.eyebrow}>أصلحوا الرواية</p>
      <h1>وش تفسيركم للمحقق؟</h1>
      <p className={styles.lede}>اختاروا التفسير اللي بتكملون عليه. تقدر تغيّر صوتك لين تتفق الأغلبية، ولا تظهر الأرقام قبل القرار.</p>
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
            <small><b>يصير رسمي:</b> {officialTruth(repair.id)}</small>
            <small><b>يصلح:</b> {repair.resolves}</small>
            <small><b>يفتح عليكم:</b> {repair.evidence.summary}</small>
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
    <section>
      <p className={styles.eyebrow}>الرواية المحدّثة</p><h1>ثبتتوا روايتكم.</h1>
      <p className={styles.statement}>{pub.selectedRepair?.resolves}</p>
      <StoryMap pub={pub} />
      <p>اختياركم فتح الدليل التالي: {pub.selectedRepair?.evidence.summary}</p>
    </section>
  );
}

function Evidence({ evidence }: { evidence: NonNullable<BankPublicView["evidence"]> }) {
  return (
    <figure className={styles.evidence}>
      <div aria-hidden><span className={styles.scanline} /><i>REC</i><bdi>{evidence.timestamp}</bdi></div>
      <figcaption><strong>الدليل الجنائي وصل</strong><p>{evidence.summary}</p></figcaption>
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
  if (suspicion < 60) return { title: "طلعتوا… لكن بشبهة.", copy: "الشرطة ما قدرت تثبت العملية، لكن سيارتكم بقيت تحت المراقبة." };
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
      <p>بدأت روايتكم من السيارة القريبة، ثم ظهر التناقض الأول. اخترتوا «{pub.selectedRepair?.title}»، والدليل اختبره مباشرة.</p>
      <div><span>الشبهة النهائية</span><strong><bdi>{suspicion}%</bdi></strong></div>
      <p>{band.copy}</p>
    </section>
  );
}

function Ranking({ pub, priv, busy, run, actions, goToNewGroup }: {
  pub: BankPublicShell; priv: BankPrivateShell; busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void> | void; actions: BankActions; goToNewGroup: () => Promise<void>;
}) {
  const rankings = pub.rankings;
  const complete = pub.rankingStatus === "complete" && rankings.length === pub.players.length && rankings.every((item) =>
    item.score !== null && item.sharedRank !== null && Boolean(item.reason.trim() && item.explanation.trim()),
  );
  return (
    <section data-testid="bank-ranking">
      <p className={styles.eyebrow}>بعد حكم المجموعة</p><h1>مين حمى الرواية أكثر؟</h1>
      {complete ? <ol className={styles.ranking}>
        {rankings.map((item) => (
          <li key={item.playerId}><span>{item.sharedRank}</span><div><strong><bdi>{item.displayName}</bdi></strong><small>{item.reason}. {item.explanation}</small></div><bdi>{item.score}</bdi></li>
        ))}
      </ol> : <p className={styles.receipt} data-testid="bank-ranking-incomplete" role="status">ترتيب اللاعبين ما اكتمل بشكل قابل للمراجعة، لذلك ما بنعرض درجات ناقصة.</p>}
      <p>النتيجة للمجموعة كلها؛ الترتيب بس يوريكم مساهمة كل واحد.</p>
      <div className={styles.finalActions}>
        {priv.isHost ? <button className={styles.primary} disabled={busy} onClick={() => run(actions.replay)}>أعيدوا قضية بنك الساحة</button> : <p>منشئ الغرفة يقدر يعيد القضية.</p>}
        {priv.isHost ? <button disabled={busy} onClick={() => void goToNewGroup()}>مجموعة جديدة</button> : <Link href="/create">أنشئ مجموعة جديدة</Link>}
      </div>
    </section>
  );
}
