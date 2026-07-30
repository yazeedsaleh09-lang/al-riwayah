import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "الخصوصية",
  description: "خصوصية الرواية: لا حسابات، لا إعلانات، وغرف مؤقتة في ذاكرة الخادم.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="container legal-page">
        <header className="legal-page__title">
          <p className="section-label">وثيقة واضحة</p>
          <h1 className="display">الخصوصية</h1>
          <dl className="legal-meta">
            <div><dt>آخر تحديث</dt><dd>يوليو ٢٠٢٦</dd></div>
            <div><dt>الحالة</dt><dd>سارية</dd></div>
          </dl>
        </header>
        <aside className="legal-page__index" aria-label="فهرس الخصوصية">
          <span className="mono">INDEX / 04</span>
          <a href="#basis">الأساس</a>
          <a href="#collected">وش نجمع؟</a>
          <a href="#not-collected">وش ما نجمعه؟</a>
          <a href="#storage">مدة الاحتفاظ</a>
        </aside>
        <article className="legal-page__body">
          <p className="legal-lede">
            لا حساب. لا تتبّع إعلاني. والغرف مؤقتة في ذاكرة الخادم.
          </p>

          <h2 id="basis">الأساس</h2>
          <p>الرواية لا تطلب حساب ولا تسجيل دخول ولا تحميل. اللعب من المتصفح مباشرة.</p>

          <h2 id="collected">وش نجمع؟</h2>
          <ul className="features">
            <li>الاسم الذي تكتبه — يظهر للاعبين داخل الغرفة فقط، ويبقى مع حالة الغرفة المؤقتة.</li>
            <li>
              حالة الغرفة، ومنها المرحلة والتوقيت والإجابات اللازمة لإدارة المباراة،
              تُخزّن مؤقتًا في ذاكرة الخادم ولا تُكتب في قاعدة بيانات.
            </li>
            <li>
              رمز استعادة سري يبقى في تخزين جلسة تبويب المتصفح ليربطك من جديد إذا
              انقطع الاتصال، ويُدوّر عند نجاح الاستعادة.
            </li>
          </ul>

          <h2 id="not-collected">وش ما نجمعه؟</h2>
          <ul className="features">
            <li>لا نحتفظ بإجاباتكم الخاصة في قاعدة بيانات دائمة.</li>
            <li>لا نبيع بيانات ولا نستخدم إعلانات تتبّع.</li>
            <li>لا نطلب بريدًا ولا رقمًا ولا بيانات دفع.</li>
          </ul>

          <h2 id="storage">مدة الاحتفاظ</h2>
          <p>
            تنتهي الغرف الخاملة بعد مدة محددة، وللغرفة عمر أقصى حتى لو بقيت نشطة.
            كذلك تُفقد الغرف عند إعادة تشغيل الخادم لأن التخزين في الذاكرة فقط.
            لا توجد في الإصدار الحالي أداة تحليلات أو قياسات استخدام في المتصفح.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
