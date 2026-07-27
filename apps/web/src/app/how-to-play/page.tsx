import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "كيف تُلعب",
  description: "شرح كامل لطريقة لعب الرواية: من الاتفاق إلى التحقيق إلى التقرير.",
  alternates: { canonical: "/how-to-play" },
};

const PHASES = [
  ["القضية", "تشوفون تفاصيل الحادثة والأدلة الثابتة."],
  ["دليلك الخاص", "كل واحد ياخذ دليل يخصه لحاله — لا تورّي شاشتك."],
  ["التخطيط", "تتفقون على السبب، أماكنكم وقت الحادثة، والأدوار."],
  ["التحقيق", "كل واحد بجواله يجاوب أسئلة سريعة، بدون كلام."],
  ["التناقض", "المحرك يكشف أقوى تعارض ويشرح سببه بالنص."],
  ["الترقيع", "تختارون حلًّا يصلح التناقض لكنه يفتح التزامًا جديدًا."],
  ["دليل مفاجئ", "دليل جديد يقلب بعض حساباتكم."],
  ["السؤال الأخير", "سؤال حاسم، بصمت، وكل واحد لحاله."],
  ["التقرير", "أربعة معايير: تماسك، معقولية، ثبات، تهرّب."],
];

export default function HowToPlay() {
  return (
    <>
      <SiteNav />
      <main id="main" className="guide-page">
        <header className="container page-hero">
          <p className="eyebrow">دليل اللعب / ٠١</p>
          <h1 className="display">
            اتفقوا.
            <br />
            ثم افترقوا.
          </h1>
          <p className="page-hero__lede">
            أنتم مجموعة متورطة في حادثة. المحقق ما يحتاج يعرف الحقيقة؛ يكفيه يلقى شرخ واحد في
            كلامكم.
          </p>
        </header>

        <section className="container section">
          <div className="section-head">
            <p className="eyebrow">تسع محطات</p>
            <h2>من القضية إلى الحكم.</h2>
          </div>
          <ol className="loop">
            {PHASES.map(([t, d], i) => (
              <li className="loop__step" key={t}>
                <span className="num mono">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="container section guide-split">
          <div>
            <p className="eyebrow">قاعدة الشاشة</p>
            <h2>
              ارفعوا أصواتكم.
              <br />
              إلا وقت التحقيق.
            </h2>
          </div>
          <ul className="features">
            <li>وقت التخطيط: الكلام مسموح ومطلوب.</li>
            <li>وقت التحقيق الفردي: لا كلام، ولا تورّي شاشتك.</li>
            <li>وقت التناقض والترقيع: نقاش مفتوح.</li>
            <li>السؤال الأخير: صمت تام.</li>
          </ul>
        </section>

        <section className="container section">
          <div className="section-head">
            <p className="eyebrow">مثال حي</p>
            <h2>الشرخ، ثم ثمن ترقيعه.</h2>
          </div>
          <div className="demo__statements">
            <div className="statement">
              <p className="who">لاعب / أ</p>
              <p>«كنت مع لاعب ب في المستودع.»</p>
            </div>
            <div className="statement is-flagged">
              <p className="who">لاعب / ب</p>
              <p>«كنت لحالي في المواقف.»</p>
            </div>
          </div>
          <p className="demo__rule" style={{ marginTop: "var(--space-6)" }}>
            ما يمكن الجوابين يكونون صح بنفس اللحظة. ممكن تقولون إنه طلع بعدها، لكن متى رجع بالضبط؟
          </p>
        </section>

        <section className="container section">
          <div className="final-cta">
            <h2>فهمتوها؟ ورّونا.</h2>
            <p>نرجّعك لو انقطع اتصالك، ونشرح كل تناقض بالنص—مو باللون لحاله.</p>
            <div className="hero__actions">
              <Link className="btn btn--evidence" href="/create">
                أنشئ غرفة
              </Link>
              <Link className="btn btn--ghost" href="/play">
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
