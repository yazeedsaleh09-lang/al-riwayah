import Link from "next/link";

export function Wordmark({ size = 1 }: { size?: number }) {
  return (
    <Link
      href="/"
      aria-label="الرواية — الصفحة الرئيسية"
      className="wordmark"
      style={{ "--mark-size": size } as React.CSSProperties}
    >
      <svg aria-hidden viewBox="0 0 24 32" className="wordmark__mark">
        <path d="M2 2h20v8L13 16l9 6v8H2v-8l9-6-9-6V2Z" fill="currentColor" />
        <path d="m7 7 10 18" stroke="var(--black)" strokeWidth="2.25" />
      </svg>
      <span className="wordmark__name">الرواية</span>
    </Link>
  );
}
