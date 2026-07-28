"use client";

import { useState } from "react";

/** Interrogation ticker — synthetic redacted phrases. Pauses on hover/focus and
 * for reduced motion (handled in CSS). All examples are fictional. */
const ITEMS = [
  { ts: "23:46", text: "«كنت في غرفة الاجتماعات» — لاعب أ" },
  { ts: "TAG", text: "تناقض: سائقان مختلفان" },
  { ts: "23:48", text: "جهاز اتصل بشبكة المستودع" },
  { ts: "PATCH", text: "«دخل عشان شاحن فقط»" },
  { ts: "00:01", text: "سيارة تغادر المواقف" },
  { ts: "DENY", text: "«كنت لحالي» — لاعب ب" },
];

export function Ticker() {
  const [paused, setPaused] = useState(false);

  return (
    <div className={`ticker ${paused ? "is-paused" : ""}`} aria-label="أمثلة مختصرة من التحقيق">
      <button
        className="ticker__control"
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? "شغّل الشريط" : "أوقف الشريط"}
      </button>
      <div className="ticker__track" aria-live={paused ? "polite" : "off"}>
        {ITEMS.map((it) => (
          <span className="ticker__item" key={`${it.ts}-${it.text}`}>
            <span className="ts">{it.ts}</span> — {it.text}
          </span>
        ))}
        <span className="ticker__duplicate" aria-hidden>
          {ITEMS.map((it) => (
            <span className="ticker__item" key={`duplicate-${it.ts}-${it.text}`}>
              <span className="ts">{it.ts}</span> — {it.text}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
