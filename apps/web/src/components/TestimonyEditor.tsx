"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";

const DEFAULT_REVISION = 72;

/**
 * A synthetic, public-safe explanation of the core mechanic.
 * It compares authored versions; it does not expose or imply live private answers.
 */
export function TestimonyEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLOutputElement>(null);
  const frameRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRevisionRef = useRef(DEFAULT_REVISION);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  const applyRevision = (value: number) => {
    const revision = Math.min(100, Math.max(0, Math.round(value)));
    editorRef.current?.style.setProperty("--revision-ratio", String(revision / 100));
    if (rangeRef.current) {
      rangeRef.current.value = String(revision);
      rangeRef.current.setAttribute("aria-valuetext", revision < 50 ? "قبل التعديل" : "بعد التعديل");
    }
    if (outputRef.current) outputRef.current.textContent = revision < 50 ? "قبل" : "بعد";
  };

  const scheduleRevision = (value: number) => {
    pendingRevisionRef.current = value;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      applyRevision(pendingRevisionRef.current);
      frameRef.current = null;
    });
  };

  const scrubRevision = (event: PointerEvent<HTMLLabelElement>) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const physicalProgress = (event.clientX - rect.left) / rect.width;
    const rtlProgress = 1 - Math.min(1, Math.max(0, physicalProgress));
    scheduleRevision(rtlProgress * 100);
  };

  const settleRevision = () => {
    const editor = editorRef.current;
    editor?.classList.add("is-settling");
    applyRevision(DEFAULT_REVISION);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => editor?.classList.remove("is-settling"), 320);
  };

  return (
    <div
      ref={editorRef}
      className="testimony-editor"
      style={{ "--revision-ratio": DEFAULT_REVISION / 100 } as CSSProperties}
    >
      <header className="testimony-editor__bar">
        <span>مقارنة نسختين من الرواية</span>
        <span className="mono">REV. 06 / 19</span>
      </header>

      <div className="testimony-editor__workspace">
        <ol className="testimony-editor__gutter" aria-label="تسلسل التغيير">
          <li><span className="mono">01</span><b>الرواية</b></li>
          <li><span className="mono">02</span><b>الإفادة</b></li>
          <li className="is-active"><span className="mono">03</span><b>الدليل</b></li>
        </ol>

        <div className="testimony-editor__statement">
          <p className="testimony-editor__meta">
            <span>نموذج توضيحي · بيانات مؤلفة</span>
            <span className="mono">23:48</span>
          </p>
          <p className="testimony-editor__sentence">
            كنا في المجلس عندما{" "}
            <del>انطفأت الأنوار</del>
            <ins>وصلت رسالة المستودع</ins>.
          </p>
          <div className="testimony-editor__reason">
            <span>سبب التغيير</span>
            <strong>سجل الشبكة وضع جهازًا في المستودع في اللحظة نفسها.</strong>
          </div>
        </div>
      </div>

      <div className="testimony-editor__activity" aria-label="حالة مراجعة الرواية">
        <span><i aria-hidden /> نورة · ثبّتت نسختها</span>
        <span><i aria-hidden /> راكان · يراجع</span>
        <span><i aria-hidden /> ليان · بانتظار دورها</span>
      </div>

      <label
        className="testimony-editor__scrubber"
        onPointerMove={scrubRevision}
        onPointerLeave={settleRevision}
      >
        <span>اسحب للمقارنة</span>
        <input
          ref={rangeRef}
          aria-label="قارن النسخة الأصلية بالنسخة المعدلة"
          aria-valuetext="بعد التعديل"
          type="range"
          min="0"
          max="100"
          defaultValue={DEFAULT_REVISION}
          onChange={(event) => applyRevision(Number(event.target.value))}
        />
        <output ref={outputRef} className="mono">بعد</output>
      </label>
    </div>
  );
}
