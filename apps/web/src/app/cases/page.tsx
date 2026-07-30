import type { Metadata } from "next";
import Link from "next/link";
import { publicCaseSummaries } from "@al-riwayah/content";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { SimpleCard, SimplePageHero } from "@/components/SimpleUI";

export const metadata: Metadata = {
  title: "القضايا",
  description: "القضية القابلة للعب الآن في الرواية.",
  alternates: { canonical: "/cases" },
};

export default function CasesPage() {
  const gameCase = publicCaseSummaries()[0];
  return (
    <>
      <SiteNav />
      <main id="main" className="simple-page">
        <SimplePageHero
          label="القضية المتاحة"
          title="قضية واحدة. جلسة كاملة."
          copy="هذه هي القضية الحقيقية القابلة للعب الآن، من التخطيط إلى التقرير النهائي."
          action={false}
        />
        <section className="simple-section">
          <div className="simple-container">
            {gameCase ? (
              <SimpleCard>
                <p className="simple-label">متاحة الآن</p>
                <h2>{gameCase.title.ar}</h2>
                <p>{gameCase.pitch.ar}</p>
                <dl className="simple-grid">
                  <div><dt>اللاعبون</dt><dd>{gameCase.playerCounts[0]}–{gameCase.playerCounts.at(-1)}</dd></div>
                  <div><dt>المدة</dt><dd>{gameCase.durationMinutes[0]}–{gameCase.durationMinutes[1]} دقيقة</dd></div>
                  <div><dt>الصعوبة</dt><dd>{gameCase.complexity.ar}</dd></div>
                </dl>
                <Link className="simple-button simple-button--primary" href="/create">ابدأ هذه القضية</Link>
              </SimpleCard>
            ) : null}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
