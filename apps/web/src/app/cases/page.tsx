import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { publicCaseSummaries } from "@al-riwayah/content";

export const metadata: Metadata = {
  title: "القضايا",
  description: "مكتبة قضايا الرواية. القضية الأولى متاحة الآن.",
  alternates: { canonical: "/cases" },
};

// Honestly labeled future concepts — clearly "in development", never playable.
const IN_DEV = [
  { title: "العقد الموقّع", pitch: "توقيع ظهر على عقد ما حضره أحد." },
  { title: "الوردية الأخيرة", pitch: "اختفت البضاعة بين تسليم ورديتين." },
];

export default function CasesPage() {
  const cases = publicCaseSummaries();
  return (
    <>
      <SiteNav />
      <main id="main">
        <header className="container page-hero">
          <p className="eyebrow">ملفات التحقيق</p>
          <h1 className="display">القضايا.</h1>
          <p className="page-hero__lede">
            كل قضية تختبر نوعًا مختلفًا من الكذب الجماعي. الملف الأول جاهز للمواجهة.
          </p>
        </header>
        <section className="container section">
          <div className="patches">
            {cases.map((c) => (
              <article className="patch-card" key={c.id}>
                <span className="stamp">متاحة الآن</span>
                <h3 style={{ marginTop: "var(--space-4)" }}>{c.title.ar}</h3>
                <p style={{ color: "var(--muted)" }}>{c.pitch.ar}</p>
                <p className="mono" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {c.playerCounts[0]}–{c.playerCounts.at(-1)} لاعبين · {c.durationMinutes[0]}–
                  {c.durationMinutes[1]} دقيقة · {c.complexity.ar}
                </p>
                <Link
                  className="btn btn--evidence"
                  href="/create"
                  style={{ marginTop: "var(--space-3)" }}
                >
                  العب هذه القضية
                </Link>
              </article>
            ))}

            {IN_DEV.map((c) => (
              <article className="patch-card" key={c.title} style={{ opacity: 0.85 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                    border: "1px solid var(--line)",
                    padding: "3px 8px",
                    borderRadius: 3,
                  }}
                >
                  قيد التطوير
                </span>
                <h3 style={{ marginTop: "var(--space-4)" }}>{c.title}</h3>
                <p style={{ color: "var(--muted)" }}>{c.pitch}</p>
                <p className="mono" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  غير متاحة بعد
                </p>
              </article>
            ))}
          </div>

          <p style={{ color: "var(--muted)", marginTop: "var(--space-8)", maxWidth: "58ch" }}>
            الملفات القادمة أفكار قيد التطوير، وليست وعودًا بمواعيد أو محتوى غير جاهز.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
