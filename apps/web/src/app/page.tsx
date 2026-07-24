import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { EvidenceBoard } from "@/components/EvidenceBoard";
import { Ticker } from "@/components/Ticker";
import { ContradictionDemo } from "@/components/ContradictionDemo";
import { publicCaseSummaries } from "@al-riwayah/content";
import { SITE } from "@/lib/site";

const LOOP = [
  { t: "اتفقوا", d: "دقيقة واحدة تتفقون فيها على سبب وجودكم وأماكنكم وأدواركم." },
  { t: "انفصلوا", d: "كل واحد بجواله لحاله. لا كلام، لا تنسيق." },
  { t: "جاوبوا", d: "أسئلة سريعة، وإجاباتكم تُقارن بالرواية والأدلة." },
  { t: "انقفطوا", d: "المحرك يكشف أقوى تناقض بينكم ويشرح سببه." },
  { t: "رقّعوا", d: "تختارون حلًّا… لكن كل حل يفتح التزامًا جديدًا." },
  { t: "واجهوا التقرير", d: "أربعة معايير تحكي روايتكم: تماسك، معقولية، ثبات، تهرّب." },
];

const PATCHES = [
  { t: "عدّلوا الوقت", d: "«كان معه قبلها، ثم طلع للمواقف.»", cost: "−ثبات −معقولية", chip: "متى رجع؟" },
  { t: "التبس عليه الشخص", d: "«خلط بين اثنين في الظلمة.»", cost: "−معقولية", chip: "شهادة أضعف" },
  { t: "اعترفوا بجزء", d: "«دخل المستودع عشان شاحن فقط.»", cost: "−ثبات", chip: "مين صاحب الشاحن؟" },
];

const AXES = [
  { label: "تماسك الرواية", v: 78, evasion: false },
  { label: "معقولية الرواية", v: 64, evasion: false },
  { label: "الثبات", v: 55, evasion: false },
  { label: "التهرّب", v: 30, evasion: true },
];

