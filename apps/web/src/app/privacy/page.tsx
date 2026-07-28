import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "الخصوصية",
  description: "سياسة خصوصية الرواية: لا حسابات، لا تتبّع، غرف مؤقتة.",
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
            <div><dt>الحالة</dt><dd>نسخة المراجعة</dd></div>
          </dl>
        </header>
        <aside className="legal-page__index" aria-label="فهرس الخصوصية">
          <span className="mono">INDEX / 04</span>
          <a href="#basis">الأساس</a>
          <a href="#collected">وش نجمع؟</a>
          <a href="#not-collected">وش ما نجمعه؟</a>
          <a href="#metrics">القياسات</a>
        </aside>
        <article className="legal-page__body">
          <p className="legal-lede">
            لا حساب. لا تتبّع إعلاني. ولا نحفظ أسرار جلستكم بعد انتهائها.
          </p>

          <h2 id="basis">الأساس</h2>
          <p>الرواية لا تطلب حساب ولا تسجيل دخول ولا تحميل. اللعب من المتصفح مباشرة.</p>

          <h2 id="collected">وش نجمع؟</h2>
          <ul className="features">
            <li>الاسم الذي تكتبه — يظهر للشلة داخل الغرفة فقط، ولا يُحفظ بعد انتهاء الغرفة.</li>
            <li>
              حالة الغرفة (المرحلة، التوقيت) تُخزّن مؤقتًا في ذاكرة الخادم وتُحذف عند انتهاء الجلسة.
            </li>
            <li>رمز جلسة تقني في متصفحك ليعيد ربطك لو انقطع الاتصال — يُمسح بانتهاء الجلسة.</li>
          </ul>

          <h2 id="not-collected">وش ما نجمعه؟</h2>
          <ul className="features">
            <li>لا نحفظ إجاباتكم الخاصة داخل اللعبة بشكل دائم.</li>
            <li>لا نبيع بيانات ولا نستخدم إعلانات تتبّع.</li>
            <li>لا نطلب بريدًا ولا رقمًا ولا بيانات دفع.</li>
          </ul>

          <h2 id="metrics">القياسات</h2>
          <p>
            قد نجمع قياسات مجمّعة ومجهولة الهوية (مثل مدة المرحلة أو عدد مرات إعادة الاتصال) لتحسين
            اللعبة، دون ربطها بهويتك.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
