import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "كيف تُلعب",
  description: "شرح كامل لطريقة لعب الرواية: من الاتفاق إلى التحقيق إلى التقرير.",
  alternates: { canonical: "/how-to-play" },
};

const PHASES = [
  ["القضية", "تشوفون تفاصيل الحادثة والأدلة الثابتة."],
  ["دليلك الخاص", "كل واحد ياخذ دليل يخصه لحاله — لا تورّي شاشتك."],
  ["التخطيط", "تتفقون على السبب، أماكنكم وقت الحادثة، والأدوار."],
  ["التحقيق", "كل واحد بجواله يجاوب أسئلة سريعة، بدون كلام."],
  ["التناقض", "المحرك يكشف أقوى تعارض ويشرح سببه بالنص."],
  ["الترقيع", "تختارون حلًّا يصلح التناقض لكنه يفتح التزامًا جديدًا."],
  ["دليل مفاجئ", "دليل جديد يقلب بعض حساباتكم."],
  ["السؤال الأخير", "سؤال حاسم، بصمت، وكل واحد لحاله."],
  ["التقرير", "أربعة معايير: تماسك، معقولية، ثبات، تهرّب."],
];

export default function HowToPlay() {
  return (
    <>
      <SiteNav />
      <main id="main" className="container section reading">
        <p className="eyebrow">دليل اللعب</p>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem,8vw,4rem)" }}>
          القواعد في أقل من دقيقة
        </h1>
        <p style={{ color: "var(--muted)" }}>
          مجموعة متورطة في حادثة. تتفقون على رواية واحدة، وينفصل كل واحد بجواله. المحقق ما يحتاج
          الحقيقة — يكفيه تناقض واحد. مهمتكم تحافظون على الرواية.
        </p>

        <h2 style={{ marginTop: "var(--space-12)" }}>مراحل الجولة</h2>
        <ol className="loop" style={{ counterReset: "none" }}>
          {PHASES.map(([t, d], i) => (
            <li className="loop__step" key={t}>
              <span className="num mono">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 style={{ marginTop: "var(--space-12)" }}>آداب الشاشة</h2>
        <ul className="features">
          <li>وقت التخطيط: الكلام مسموح ومطلوب.</li>
          <li>وقت التحقيق الفردي: لا كلام، ولا تورّي شاشتك.</li>
          <li>وقت التناقض والترقيع: نقاش مفتوح.</li>
          <li>السؤال الأخير: صمت تام.</li>
        </ul>

        <h2 style={{ marginTop: "var(--space-12)" }}>مثال تناقض وترقيع</h2>
        <div className="card">
          <p><strong>لاعب أ:</strong> «كنت مع لاعب ب في المستودع.»</p>
          <p><strong>لاعب ب:</strong> «كنت لحالي في المواقف.»</p>
          <p className="demo__rule">القاعدة: ما يمكن الجوابين يكونون صح بنفس اللحظة.</p>
          <p style={{ marginBottom: 0 }}>
            <strong>ترقيع ممكن:</strong> «كان معه قبلها ثم طلع للمواقف» — يصلح التناقض، لكن يفتح سؤال:
            متى رجع بالضبط؟
          </p>
        </div>

        <h2 style={{ marginTop: "var(--space-12)" }}>لو انقطع اتصالك</h2>
        <p style={{ color: "var(--muted)" }}>
          نجمّد شاشتك، نحاول نرجّعك، ونعيد لك دورك وإجاباتك المثبّتة. محد يطلع من القصة.
        </p>

        <h2 style={{ marginTop: "var(--space-12)" }}>الوصول</h2>
        <p style={{ color: "var(--muted)" }}>
          أزرار كبيرة، دعم القارئ الصوتي، خيار تقليل الحركة وكتم الصوت، والتناقض يُشرح بالنص لا باللون
          فقط.
        </p>

        <div className="hero__actions" style={{ marginTop: "var(--space-12)" }}>
          <Link className="btn btn--evidence" href="/create">أنشئ غرفة</Link>
          <Link className="btn btn--ghost" href="/play">ادخل برمز</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
