import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "الشروط",
  description: "شروط استخدام الرواية.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="container legal-page">
        <header className="legal-page__title">
          <p className="section-label">بيننا وبينكم</p>
          <h1 className="display">الشروط</h1>
          <dl className="legal-meta">
            <div><dt>آخر تحديث</dt><dd>يوليو ٢٠٢٦</dd></div>
            <div><dt>الحالة</dt><dd>سارية</dd></div>
          </dl>
        </header>
        <aside className="legal-page__index" aria-label="فهرس الشروط">
          <span className="mono">INDEX / 04</span>
          <a href="#usage">الاستخدام</a>
          <a href="#content">المحتوى</a>
          <a href="#warranty">عدم الضمان</a>
          <a href="#ownership">الملكية</a>
        </aside>
        <article className="legal-page__body">
          <p className="legal-lede">العبوا بصدق مع بعض، حتى لو كانت مهمتكم داخل اللعبة هي الكذب.</p>

          <h2 id="usage">الاستخدام</h2>
          <p>
            الرواية لعبة ترفيهية للعب الجماعي. باستخدامك اللعبة توافق على استخدامها بشكل مسؤول
            واحترام باقي اللاعبين.
          </p>

          <h2 id="content">المحتوى</h2>
          <p>
            يتضمن الإصدار الحالي قضية واحدة قابلة للعب بالكامل. قد تتغير التفاصيل
            والتوازن في تحديثات لاحقة.
          </p>

          <h2 id="warranty">عدم الضمان</h2>
          <p>
            تُقدَّم الخدمة «كما هي». الغرف مؤقتة وقد تنتهي عند بلوغ عمرها الأقصى
            أو عند إعادة تشغيل الخادم.
          </p>

          <h2 id="ownership">الملكية</h2>
          <p>التصميم والنصوص والرسومات أصلية. لا تُستخدم قوالب أو أصول غير مرخّصة.</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
