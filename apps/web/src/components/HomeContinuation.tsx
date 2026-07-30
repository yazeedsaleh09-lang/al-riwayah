import Link from "next/link";
import Image from "next/image";
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
            <StepCard number="١" title="اتفقوا">رتبوا السبب والمكان والأدوار في رواية واحدة.</StepCard>
            <StepCard number="٢" title="جاوبوا">كل واحد يجاوب لحاله من جواله.</StepCard>
            <StepCard number="٣" title="واجهوا النتيجة">ناقشوا التناقضات وشوفوا التقرير.</StepCard>
          </div>
        </div>
      </section>

      <section className="simple-section simple-section--alternate" aria-labelledby="session-title">
        <div className="simple-container simple-grid simple-grid--two">
          <SectionHeader
            label="داخل الجلسة"
            title="كل مرحلة لها هدف واحد."
            copy="الأسئلة الخاصة تختبر التفاصيل، والتقرير يجمع أثر كل إجابة."
            id="session-title"
          />
          <div className="simple-grid simple-grid--two">
            {["أسئلة خاصة", "تناقضات", "أسئلة متابعة", "تقرير نهائي"].map((item) => (
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
            copy="اللوبي والسؤال والنتيجة يحافظون على نفس التجربة المعتمدة."
            id="preview-title"
          />
          <div className="simple-grid">
            {([
              ["اللوبي", "شارك الرمز وشوف مين جاهز.", "/preview-lobby.png"],
              ["السؤال", "اقرأ دليلك واختر إجابتك بسرية.", "/preview-question.png"],
              ["النتيجة", "شوف أقوى تناقض وأفضل ترقيعة.", "/preview-result.png"],
            ] as const).map(([title, copy, src]) => (
              <SimpleCard key={title} className="phone-preview">
                <Image
                  src={src}
                  alt={`معاينة شاشة ${title} المعتمدة`}
                  width={390}
                  height={844}
                  priority={title === "اللوبي"}
                />
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
