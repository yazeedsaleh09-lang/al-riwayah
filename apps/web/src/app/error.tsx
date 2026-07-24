"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="form-shell" id="main">
      <div className="form-card" style={{ textAlign: "center" }}>
        <p className="stamp">خطأ</p>
        <h1 style={{ marginTop: "var(--space-6)" }}>صار خلل غير متوقع</h1>
        <p style={{ color: "var(--muted)" }}>جرّب تعيد المحاولة، ولو استمر رجّع للصفحة الرئيسية.</p>
        <div className="hero__actions" style={{ justifyContent: "center", marginTop: "var(--space-6)" }}>
          <button className="btn btn--evidence" onClick={reset}>أعد المحاولة</button>
          <Link className="btn btn--ghost" href="/">الرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
