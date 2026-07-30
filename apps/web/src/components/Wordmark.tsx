import Link from "next/link";

export function Wordmark({
  size = 1,
  href = "/",
}: {
  size?: number;
  href?: "/" | null;
}) {
  const content = (
    <>
      <span className="wordmark__name">الرواية</span>
      <span className="wordmark__mark" aria-hidden="true">
        ر
      </span>
    </>
  );
  const style = { "--mark-size": size } as React.CSSProperties;

  if (href === null) {
    return (
      <span aria-label="الرواية" className="wordmark" style={style}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="الرواية — الصفحة الرئيسية"
      className="wordmark"
      style={style}
    >
      {content}
    </Link>
  );
}
