"use client";

import { useEffect, useRef, useState } from "react";

const STAGES = [
  {
    title: "اتفقوا",
    description: "اختاروا سبب وجودكم، أماكنكم، وأدواركم قبل ما تختفي الرواية.",
    phase: "التخطيط",
  },
  {
    title: "انفصلوا",
    description: "كل لاعب يأخذ دليله الخاص. الشاشة لك وحدك.",
    phase: "دليل خاص",
  },
  {
    title: "جاوبوا",
    description: "سؤال واحد واضح، وخيارات كبيرة تحت الإبهام.",
    phase: "تحقيق فردي",
  },
  {
    title: "انقفطوا",
    description: "شهادتان، علاقة واحدة، وسبب مكتوب للتناقض.",
    phase: "كشف التناقض",
  },
  {
    title: "رقّعوا",
    description: "اختاروا إصلاحًا واعرفوا الالتزام الجديد قبل تثبيته.",
    phase: "ترقيع الرواية",
  },
  {
    title: "واجهوا التقرير",
    description: "التقرير يرتّب التناقض، الترقيعة، والأثر على روايتكم.",
    phase: "النتيجة",
  },
] as const;

function GamePreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rail-preview__body">
        <p className="rail-preview__kicker">سبب وجودكم</p>
        <h3>ليش دخلتوا الشركة بعد الدوام؟</h3>
        <div className="rail-preview__options">
          <span className="is-chosen">تسليم ملف عاجل</span>
          <span>اجتماع متأخر</span>
          <span>استرجاع أغراض</span>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="rail-preview__body">
        <p className="rail-preview__kicker">هذا الدليل عندك لحالك</p>
        <div className="rail-private">
          <span className="mono">23:48</span>
          <h3>جهازك اتصل بشبكة المستودع.</h3>
          <p>لا تورّي شاشتك. قرر متى تكشفه للشلة.</p>
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="rail-preview__body">
        <p className="rail-preview__kicker">ممنوع الكلام</p>
        <h3>وين كنت وقت انطفأت الكهرباء؟</h3>
        <div className="rail-preview__options">
          <span>غرفة الاجتماعات</span>
          <span className="is-chosen">المستودع</span>
          <span>المواقف</span>
        </div>
      </div>
    );
  }

  if (index === 3) {
    return (
      <div className="rail-preview__body rail-preview__body--fracture">
        <p className="rail-preview__kicker">تناقض مسجّل</p>
        <blockquote>«كنت معه في المستودع.»</blockquote>
        <div className="rail-fracture" aria-hidden />
        <blockquote>«كنت لحالي في المواقف.»</blockquote>
        <p className="rail-preview__rule">ما يقدر الجوابان يكونون صحيحين في نفس اللحظة.</p>
      </div>
    );
  }

  if (index === 4) {
    return (
      <div className="rail-preview__body">
        <p className="rail-preview__kicker">الترقيع له ثمن</p>
        <h3>اعترفوا بجزء صغير</h3>
        <p>«دخل المستودع عشان شاحن فقط.»</p>
        <div className="rail-commitment">
          <span>التزام جديد</span>
          <strong>مين طلب الشاحن؟</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="rail-preview__body">
      <p className="rail-preview__kicker">التقرير النهائي</p>
      <p className="rail-verdict">ب</p>
      <h3>الرواية تماسكت. بصعوبة.</h3>
      <div className="rail-score">
        <span style={{ "--score": "78%" } as React.CSSProperties}>التماسك</span>
        <span style={{ "--score": "55%" } as React.CSSProperties}>الثبات</span>
      </div>
    </div>
  );
}

export function GalleryRail({ compact = false }: { compact?: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia("(min-width: 900px)");

    const update = () => {
      frameRef.current = null;
      if (!desktopQuery.matches || motionQuery.matches) {
        root.style.setProperty("--gallery-progress", "0");
        return;
      }

      const rect = root.getBoundingClientRect();
      const travel = Math.max(1, root.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      const next = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length));
      root.style.setProperty("--gallery-progress", progress.toFixed(4));
      setActive((current) => (current === next ? current : next));
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motionQuery.addEventListener("change", schedule);
    desktopQuery.addEventListener("change", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motionQuery.removeEventListener("change", schedule);
      desktopQuery.removeEventListener("change", schedule);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className={`gallery-rail ${compact ? "gallery-rail--compact" : ""}`}
      aria-labelledby={compact ? "home-journey-title" : "guide-journey-title"}
    >
      <div className="gallery-rail__sticky">
        <header className="gallery-rail__intro">
          <p className="section-label">رحلة اللعبة الحقيقية</p>
          <h2 id={compact ? "home-journey-title" : "guide-journey-title"}>
            كل مرحلة تغيّر
            <br />
            معنى اللي قبلها.
          </h2>
          <p>
            <span className="mono">{String(active + 1).padStart(2, "0")}</span>
            <span aria-hidden> / </span>
            <span className="mono">06</span>
          </p>
        </header>

        <div className="gallery-rail__stage">
          {STAGES.map((stage, index) => (
            <article
              className="rail-preview"
              data-active={active === index}
              aria-hidden={active !== index}
              key={stage.title}
            >
              <div className="rail-preview__top">
                <span>{stage.phase}</span>
                <span className="mono">00:{index === 5 ? "00" : 18 - index * 2}</span>
              </div>
              <GamePreview index={index} />
            </article>
          ))}
        </div>

        <ol className="gallery-rail__index">
          {STAGES.map((stage, index) => (
            <li data-active={active === index} key={stage.title}>
              <span className="mono">{String(index + 1).padStart(2, "0")}</span>
              <div className="gallery-rail__mobile-preview" aria-hidden>
                <div className="rail-preview__top">
                  <span>{stage.phase}</span>
                  <span className="mono">00:{index === 5 ? "00" : 18 - index * 2}</span>
                </div>
                <GamePreview index={index} />
              </div>
              <div>
                <strong>{stage.title}</strong>
                <p>{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
