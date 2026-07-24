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
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="ticker" aria-label="أمثلة من التحقيق" role="marquee">
      <div className="ticker__track">
        {doubled.map((it, i) => (
          <span className="ticker__item" key={i}>
            <span className="ts">{it.ts}</span> — {it.text}
          </span>
        ))}
      </div>
    </div>
  );
}
