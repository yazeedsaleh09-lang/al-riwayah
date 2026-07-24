import Link from "next/link";

export function Wordmark({ size = 1 }: { size?: number }) {
  return (
    <Link href="/" aria-label="الرواية — الصفحة الرئيسية" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 10 * size,
          height: 28 * size,
          background: "var(--evidence-600)",
          transform: "skewX(-8deg)",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: `${1.35 * size}rem`,
          letterSpacing: "-0.01em",
        }}
      >
        الرواية
      </span>
    </Link>
  );
}
