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

export default function CasesPage() {
  const firstCase = publicCaseSummaries()[0];

  return (
    <>
      <SiteNav />
      <main id="main" className="cases-page">
        <header className="page-hero page-hero--cases">
          <div className="container case-hero">
            <div>
              <p className="section-label">فهرس القضايا</p>
              <h1>
                قضية واحدة جاهزة.
                <br />
                والباقي ما زال كتابة.
              </h1>
            </div>
            <div className="case-hero__proof" aria-label="لمحة عامة من القضية المتاحة">
              <div>
                <span className="availability"><span aria-hidden />متاحة الآن</span>
                <bdi className="mono">CASE / 001</bdi>
              </div>
              <strong>ظرف الرواتب المفقود</strong>
              <ol>
                <li><bdi className="mono">23:46</bdi><span>انقطعت الكهرباء</span></li>
                <li><bdi className="mono">23:48</bdi><span>ظهر اتصال في المستودع</span></li>
                <li><bdi className="mono">00:01</bdi><span>غادرت سيارة المواقف</span></li>
              </ol>
            </div>
          </div>
        </header>

        {firstCase && (
          <section className="case-primary" aria-labelledby="primary-case-title">
            <div className="container case-primary__grid">
              <div className="case-primary__number">
                <span className="mono">001</span>
                <span className="availability">
                  <span aria-hidden />
                  قابلة للعب
                </span>
              </div>
              <div className="case-primary__copy">
                <h2 id="primary-case-title">{firstCase.title.ar}</h2>
                <p>{firstCase.pitch.ar}</p>
                <dl>
                  <div>
                    <dt>اللاعبون</dt>
                    <dd className="mono">
                      {firstCase.playerCounts[0]}–{firstCase.playerCounts.at(-1)}
                    </dd>
                  </div>
                  <div>
                    <dt>المدة</dt>
                    <dd className="mono">
                      {firstCase.durationMinutes[0]}–{firstCase.durationMinutes[1]} دقيقة
                    </dd>
                  </div>
                  <div>
                    <dt>التعقيد</dt>
                    <dd>{firstCase.complexity.ar}</dd>
                  </div>
                </dl>
                <Link className="btn btn--primary" href="/create">
                  العبوا هذه القضية
                </Link>
              </div>
              <div className="case-primary__timeline" aria-label="الخط الزمني العام للقضية">
                <span className="mono">23:46</span>
                <p>انقطاع الكهرباء</p>
                <span className="mono">23:48</span>
                <p>اتصال شبكة المستودع</p>
                <span className="mono">00:01</span>
                <p>مغادرة سيارة</p>
              </div>
            </div>
          </section>
        )}

        <section className="case-index" aria-labelledby="case-boundary-title">
          <div className="container">
            <header>
              <p className="section-label">نسخة المراجعة</p>
              <h2 id="case-boundary-title">قضية مكتملة، من البداية إلى التقرير.</h2>
            </header>
            <p className="case-index__note">
              ما نعرض أسماء أو مواعيد لقضايا غير جاهزة. النسخة الحالية تركّز على جودة قضية
              «ظرف الرواتب المفقود» وتدفقها الكامل لأربع أو خمس أو ستة لاعبين.
            </p>
            <Link className="btn btn--primary" href="/create">ابدأوا القضية المتاحة</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
