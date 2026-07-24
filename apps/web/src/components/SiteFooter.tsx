import Link from "next/link";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "review-build";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <p className="display" style={{ fontSize: "2rem", margin: 0 }}>
              الرواية
            </p>
            <p style={{ color: "var(--muted)", maxWidth: 320 }}>
              اتفقوا على كذبة. لا تخربونها. لعبة جماعية على الجوالات، بدون تلفزيون وبدون تحميل.
            </p>
          </div>
          <nav aria-label="روابط سفلية" className="site-footer__links">
            <Link href="/how-to-play">كيف تُلعب</Link>
            <Link href="/cases">القضايا</Link>
            <Link href="/create">أنشئ غرفة</Link>
            <Link href="/play">ادخل برمز</Link>
            <Link href="/privacy">الخصوصية</Link>
            <Link href="/terms">الشروط</Link>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <span className="mono" style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            نسخة: {BUILD}
          </span>
          <a href="#top" className="mono" style={{ fontSize: "0.8rem" }}>
            ↑ للأعلى
          </a>
        </div>
      </div>
    </footer>
  );
}
