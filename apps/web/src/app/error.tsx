"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="simple-page simple-state-shell" id="main">
      <section className="simple-card simple-state-card">
        <p className="simple-label">خطأ</p>
        <h1>صار خلل غير متوقع.</h1>
        <p>جرّب تعيد المحاولة، ولو استمر ارجع للصفحة الرئيسية.</p>
        <div className="simple-actions">
          <button className="simple-button simple-button--primary" onClick={reset}>أعد المحاولة</button>
          <Link className="simple-button simple-button--secondary" href="/">الرئيسية</Link>
        </div>
      </section>
    </main>
  );
}
