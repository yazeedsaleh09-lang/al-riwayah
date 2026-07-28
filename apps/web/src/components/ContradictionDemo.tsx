"use client";

import { useEffect, useRef, useState } from "react";

/** Interactive before/after: shows exactly why the engine flags a conflict. */
export function ContradictionDemo() {
  const [revealed, setRevealed] = useState(false);
  const [tracing, setTracing] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const trailRef = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const position = (event: React.PointerEvent<HTMLDivElement>, restart = false) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    const sx = (x / rect.width) * 1000;
    const sy = (y / rect.height) * 520;
    surface.style.setProperty("--reveal-x", `${x}px`);
    surface.style.setProperty("--reveal-y", `${y}px`);
    trailRef.current = restart || !trailRef.current ? `M${sx} ${sy}` : `${trailRef.current} L${sx} ${sy}`;
    pathRef.current?.setAttribute("d", trailRef.current);
    setTracing(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTracing(false);
      trailRef.current = "";
      pathRef.current?.setAttribute("d", "");
    }, 900);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    position(event, true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    position(event);
  };

  return (
    <div className="demo">
      <div className="demo__heading">
        <div>
          <span>الطبقة أ</span>
          <strong>وش قلتوا</strong>
        </div>
        <div>
          <span>الطبقة ب</span>
          <strong>وش أثبته الدليل</strong>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className={`reveal-surface ${tracing ? "is-tracing" : ""} ${revealed ? "is-revealed" : ""}`}
        onPointerDown={onPointerDown}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") position(event, true);
        }}
        onPointerMove={onPointerMove}
      >
        <div className="reveal-layer reveal-layer--statement">
          <span className="mono">23:48 / شهادة أ</span>
          <blockquote>«كنت مع لاعب ب في المستودع وقت الانقطاع.»</blockquote>
          <div className="testimony-line" aria-hidden />
          <span className="mono">23:48 / شهادة ب</span>
          <blockquote>«كنت لحالي في المواقف، ما كان معي أحد.»</blockquote>
        </div>
        <div className="reveal-layer reveal-layer--evidence" aria-hidden>
          <span className="mono">23:48 / نقطة الاتصال</span>
          <blockquote>جهاز لاعب أ اتصل بشبكة المستودع.</blockquote>
          <div className="testimony-line" aria-hidden />
          <span className="mono">23:48 / شهادة ب</span>
          <blockquote>لاعب ب ينكر وجود أي شخص معه.</blockquote>
        </div>
        <svg className="reveal-trail" aria-hidden viewBox="0 0 1000 520" preserveAspectRatio="none">
          <path ref={pathRef} />
        </svg>
        <p className="reveal-instruction">حرّك المؤشر، أو اسحب بإصبعك، لكشف التعارض</p>
      </div>

      <p className={`demo__rule ${revealed || tracing ? "is-visible" : ""}`} role="status">
        القاعدة: لا يمكن أن يكون لاعب أ مع لاعب ب في المستودع، بينما لاعب ب كان لحاله في المواقف —
        في نفس اللحظة. تناقض «إنكار شاهد».
      </p>

      <button
        className="btn btn--ghost"
        onClick={() => setRevealed((v) => !v)}
        aria-pressed={revealed}
      >
        {revealed ? "أخفِ التحليل" : "أظهر سبب التناقض"}
      </button>
    </div>
  );
}
