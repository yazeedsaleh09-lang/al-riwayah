import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { SimplePageHero } from "@/components/SimpleUI";

export const metadata: Metadata = {
  title: "الشروط",
  description: "شروط استخدام الرواية.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="simple-page">
        <SimplePageHero
          label="الشروط"
          title="قواعد واضحة للعب."
          copy="العبوا بصدق مع بعض، حتى لو كانت مهمتكم داخل اللعبة هي الكذب."
          action={false}
        />
        <article className="simple-section">
          <div className="simple-container simple-document">
            <dl className="simple-meta" aria-label="بيانات الوثيقة">
              <div><dt>آخر تحديث</dt><dd>يوليو ٢٠٢٦</dd></div>
              <div><dt>الحالة</dt><dd>سارية</dd></div>
            </dl>
            <section>
              <h2>الاستخدام</h2>
              <p>الرواية لعبة ترفيهية للعب الجماعي. باستخدامك اللعبة توافق على استخدامها بشكل مسؤول واحترام باقي اللاعبين.</p>
            </section>
            <section>
              <h2>المحتوى</h2>
              <p>يتضمن الإصدار الحالي قضية واحدة قابلة للعب بالكامل. قد تتغير التفاصيل والتوازن في تحديثات لاحقة.</p>
            </section>
            <section>
              <h2>عدم الضمان</h2>
              <p>تُقدّم الخدمة «كما هي». الغرف مؤقتة وقد تنتهي عند بلوغ عمرها الأقصى أو عند إعادة تشغيل الخادم.</p>
            </section>
            <section>
              <h2>الملكية</h2>
              <p>التصميم والنصوص والرسومات أصلية. لا تُستخدم قوالب أو أصول غير مرخّصة.</p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
