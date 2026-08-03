import Link from "next/link";
import { publicCaseSummaries } from "@al-riwayah/content";
import { ActionGroup, SectionHeader, SimpleCard, StepCard } from "./SimpleUI";

export function HomeContinuation() {
  const gameCase = publicCaseSummaries()[0];

  return (
    <div className="simple-page home-continuation">
      <section className="simple-section" aria-labelledby="home-how-title">
        <div className="simple-container">
          <SectionHeader label="كيف تمشي الجلسة" title="ثلاث خطوات واضحة." id="home-how-title" />
          <div className="simple-grid">
            <StepCard number="١" title="ابنوا الرواية">ثبتوا أماكنكم والمفتاح والشنطة على خريطة بنك الساحة.</StepCard>
            <StepCard number="٢" title="جاوبوا لحالكم">كل واحد يثبت جوابًا خاصًا من جواله.</StepCard>
            <StepCard number="٣" title="حموا تفسيركم">اختاروا تفسيرًا، واجهوه بالدليل، وشوفوا الحكم والترتيب.</StepCard>
          </div>
        </div>
      </section>

      <section className="simple-section simple-section--alternate" aria-labelledby="session-title">
        <div className="simple-container simple-grid simple-grid--two">
          <SectionHeader
            label="داخل الجلسة"
            title="كل مرحلة لها هدف واحد."
            copy="كل سؤال ودليل يطلع بسبب الرواية اللي ثبتتوها، والشبهة تتغير بسبب واضح."
            id="session-title"
          />
          <div className="simple-grid simple-grid--two">
            {["خريطة مشتركة", "سؤالان خاصان", "تفسير ودليل", "حكم وترتيب"].map((item) => (
              <SimpleCard key={item}><h3>{item}</h3></SimpleCard>
            ))}
          </div>
        </div>
      </section>

      {gameCase ? (
        <section className="simple-section" aria-labelledby="home-case-title">
          <div className="simple-container">
            <SectionHeader label="القضية المتاحة" title="قضية حقيقية واحدة جاهزة." id="home-case-title" />
            <SimpleCard>
              <h3>{gameCase.title.ar}</h3>
              <p>{gameCase.pitch.ar}</p>
              <dl className="simple-grid">
                <div><dt>اللاعبون</dt><dd>{gameCase.playerCounts[0]}–{gameCase.playerCounts.at(-1)}</dd></div>
                <div><dt>المدة</dt><dd>{gameCase.durationMinutes[0]}–{gameCase.durationMinutes[1]} دقيقة</dd></div>
                <div><dt>الصعوبة</dt><dd>{gameCase.complexity.ar}</dd></div>
              </dl>
              <Link className="simple-button simple-button--primary" href="/create">ابدأ القضية</Link>
            </SimpleCard>
          </div>
        </section>
      ) : null}

      <section className="simple-section simple-section--alternate" aria-labelledby="preview-title">
        <div className="simple-container">
          <SectionHeader
            label="على الجوال"
            title="واجهة مركزة لكل لحظة."
            copy="الخريطة والسؤال والدليل والحكم يبقون داخل ملف تحقيق واحد واضح."
            id="preview-title"
          />
          <div className="simple-grid">
            {([
              ["الرواية على الخريطة", "حددوا أماكنكم وقت الإنذار وثبتوا المفتاح والشنطة."],
              ["المحقق مسك تناقض", "قولان باسمين ووقت واحد، ومعهم سبب ارتفاع الشبهة."],
              ["الدليل وصل", "الكاميرا اللي فتحها تفسيركم تختبر الحركة أو الهوية."],
            ] as const).map(([title, copy]) => (
              <SimpleCard key={title}>
                <p className="simple-label">قضية بنك الساحة</p>
                <h3>{title}</h3><p>{copy}</p>
              </SimpleCard>
            ))}
          </div>
        </div>
      </section>

      <section className="simple-section">
        <div className="simple-container simple-page-hero">
          <h2>جاهزين تبدأون؟</h2>
          <p>افتحوا غرفة أو ادخلوا بالرمز.</p>
          <ActionGroup />
        </div>
      </section>
    </div>
  );
}
