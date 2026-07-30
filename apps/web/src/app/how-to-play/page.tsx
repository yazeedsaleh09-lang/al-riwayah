import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import {
  ActionGroup,
  SectionHeader,
  SimpleCard,
  SimplePageHero,
  StepCard,
} from "@/components/SimpleUI";

export const metadata: Metadata = {
  title: "كيف تُلعب",
  description: "طريقة لعب الرواية في أقل من دقيقة.",
  alternates: { canonical: "/how-to-play" },
};

const FLOW = [
  "تجهيز الغرفة",
  "السؤال السري",
  "انتظار اللاعبين",
  "كشف التناقض",
  "السؤال الأصعب",
  "النتيجة",
] as const;

export default function HowToPlay() {
  return (
    <>
      <SiteNav />
      <main id="main" className="simple-page">
        <SimplePageHero
          label="كيف تلعب"
          title="من رواية واحدة إلى نتيجة تكشف كل شيء."
          copy="اتفقوا على اللي صار، وبعدها كل واحد يجاوب لحاله. التناقضات ترجعكم للنقاش قبل التقرير النهائي."
        />

        <section className="simple-section" aria-labelledby="steps-title">
          <div className="simple-container">
            <SectionHeader label="ثلاث خطوات" title="اللعبة واضحة من أول دقيقة." id="steps-title" />
            <div className="simple-grid">
              <StepCard number="١" title="اتفقوا على الرواية">حددوا السبب والمكان والأدوار مع بعض.</StepCard>
              <StepCard number="٢" title="كل واحد يجاوب لحاله">كل سؤال خاص بصاحب الجوال، وبدون مساعدة.</StepCard>
              <StepCard number="٣" title="واجهوا التناقضات والنتيجة">ناقشوا الاختلاف، اختاروا ترقيعة، وشوفوا التقرير.</StepCard>
            </div>
          </div>
        </section>

        <section className="simple-section simple-section--alternate" aria-labelledby="flow-title">
          <div className="simple-container">
            <SectionHeader label="مسار الجلسة" title="ست محطات قصيرة." id="flow-title" />
            <ol className="simple-flow">
              {FLOW.map((item, index) => (
                <li key={item}><span className="step-card__number">{index + 1}</span><strong>{item}</strong></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="simple-section" aria-labelledby="rules-title">
          <div className="simple-container">
            <SectionHeader label="قواعد الغرفة" title="الكلام له وقته." id="rules-title" />
            <div className="simple-grid simple-grid--two">
              <SimpleCard><h3>متى تتكلمون</h3><p>وقت التخطيط ووقت مناقشة التناقض.</p></SimpleCard>
              <SimpleCard><h3>متى تسكتون</h3><p>وقت الأسئلة الخاصة والسؤال الأخير.</p></SimpleCard>
              <SimpleCard><h3>لا تعرض شاشتك</h3><p>السؤال والدليل الخاص لك أنت فقط.</p></SimpleCard>
              <SimpleCard><h3>وش يصير إذا انقطع الاتصال</h3><p>نحاول نرجع جلستك ونكمل من نفس المرحلة.</p></SimpleCard>
            </div>
          </div>
        </section>

        <section className="simple-section simple-section--alternate">
          <div className="simple-container simple-page-hero">
            <h2>جاهزين تثبتون روايتكم؟</h2>
            <p>افتحوا غرفة وشاركوا الرمز مع الشلة.</p>
            <ActionGroup />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
