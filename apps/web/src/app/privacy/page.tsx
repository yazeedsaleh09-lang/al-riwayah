import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { SimplePageHero } from "@/components/SimpleUI";

export const metadata: Metadata = {
  title: "الخصوصية",
  description: "خصوصية الرواية: لا حسابات، لا إعلانات، وغرف مؤقتة في ذاكرة الخادم.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="simple-page">
        <SimplePageHero
          label="الخصوصية"
          title="بيانات أقل. جلسة أوضح."
          copy="لا حساب، لا تتبّع إعلاني، والغرف مؤقتة في ذاكرة الخادم."
          action={false}
        />
        <article className="simple-section">
          <div className="simple-container simple-document">
            <dl className="simple-meta" aria-label="بيانات الوثيقة">
              <div><dt>آخر تحديث</dt><dd>يوليو ٢٠٢٦</dd></div>
              <div><dt>الحالة</dt><dd>سارية</dd></div>
            </dl>
            <section>
              <h2>الأساس</h2>
              <p>الرواية لا تطلب حساب ولا تسجيل دخول ولا تحميل. اللعب من المتصفح مباشرة.</p>
            </section>
            <section>
              <h2>وش نجمع؟</h2>
              <ul>
                <li>الاسم الذي تكتبه يظهر للاعبين داخل الغرفة فقط، ويبقى مع حالة الغرفة المؤقتة.</li>
                <li>حالة الغرفة، ومنها المرحلة والتوقيت والإجابات اللازمة لإدارة المباراة، تُخزّن مؤقتًا في ذاكرة الخادم ولا تُكتب في قاعدة بيانات.</li>
                <li>رمز استعادة سري يبقى في تخزين جلسة تبويب المتصفح، ويُدوّر عند نجاح الاستعادة.</li>
              </ul>
            </section>
            <section>
              <h2>وش ما نجمعه؟</h2>
              <ul>
                <li>لا نحتفظ بإجاباتكم الخاصة في قاعدة بيانات دائمة.</li>
                <li>لا نبيع بيانات ولا نستخدم إعلانات تتبّع.</li>
                <li>لا نطلب بريدًا أو رقمًا أو بيانات دفع.</li>
              </ul>
            </section>
            <section>
              <h2>مدة الاحتفاظ</h2>
              <p>تنتهي الغرف الخاملة بعد مدة محددة، وللغرفة عمر أقصى حتى لو بقيت نشطة. تُفقد الغرف عند إعادة تشغيل الخادم لأن التخزين في الذاكرة فقط. لا توجد في الإصدار الحالي أداة تحليلات أو قياسات استخدام في المتصفح.</p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
