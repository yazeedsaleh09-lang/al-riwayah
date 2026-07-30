import Link from "next/link";
import { getCase, publicCaseSummaries } from "@al-riwayah/content";
import styles from "./HomeContinuation.module.css";

export function HomeContinuation() {
  const summary = publicCaseSummaries()[0];
  const gameCase = summary ? getCase(summary.id) : undefined;
  const previewQuestion = gameCase?.questions.find(
    (question) => question.family === "foundation" && question.options?.length,
  );
  const previewEvidence = gameCase?.privateEvidencePool[0];

  return (
    <div className={styles.root}>
      <section className={styles.intro} aria-labelledby="home-how-title">
        <div className={styles.container}>
          <p className={styles.label}>وش يصير في الجلسة؟</p>
          <div className={styles.introGrid}>
            <h2 id="home-how-title">رواية واحدة تحت ضغط الأسئلة.</h2>
            <p>
              تبدأون وأنتم مع بعض: ترتّبون المكان والسبب والأدوار. بعدها كل واحد
              يمسك جواله ويجاوب لحاله. الخادم يقارن التفاصيل، يكشف التناقضات،
              ويعيدكم للنقاش قبل التقرير النهائي.
            </p>
          </div>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <h3>اتفقوا</h3>
              <p>اختاروا رواية مشتركة قبل ما يبدأ التحقيق.</p>
            </li>
            <li>
              <span>02</span>
              <h3>افترقوا</h3>
              <p>كل لاعب يجاوب من جواله، بدون ما يشوف إجابات غيره.</p>
            </li>
            <li>
              <span>03</span>
              <h3>رقّعوا</h3>
              <p>إذا ظهر تناقض، ناقشوه واتفقوا على جواب واحد يكمل الرواية.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.preview} aria-labelledby="home-preview-title">
        <div className={styles.container}>
          <header className={styles.previewHeading}>
            <p className={styles.label}>لقطة من القضية المتاحة</p>
            <h2 id="home-preview-title">السؤال خاص. النتيجة على الجميع.</h2>
            <p>
              لا تعرضون شاشاتكم وقت التحقيق. كل جهاز يأخذ سؤاله ودليله الخاص،
              بينما حالة الغرفة العامة لا تكشف الإجابات قبل وقتها.
            </p>
          </header>

          <div className={styles.phonePair}>
            <article className={styles.phone} aria-label="مثال سؤال على الجوال">
              <div className={styles.phoneTop}>
                <span>سؤال ١ من ٥</span>
                <bdi>00:32</bdi>
              </div>
              <p className={styles.privateFlag}>خاص — لا تورّي أحد</p>
              <h3>{previewQuestion?.prompt.ar ?? "وين كنت وقت انقطعت الكهرباء؟"}</h3>
              <div className={styles.options}>
                {(previewQuestion?.options ?? []).slice(0, 3).map((option, index) => (
                  <span key={option.id} className={index === 1 ? styles.selected : undefined}>
                    {option.label.ar}
                  </span>
                ))}
              </div>
              <span className={styles.confirm}>ثبّت الإجابة</span>
            </article>

            <article className={`${styles.phone} ${styles.result}`} aria-label="مثال نتيجة على الجوال">
              <div className={styles.phoneTop}>
                <span>دليل خاص</span>
                <bdi>23:48</bdi>
              </div>
              <p className={styles.privateFlag}>ظهر لك أنت فقط</p>
              <h3>{previewEvidence?.title.ar ?? "جهازك هو اللي اتصل"}</h3>
              <p>{previewEvidence?.detail.ar}</p>
              <div className={styles.thread} aria-hidden />
              <strong>الحين اختبر روايتكم بدون ما تكشف الدليل.</strong>
            </article>
          </div>
        </div>
      </section>

      {summary && (
        <section className={styles.caseSection} aria-labelledby="home-case-title">
          <div className={styles.container}>
            <div className={styles.caseCard}>
              <div>
                <p className={styles.label}>القضية المتاحة الآن</p>
                <h2 id="home-case-title">{summary.title.ar}</h2>
                <p>{summary.pitch.ar}</p>
              </div>
              <dl>
                <div>
                  <dt>اللاعبون</dt>
                  <dd>{summary.playerCounts[0]}–{summary.playerCounts.at(-1)}</dd>
                </div>
                <div>
                  <dt>المدة</dt>
                  <dd>{summary.durationMinutes[0]}–{summary.durationMinutes[1]} دقيقة</dd>
                </div>
                <div>
                  <dt>التعقيد</dt>
                  <dd>{summary.complexity.ar}</dd>
                </div>
              </dl>
              <Link href="/cases">شوفوا ملف القضية</Link>
            </div>
          </div>
        </section>
      )}

      <section className={styles.finalCta} aria-labelledby="home-cta-title">
        <div className={styles.container}>
          <p className={styles.label}>كل واحد يحتاج جواله فقط</p>
          <h2 id="home-cta-title">جاهزين تثبّتون روايتكم؟</h2>
          <p>افتحوا غرفة، شاركوا الرمز، وابدؤوا لما يجتمع ٤ إلى ٦ لاعبين.</p>
          <div className={styles.actions}>
            <Link href="/create">ابدأ جلسة</Link>
            <Link href="/join">ادخل برمز</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
