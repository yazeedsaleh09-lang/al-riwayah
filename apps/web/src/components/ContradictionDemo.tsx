"use client";

import { useState } from "react";

/** Interactive before/after: shows exactly why the engine flags a conflict. */
export function ContradictionDemo() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="demo">
      <div className="demo__statements">
        <div className={`statement ${revealed ? "is-flagged" : ""}`}>
          <p className="who">لاعب أ</p>
          <p style={{ margin: 0 }}>«كنت مع لاعب ب في المستودع وقت الانقطاع.»</p>
        </div>
        <div className={`statement ${revealed ? "is-flagged" : ""}`}>
          <p className="who">لاعب ب</p>
          <p style={{ margin: 0 }}>«كنت لحالي في المواقف، ما كان معي أحد.»</p>
        </div>
      </div>

      {revealed && (
        <p className="demo__rule" role="status">
          القاعدة: لا يمكن أن يكون لاعب أ مع لاعب ب في المستودع، بينما لاعب ب كان لحاله في المواقف —
          في نفس اللحظة. تناقض «إنكار شاهد».
        </p>
      )}

      <button
        className="btn btn--evidence"
        onClick={() => setRevealed((v) => !v)}
        aria-pressed={revealed}
      >
        {revealed ? "أخفِ التحليل" : "أظهر سبب التناقض"}
      </button>
    </div>
  );
}
