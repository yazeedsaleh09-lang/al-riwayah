import Link from "next/link";
import { SiteNav } from "./SiteNav";
import styles from "./ApprovedHome.module.css";

function classes(...names: Array<string | undefined>) {
  return names.filter(Boolean).join(" ");
}

export function ApprovedHome() {
  return (
    <div className={classes("approved-home-source", styles.page)}>
      <SiteNav />

      <main className={styles.hero} id="main">
        <section className={styles.copy}>
          <div className={classes("reveal", styles.eyebrow, styles.reveal)}>
            لعبة جماعية لـ٤–٦ أشخاص
          </div>
          <h1
            className={classes("reveal", styles.reveal)}
            aria-label="اتفقوا على الرواية. ولا تختلفون."
          >
            <span data-hero-line="1" aria-hidden="true">اتفقوا على</span>
            <span data-hero-line="2" aria-hidden="true">
              <span>الرواية. </span>
              <em>ولا</em>
            </span>
            <span data-hero-line="3" aria-hidden="true">
              <em>تختلفون.</em>
            </span>
          </h1>
          <p className={classes("reveal", styles.lede, styles.reveal)}>
            بنك الساحة انسرق، وسيارتكم انوقفت قريب. ابنوا رواية وحدة وخلوها تصمد قدام الأسئلة والأدلة.
          </p>
          <div className={classes("reveal", styles.actions, styles.reveal)}>
            <Link className={classes(styles.btn, styles.primary)} href="/create">
              ابدأ جلسة
            </Link>
            <Link className={styles.btn} href="/join">
              ادخل برمز
            </Link>
          </div>
          <div
            className={classes("reveal", styles.proof, styles.reveal)}
            aria-label="معلومات الجلسة"
          >
            <span>جوالات فقط</span>
            <span>١٠–١٥ دقيقة</span>
            <span>بدون تحميل</span>
          </div>
        </section>

        <section
          className={classes("scene-wrap", styles.sceneWrap)}
          aria-label="لقطة من قضية بنك الساحة وتناقض مكان سعود"
        >
          <div className={styles.scene}>
            <div className={styles.news}>
              <div className={styles.masthead}>
                <b>THE STATEMENT</b>
                <span>قضية بنك الساحة · آخر تحديث 11:44</span>
              </div>
              <div className={styles.columnTitle}>
                SIX STORIES.
                <br />
                ONE DETAIL
                <br />
                DOESN’T FIT.
              </div>
            </div>

            <div className={classes(styles.tape, styles.tapeA)} aria-hidden="true" />

            <svg
              className={classes("threads", styles.threads)}
              viewBox="0 0 800 700"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M390 255 C350 310 240 360 175 505" />
              <path d="M430 270 C530 330 620 430 660 535" />
              <path d="M175 505 C330 570 500 575 660 535" />
              <circle className={styles.pin} cx="390" cy="255" r="7" />
              <circle className={styles.pin} cx="175" cy="505" r="7" />
              <circle className={styles.pin} cx="660" cy="535" r="7" />
            </svg>

            <div
              className={classes(
                "layer",
                "layer-sticky",
                styles.layer,
                styles.layerSticky,
              )}
            >
              <div className={classes("sticky", styles.sticky)}>
                سجل السيارة قال
                <br />
                إن باب السائق
                <br />
                تقفل بعد بداية
                <br />
                الإنذار بـ١٨ ثانية.
              </div>
            </div>

            <div
              className={classes(
                "layer",
                "layer-photo",
                styles.layer,
                styles.layerPhoto,
              )}
            >
              <div
                className={classes("photo", styles.photo)}
                role="img"
                aria-label="الحارس · 11:48"
              />
            </div>

            <div
              className={classes(
                "layer",
                "layer-shared",
                styles.layer,
                styles.layerShared,
              )}
            >
              <article className={classes("shared", styles.card, styles.shared)}>
                <small>
                  <span>الرواية المشتركة</span>
                  <span className="mono">11:45</span>
                </small>
                <strong>
                  «سعود كان عند السيارة
                  <br />
                  وقت اشتغل الإنذار.»
                </strong>
                <p>الشبهة الأولية: ٢٤٪ بسبب قرب السيارة.</p>
              </article>
            </div>

            <div
              className={classes(
                "layer",
                "layer-one",
                styles.layer,
                styles.layerOne,
              )}
            >
              <article className={classes("one", styles.card, styles.one)}>
                <small>
                  <span>إجابة يزيد</span>
                  <span className="mono">11:46</span>
                </small>
                <strong>
                  «شفت سعود داخل المقهى
                  <br />
                  وقت بدأ الإنذار.»
                </strong>
                <p>المكان: المقهى · الوقت: 11:42</p>
              </article>
            </div>

            <div
              className={classes(
                "layer",
                "layer-two",
                styles.layer,
                styles.layerTwo,
              )}
            >
              <article className={classes("two", styles.card, styles.two)}>
                <small>
                  <span>إجابة سعود</span>
                  <span className="mono">11:46</span>
                </small>
                <strong>
                  «كنت عند السيارة
                  <br />
                  أول ما اشتغل الإنذار.»
                </strong>
                <p>المكان: المواقف · الوقت: 11:42</p>
              </article>
            </div>
          </div>
          <div className={styles.hint}>حرّك المؤشر — الشهادات تتحرك بطبقات مختلفة</div>
        </section>
      </main>
    </div>
  );
}