const FAQ = [
  { q: "كم لاعب نحتاج؟", a: "من ٤ إلى ٦ لاعبين. المنشئ نفسه لاعب عادي." },
  { q: "هل الكلام مسموح؟", a: "الكلام مسموح ومطلوب وقت التخطيط، وممنوع وقت التحقيق الفردي — كل واحد بجواله." },
  { q: "هل ألعب عن بُعد؟", a: "اللعبة مصممة للجلسة الواحدة (نفس المكان). اللعب عن بُعد عبر مكالمة ممكن تقنيًا لكنه ليس التجربة الأساسية." },
  { q: "وش عن بياناتي؟", a: "لا حسابات ولا تحميل. الغرف مؤقتة في ذاكرة الخادم وتنتهي بانتهاء الجلسة. لا نحفظ إجاباتكم." },
  { q: "أي أجهزة مدعومة؟", a: "أي جوال فيه متصفح حديث. لا يلزم تلفزيون ولا تطبيق." },
  { q: "بتنزلون قضايا أكثر؟", a: "هذه النسخة فيها قضية واحدة كاملة. القضايا القادمة معروضة كـ«قيد التطوير» فقط، بدون أي وعود زائفة." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Game",
  name: SITE.name,
  alternateName: SITE.nameLatin,
  description: SITE.description,
  inLanguage: "ar",
  numberOfPlayers: { "@type": "QuantitativeValue", minValue: 4, maxValue: 6 },
  gamePlatform: "Web (mobile browser)",
};

export default function HomePage() {
  const cases = publicCaseSummaries();
  const firstCase = cases[0];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <main id="main">
        {/* Hero */}
        <section className="hero" id="top">
          <div className="container hero__grid">
            <div>
              <p className="eyebrow">لعبة جماعية · جوالات فقط</p>
              <h1 className="hero__title display">
                <span>كلّكم متورطين.</span>
                <span className="accent">روايتكم وحدة.</span>
              </h1>
              <p className="hero__lede">
                اتفقوا على اللي صار، وبعدها كل واحد ينفصل بجواله. المحقق ما يحتاج يعرف الحقيقة — يكفي
                يلقى تناقض واحد.
              </p>
              <div className="hero__actions">
                <Link className="btn btn--evidence" href="/create">
                  أنشئ غرفة
                </Link>
                <Link className="btn btn--ghost" href="/play">
                  ادخل برمز
                </Link>
              </div>
              <p className="hero__proof">٤–٦ لاعبين · جوالات فقط · بدون تحميل</p>
            </div>
            <EvidenceBoard />
          </div>
        </section>

        <Ticker />

        {/* Loop */}
        <section className="section container" aria-labelledby="loop-h">
          <div className="section-head">
            <p className="eyebrow">الحلقة الأساسية</p>
            <h2 id="loop-h">من الاتفاق إلى التقرير</h2>
          </div>
          <div className="loop">
            {LOOP.map((s, i) => (
              <div className="loop__step" key={s.t}>
                <span className="num mono">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contradiction moment */}
        <section className="section container" aria-labelledby="demo-h">
          <div className="section-head">
            <p className="eyebrow">لحظة التناقض</p>
            <h2 id="demo-h">المحقق يكفيه شرخ واحد</h2>
            <p className="reading" style={{ color: "var(--muted)" }}>
              المحرك حتمي وشفّاف: يوضّح بالضبط ليش اعتبر الجوابين متعارضين — بالنص، مو باللون فقط.
            </p>
          </div>
          <ContradictionDemo />
        </section>

        {/* Patching */}
        <section className="section container" aria-labelledby="patch-h">
          <div className="section-head">
            <p className="eyebrow">الترقيع له ثمن</p>
            <h2 id="patch-h">كل حل يفتح سؤال</h2>
          </div>
          <div className="patches">
            {PATCHES.map((p) => (
              <div className="patch-card" key={p.t}>
                <h3>{p.t}</h3>
                <p style={{ color: "var(--muted)" }}>{p.d}</p>
                <p className="cost mono">{p.cost}</p>
                <span className="commitment-chip">التزام جديد: {p.chip}</span>
              </div>
            ))}
          </div>
        </section>

        {/* First case */}
        {firstCase && (
          <section className="section container" aria-labelledby="case-h">
            <div className="section-head">
              <p className="eyebrow">القضية الأولى</p>
              <h2 id="case-h">{firstCase.title.ar}</h2>
            </div>
            <div className="card reading">
              <span className="stamp">متاحة الآن</span>
              <p style={{ marginTop: "var(--space-4)" }}>{firstCase.pitch.ar}</p>
              <p className="mono" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {firstCase.playerCounts[0]}–{firstCase.playerCounts.at(-1)} لاعبين ·{" "}
                {firstCase.durationMinutes[0]}–{firstCase.durationMinutes[1]} دقيقة ·{" "}
                {firstCase.complexity.ar}
              </p>
              <Link className="btn btn--ghost" href="/cases" style={{ marginTop: "var(--space-4)" }}>
                كل القضايا
              </Link>
            </div>
          </section>
        )}

        {/* Results */}
        <section className="section container" aria-labelledby="results-h">
          <div className="section-head">
            <p className="eyebrow">تقرير يتذكّر الغرفة</p>
            <h2 id="results-h">أربعة معايير تحكي روايتكم</h2>
          </div>
          <div className="axes">
            {AXES.map((a) => (
              <div className={`axis ${a.evasion ? "is-evasion" : ""}`} key={a.label}>
                <div className="label">
                  <span>{a.label}</span>
                  <span className="mono">{a.v}</span>
                </div>
                <div className="bar">
                  <span style={{ width: `${a.v}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="reading" style={{ marginTop: "var(--space-6)", color: "var(--muted)" }}>
            مثال من جلسة: «تفسير الشاحن أنقذ تناقضين… وفتح ثلاثة.»
          </p>
        </section>

        {/* How it plays (3 steps) */}
        <section className="section container" aria-labelledby="how-h">
          <div className="section-head">
            <p className="eyebrow">باختصار</p>
            <h2 id="how-h">كيف تُلعب في ٣ خطوات</h2>
          </div>
          <ol className="loop" style={{ counterReset: "none" }}>
            <li className="loop__step">
              <span className="num mono">١</span>
              <div>
                <h3>أنشئ غرفة وشارك الرمز</h3>
                <p>المنشئ لاعب مثل الكل. باقي الشلة يدخلون بالرمز.</p>
              </div>
            </li>
            <li className="loop__step">
              <span className="num mono">٢</span>
              <div>
                <h3>اتفقوا ثم انفصلوا</h3>
                <p>خطّطوا الرواية سوا، وبعدها كل واحد يجاوب لحاله.</p>
              </div>
            </li>
            <li className="loop__step">
              <span className="num mono">٣</span>
              <div>
                <h3>واجهوا التناقضات</h3>
                <p>رقّعوا الرواية قبل ما تنهار، ووصلوا للتقرير النهائي.</p>
              </div>
            </li>
          </ol>
          <Link className="btn btn--ghost" href="/how-to-play" style={{ marginTop: "var(--space-6)" }}>
            الشرح الكامل
          </Link>
        </section>

        {/* Built for the room */}
        <section className="section container" aria-labelledby="built-h">
          <div className="section-head">
            <p className="eyebrow">مصمّمة للجلسة</p>
            <h2 id="built-h">للغرفة، مو للتلفزيون</h2>
          </div>
          <ul className="features reading">
            <li>بدون حساب ولا تسجيل.</li>
            <li>بدون تلفزيون — كل شي على الجوالات.</li>
            <li>بدون تحميل ولا تطبيق.</li>
            <li>محد يطلع من القصة؛ لو انقطع اتصالك نرجّعك.</li>
            <li>الرواية والتوقيت يديرها الخادم — ما فيه غش بالحساب.</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="section container" aria-labelledby="faq-h">
          <div className="section-head">
            <p className="eyebrow">أسئلة متكررة</p>
            <h2 id="faq-h">قبل ما تبدأون</h2>
          </div>
          <div className="faq reading">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="section container">
          <div className="final-cta">
            <h2>جاهزين تتفقون؟</h2>
            <p style={{ color: "var(--paper-100)", maxWidth: "40ch", marginInline: "auto" }}>
              أنشئ غرفة الحين، شارك الرمز مع الشلة، وشوفوا مين بيخرب الرواية.
            </p>
            <div className="hero__actions">
              <Link className="btn btn--evidence" href="/create">
                أنشئ غرفة
              </Link>
              <Link className="btn btn--ghost" href="/play" style={{ color: "var(--paper-50)", borderColor: "var(--paper-100)" }}>
                ادخل برمز
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
