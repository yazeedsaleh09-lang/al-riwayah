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
          <p className="eyebrow">بيننا وبينكم</p>
          <h1 className="display">الشروط</h1>
          <p style={{ color: "var(--muted)" }}>آخر تحديث: يوليو ٢٠٢٦ · نسخة المراجعة</p>
        </header>
        <article className="legal-page__body">
          <p className="legal-lede">العبوا بصدق مع بعض، حتى لو كانت مهمتكم داخل اللعبة هي الكذب.</p>

          <h2>الاستخدام</h2>
          <p>
            الرواية لعبة ترفيهية للعب الجماعي. باستخدامك اللعبة توافق على استخدامها بشكل مسؤول
            واحترام باقي اللاعبين.
          </p>

          <h2>المحتوى</h2>
          <p>
            هذه نسخة مراجعة فيها قضية واحدة كاملة. قد تتغير التفاصيل والتوازن بناءً على التجارب.
          </p>

          <h2>عدم الضمان</h2>
          <p>تُقدَّم الخدمة «كما هي» خلال فترة المراجعة. قد تنتهي الغرف عند إعادة تشغيل الخادم.</p>

          <h2>الملكية</h2>
          <p>التصميم والنصوص والرسومات أصلية. لا تُستخدم قوالب أو أصول غير مرخّصة.</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
