import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "عن الرواية",
  description:
    "الرواية لعبة جماعية عربية لـ٤–٦ أشخاص، تُلعب على الجوالات خلال ١٣–١٨ دقيقة.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="container legal-page">
        <header className="legal-page__title">
          <p className="section-label">عن اللعبة</p>
          <h1 className="display">الرواية</h1>
          <p className="legal-lede">
            اتفقوا على رواية. ولا تختلفون.
          </p>
        </header>
        <aside className="legal-page__index" aria-label="فهرس الصفحة">
          <span className="mono">ABOUT / 03</span>
          <a href="#idea">الفكرة</a>
          <a href="#session">الجلسة</a>
          <a href="#privacy">اللعب الخاص</a>
        </aside>
        <article className="legal-page__body">
          <h2 id="idea">الفكرة</h2>
          <p>
            الرواية لعبة تحقيق اجتماعية عربية. تبدأون كشلّة تحاول تثبيت قصة
            واحدة، ثم يختبر التحقيق تفاصيلها بأسئلة خاصة وتناقضات تظهر في وقتها.
            الخادم يدير المراحل والتوقيت والنتيجة، وكل لاعب يشارك من جواله.
          </p>

          <h2 id="session">الجلسة</h2>
          <ul className="features">
            <li>مصممة لـ٤–٦ لاعبين في المكان نفسه.</li>
            <li>تستغرق القضية المتاحة عادة ١٣–١٨ دقيقة.</li>
            <li>تعمل مباشرة في متصفح الجوال: بدون حساب، وبدون تحميل تطبيق.</li>
            <li>ما تحتاجون تلفزيون أو شاشة مشتركة؛ الرمز يجمع الجوالات في غرفة واحدة.</li>
          </ul>

          <h2 id="privacy">اللعب الخاص</h2>
          <p>
            الأسئلة والأدلة الخاصة تظهر لصاحب الجوال فقط. لا تُنشر الإجابات
            الخاصة في حالة الغرفة العامة، وتنتهي الغرفة المؤقتة بانتهاء عمرها
            أو عند إعادة تشغيل الخادم.
          </p>

          <div className="hero__actions">
            <Link className="btn btn--primary" href="/create">ابدأ جلسة</Link>
            <Link className="btn btn--ghost" href="/join">ادخل برمز</Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
