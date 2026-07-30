import Link from "next/link";

export function Wordmark({
  size = 1,
  variant = "default",
}: {
  size?: number;
  variant?: "default" | "golden";
}) {
  return (
    <Link
      href="/"
      aria-label="الرواية — الصفحة الرئيسية"
      className="wordmark"
      style={{ "--mark-size": size } as React.CSSProperties}
    >
      {variant === "golden" ? (
        <svg aria-hidden viewBox="0 0 38 38" className="wordmark__mark">
          <path className="wordmark__rule" d="M5 5h27v29H5z" />
          <path className="wordmark__revision" d="m12 10 25 2-2 25-25-2z" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 34 34" className="wordmark__mark">
          <path className="wordmark__rule" d="M3 9.5h28M3 24.5h10M22 24.5h9" />
          <path className="wordmark__revision" d="m12 25 10-7" />
          <path className="wordmark__caret" d="M18 5v12" />
        </svg>
      )}
      <span className="wordmark__name">الرواية</span>
    </Link>
  );
}
