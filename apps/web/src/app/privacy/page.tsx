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
      <main id="main" className="container section reading">
        <h1 className="display" style={{ fontSize: "clamp(2.2rem,7vw,3.4rem)" }}>سياسة الخصوصية</h1>
        <p style={{ color: "var(--muted)" }}>آخر تحديث: يوليو ٢٠٢٦ · نسخة المراجعة</p>

        <h2>الأساس</h2>
        <p>الرواية لا تطلب حساب ولا تسجيل دخول ولا تحميل. اللعب من المتصفح مباشرة.</p>

        <h2>وش نجمع؟</h2>
        <ul className="features">
          <li>الاسم الذي تكتبه — يظهر للشلة داخل الغرفة فقط، ولا يُحفظ بعد انتهاء الغرفة.</li>
          <li>حالة الغرفة (المرحلة، التوقيت) تُخزّن مؤقتًا في ذاكرة الخادم وتُحذف عند انتهاء الجلسة.</li>
          <li>رمز جلسة تقني في متصفحك ليعيد ربطك لو انقطع الاتصال — يُمسح بانتهاء الجلسة.</li>
        </ul>

        <h2>وش ما نجمعه؟</h2>
        <ul className="features">
          <li>لا نحفظ إجاباتكم الخاصة داخل اللعبة بشكل دائم.</li>
          <li>لا نبيع بيانات ولا نستخدم إعلانات تتبّع.</li>
          <li>لا نطلب بريدًا ولا رقمًا ولا بيانات دفع.</li>
        </ul>

        <h2>القياسات</h2>
        <p style={{ color: "var(--muted)" }}>
          قد نجمع قياسات مجمّعة ومجهولة الهوية (مثل مدة المرحلة أو عدد مرات إعادة الاتصال) لتحسين
          اللعبة، دون ربطها بهويتك.
        </p>

        <h2>التواصل</h2>
        <p style={{ color: "var(--muted)" }}>
          {/* Legal owner placeholder — to be completed before public launch. */}
          مسؤول الخصوصية: <span className="mono">[يُستكمل قبل الإطلاق]</span>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
