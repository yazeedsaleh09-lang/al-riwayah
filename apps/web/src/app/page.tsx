import Link from "next/link";
import { publicCaseSummaries } from "@al-riwayah/content";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TestimonyEditor } from "@/components/TestimonyEditor";
import { Ticker } from "@/components/Ticker";
import { ContradictionDemo } from "@/components/ContradictionDemo";
import { GalleryRail } from "@/components/GalleryRail";
import { SITE } from "@/lib/site";

const COLLAPSE = [
  {
    label: "إفادة واحدة",
    title: "اتفقوا",
    copy: "اختاروا سبب وجودكم، أماكنكم، وأدواركم. هذه هي الجملة الوحيدة اللي يشوفها الجميع.",
  },
  {
    label: "ست شاشات",
    title: "انفصلوا",
    copy: "كل لاعب يأخذ دليلًا وسؤالًا مختلفًا. محد يقدر يراجع الرواية بعد الآن.",
  },
  {
    label: "شرخ واضح",
    title: "انكشفوا",
    copy: "الخادم يقارن الإجابات بالأدلة ويكشف أقوى تعارض مع سبب مفهوم للجميع.",
  },
] as const;

const AXES = [
  { label: "تماسك الرواية", value: 78, danger: false },
  { label: "معقولية الرواية", value: 64, danger: false },
  { label: "الثبات", value: 55, danger: false },
  { label: "التهرّب", value: 30, danger: true },
] as const;

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
  const firstCase = publicCaseSummaries()[0];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />
      <main id="main">
        <section className="hero" id="top">
          <div className="container hero__inner">
            <div className="hero__copy">
              <p className="hero__eyebrow">رواية واحدة · ست شهادات · ٤–٦ أشخاص</p>
              <h1 className="hero__title">
                <span>كل رواية تتغيّر</span>
                <span>مع كل شهادة.</span>
              </h1>
              <p className="hero__lede">
                اسألوا، قارِنوا، واكشفوا التفصيلة اللي ما تثبت.
                <br />
                كل لاعب على جواله — بدون تحميل أو شاشة مشتركة.
              </p>
              <div className="hero__actions">
                <Link className="btn btn--primary" href="/create">
                  ابدأ جلسة
                </Link>
                <Link className="btn btn--ghost" href="/play">
                  عندي رمز
                </Link>
              </div>
            </div>
            <TestimonyEditor />
          </div>
        </section>

        <div className="credibility-strip" aria-label="متطلبات اللعب">
          <div className="container">
            <span>٤–٦ لاعبين</span>
            <span>جوالات فقط</span>
            <span>بدون تحميل</span>
          </div>
        </div>

        <Ticker />

        <section className="collapse-story" aria-labelledby="collapse-title">
          <div className="container">
            <header className="collapse-story__heading">
              <p className="section-label">كيف تنهار الرواية</p>
              <h2 id="collapse-title">
                تبدأ بجملة.
                <br />
                وتنتهي بست نسخ.
              </h2>
            </header>
            <div className="collapse-story__sequence">
              {COLLAPSE.map((item, index) => (
                <article key={item.title}>
                  <div className="collapse-story__line" aria-hidden>
                    <span />
                    {index > 0 && <span />}
                    {index > 1 && <span />}
                  </div>
                  <p className="mono">{String(index + 1).padStart(2, "0")}</p>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <GalleryRail compact />

        <section className="contradiction-section" aria-labelledby="contradiction-title">
          <div className="container">
            <header className="contradiction-section__heading">
              <p className="section-label">لحظة التناقض</p>
              <h2 id="contradiction-title">
                الدليل ما يصرخ.
                <br />
                يغيّر معنى كلامكم.
              </h2>
              <p>اسحب فوق الشهادتين وشوف وين تنفصل الرواية عن اللي أثبته الدليل.</p>
            </header>
            <ContradictionDemo />
          </div>
        </section>

        {firstCase && (
          <section className="case-feature" aria-labelledby="case-title">
            <div className="container case-feature__grid">
              <div className="case-feature__index">
                <span className="mono">CASE / 001</span>
                <span className="availability">
                  <span aria-hidden />
                  متاحة الآن
                </span>
              </div>
              <div className="case-feature__copy">
                <p className="section-label">القضية القابلة للعب</p>
                <h2 id="case-title">{firstCase.title.ar}</h2>
                <p>{firstCase.pitch.ar}</p>
                <dl>
                  <div>
                    <dt>اللاعبون</dt>
                    <dd className="mono">
                      {firstCase.playerCounts[0]}–{firstCase.playerCounts.at(-1)}
                    </dd>
                  </div>
                  <div>
                    <dt>المدة</dt>
                    <dd className="mono">
                      {firstCase.durationMinutes[0]}–{firstCase.durationMinutes[1]} دقيقة
                    </dd>
                  </div>
                  <div>
                    <dt>التعقيد</dt>
                    <dd>{firstCase.complexity.ar}</dd>
                  </div>
                </dl>
                <div className="hero__actions">
                  <Link className="btn btn--primary" href="/create">
                    العبوا القضية
                  </Link>
                  <Link className="text-link" href="/cases">
                    افتح فهرس القضايا
                  </Link>
                </div>
              </div>
              <div className="case-feature__evidence" aria-label="أدلة القضية العامة">
                <span className="mono">23:46</span>
                <p>انطفأت الكهرباء.</p>
                <span className="mono">23:48</span>
                <p>جهاز اتصل بشبكة المستودع.</p>
                <span className="mono">00:01</span>
                <p>سيارة غادرت المواقف.</p>
              </div>
            </div>
          </section>
        )}

        <section className="report-preview" aria-labelledby="report-title">
          <div className="container report-preview__grid">
            <header>
              <p className="section-label">التقرير النهائي</p>
              <h2 id="report-title">
                التقرير ما يعطيكم
                <br />
                رقمًا وخلاص.
              </h2>
              <p>يربط أول شرخ بأغلى ترقيعة، ويقول مين حافظ الرواية ومين فتح عليها أبوابًا جديدة.</p>
            </header>
            <div className="report-sheet">
              <div className="report-sheet__top">
                <span>الرواية تماسكت</span>
                <strong className="mono">B</strong>
              </div>
              <div className="report-sheet__fracture" aria-hidden>
                <span />
                <span />
              </div>
              <div className="axes">
                {AXES.map((axis) => (
                  <div className={`axis ${axis.danger ? "is-evasion" : ""}`} key={axis.label}>
                    <div className="label">
                      <span>{axis.label}</span>
                      <span className="mono">{axis.value}</span>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${axis.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="report-sheet__note">تفسير الشاحن أنقذ تناقضين… وفتح ثلاثة.</p>
            </div>
          </div>
        </section>

        <section className="closing-cta" aria-labelledby="closing-title">
          <div className="container">
            <p className="section-label">الرواية تبدأ منكم</p>
            <h2 id="closing-title">
              نفس الجملة.
              <br />
              ست ذاكرات.
            </h2>
            <p>افتحوا غرفة، اتفقوا على التفاصيل، وشوفوا أي شهادة تنفصل أول.</p>
            <div className="hero__actions">
              <Link className="btn btn--primary" href="/create">
                افتحوا غرفة
              </Link>
              <Link className="btn btn--ghost" href="/play">
                عندي رمز
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
