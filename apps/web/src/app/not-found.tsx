import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="container section reading" style={{ textAlign: "center" }}>
        <p className="stamp">٤٠٤</p>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem,9vw,4.5rem)", marginTop: "var(--space-6)" }}>
          الصفحة اختفت
        </h1>
        <p style={{ color: "var(--muted)" }}>ما لقينا هالصفحة. تقدر ترجع تنشئ غرفة أو تدخل برمز.</p>
        <div className="hero__actions" style={{ justifyContent: "center", marginTop: "var(--space-6)" }}>
          <Link className="btn btn--evidence" href="/create">أنشئ غرفة</Link>
          <Link className="btn btn--ghost" href="/play">ادخل برمز</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
