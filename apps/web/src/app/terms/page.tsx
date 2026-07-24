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
      <main id="main" className="container section reading">
        <h1 className="display" style={{ fontSize: "clamp(2.2rem,7vw,3.4rem)" }}>شروط الاستخدام</h1>
        <p style={{ color: "var(--muted)" }}>آخر تحديث: يوليو ٢٠٢٦ · نسخة المراجعة</p>

        <h2>الاستخدام</h2>
        <p>الرواية لعبة ترفيهية للعب الجماعي. باستخدامك اللعبة توافق على استخدامها بشكل مسؤول واحترام باقي اللاعبين.</p>

        <h2>المحتوى</h2>
        <p style={{ color: "var(--muted)" }}>
          هذه نسخة مراجعة فيها قضية واحدة كاملة. قد تتغير التفاصيل والتوازن بناءً على التجارب.
        </p>

        <h2>عدم الضمان</h2>
        <p style={{ color: "var(--muted)" }}>
          تُقدَّم الخدمة «كما هي» خلال فترة المراجعة. قد تنتهي الغرف عند إعادة تشغيل الخادم.
        </p>

        <h2>الملكية</h2>
        <p style={{ color: "var(--muted)" }}>
          التصميم والنصوص والرسومات أصلية. لا تُستخدم قوالب أو أصول غير مرخّصة.
        </p>

        <h2>الجهة المسؤولة</h2>
        <p style={{ color: "var(--muted)" }}>
          {/* Legal entity placeholder — to be completed before public launch. */}
          الجهة المالكة: <span className="mono">[يُستكمل قبل الإطلاق]</span>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
