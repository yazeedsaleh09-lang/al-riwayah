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
  "افهموا سرقة بنك الساحة",
  "ابنوا الرواية على الخريطة",
  "جاوبوا السؤال الأول لحالكم",
  "افهموا التناقض واختاروا تفسيره",
  "واجهوا الدليل والسؤال الأخير",
  "استلموا الحكم والترتيب",
] as const;

export default function HowToPlay() {
  return (
    <>
      <SiteNav />
      <main id="main" className="simple-page">
        <SimplePageHero
          label="كيف تلعب"
          title="من رواية واحدة إلى نتيجة تكشف كل شيء."
          copy="ابنوا رواية تفسر وجودكم قرب البنك، جاوبوا لحالكم، ثم اختاروا تفسيرًا يفتح عليكم الدليل الجاي."
        />

        <section className="simple-section" aria-labelledby="steps-title">
          <div className="simple-container">
            <SectionHeader label="ثلاث خطوات" title="اللعبة واضحة من أول دقيقة." id="steps-title" />
            <div className="simple-grid">
              <StepCard number="١" title="ابنوا الرواية">حددوا السبب والمواقع والمفتاح والشنطة على الخريطة.</StepCard>
              <StepCard number="٢" title="كل واحد يجاوب لحاله">كل سؤال خاص بصاحب الجوال، وبعد التثبيت تنتظر في نفس الشاشة.</StepCard>
              <StepCard number="٣" title="اختاروا تفسيركم">ناقشوا التناقض، ثبتوا تفسيرًا، وشوفوا هل الدليل يركب عليه.</StepCard>
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
            <SectionHeader label="قواعد الغرفة" title="كل لحظة لها هدف." id="rules-title" />
            <div className="simple-grid simple-grid--two">
              <SimpleCard><h3>متى تتكلمون</h3><p>وقت التخطيط ووقت مناقشة التناقض.</p></SimpleCard>
              <SimpleCard><h3>متى تجاوبون لحالكم</h3><p>وقت السؤال الأول والسؤال الجنائي الأخير.</p></SimpleCard>
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
