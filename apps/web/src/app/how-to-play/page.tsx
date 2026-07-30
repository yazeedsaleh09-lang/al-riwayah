import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GalleryRail } from "@/components/GalleryRail";
import { ContradictionDemo } from "@/components/ContradictionDemo";

export const metadata: Metadata = {
  title: "كيف تُلعب",
  description: "شرح كامل لطريقة لعب الرواية: من الاتفاق إلى التحقيق إلى التقرير.",
  alternates: { canonical: "/how-to-play" },
};

const ETIQUETTE = [
  ["وقت التخطيط", "الكلام مسموح ومطلوب. اتفقوا على الرواية بصوت عالٍ."],
  ["وقت التحقيق", "لا كلام، ولا تورّي شاشتك. كل واحد يجاوب لحاله."],
  ["وقت التناقض", "ارفعوا أصواتكم. ناقشوا التناقض واختاروا ترقيعة واحدة."],
  ["السؤال الأخير", "صمت تام. آخر إجابة تُقفل الرواية."],
] as const;

export default function HowToPlay() {
  return (
    <>
      <SiteNav />
      <main id="main" className="guide-page">
        <header className="page-hero page-hero--guide">
          <div className="container">
            <p className="section-label">الشرح في أقل من دقيقة</p>
            <h1>
              رواية واحدة.
              <br />
              ستة شهود سيئين.
            </h1>
            <div className="page-hero__summary">
              <p>
                اتفقوا على اللي صار. بعدها ينفصل كل لاعب بجواله ويجاوب بدون مساعدة. كل تعارض واضح
                يصير تناقضًا لازم تصلحونه قبل التقرير.
              </p>
              <span className="mono">06 مراحل / 13–18 دقيقة</span>
            </div>
          </div>
        </header>

        <GalleryRail />

        <section className="etiquette" aria-labelledby="etiquette-title">
          <div className="container etiquette__grid">
            <header>
              <p className="section-label">قواعد الغرفة</p>
              <h2 id="etiquette-title">
                متى تتكلمون.
                <br />
                ومتى تسكتون.
              </h2>
            </header>
            <ol>
              {ETIQUETTE.map(([title, copy], index) => (
                <li key={title}>
                  <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="contradiction-section contradiction-section--guide" aria-labelledby="worked-title">
          <div className="container">
            <header className="contradiction-section__heading">
              <p className="section-label">مثال كامل</p>
              <h2 id="worked-title">
                التناقض واضح.
                <br />
                ترقيعه أصعب.
              </h2>
              <p>
                الشهادة الأولى تربط لاعبين في مكان واحد. الثانية تنكر العلاقة والمكان. الحل ممكن،
                لكنه يخلق سؤالًا جديدًا عن الوقت.
              </p>
            </header>
            <ContradictionDemo />
          </div>
        </section>

        <section className="reconnect-note" aria-labelledby="reconnect-title">
          <div className="container reconnect-note__grid">
            <p className="mono">RECOVER / 01</p>
            <div>
              <h2 id="reconnect-title">لو انقطع اتصالك، ما تطلع من الرواية.</h2>
              <p>
                نوقف التفاعل عندك، نحاول نرجّع الجلسة، ونستعيد شاشتك الخاصة فقط. الوقت والمرحلة
                يظلون عند الخادم، مو عند جوالك.
              </p>
            </div>
          </div>
        </section>

        <section className="closing-cta closing-cta--light" aria-labelledby="guide-cta-title">
          <div className="container">
            <p className="section-label">فهمتوها؟</p>
            <h2 id="guide-cta-title">اختبروا ذاكرتكم.</h2>
            <div className="hero__actions">
              <Link className="btn btn--primary" href="/create">
                افتحوا غرفة
              </Link>
              <Link className="btn btn--ghost" href="/join">
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
