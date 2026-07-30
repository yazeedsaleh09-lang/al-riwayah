import Link from "next/link";
import { Wordmark } from "./Wordmark";

const BUILD =
  process.env.NEXT_PUBLIC_BUILD_ID ??
  process.env.RENDER_GIT_COMMIT?.slice(0, 7) ??
  "local";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <Wordmark />
            <p style={{ color: "var(--muted)", maxWidth: 320 }}>
              اتفقوا على رواية. ولا تختلفون. لعبة جماعية على الجوالات، بدون تلفزيون وبدون تحميل.
            </p>
          </div>
          <nav aria-label="روابط سفلية" className="site-footer__links">
            <Link href="/how-to-play">كيف تلعب</Link>
            <Link href="/cases">القضايا</Link>
            <Link href="/about">عن اللعبة</Link>
            <Link href="/create">ابدأ جلسة</Link>
            <Link href="/play">عندي رمز</Link>
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
