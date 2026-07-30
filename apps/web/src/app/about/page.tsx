import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { ActionGroup, SectionHeader, SimpleCard, SimplePageHero } from "@/components/SimpleUI";

export const metadata: Metadata = {
  title: "عن الرواية",
  description: "لعبة جماعية عربية على الجوالات لأربعة إلى ستة لاعبين.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="simple-page">
        <SimplePageHero
          label="عن اللعبة"
          title="الرواية تجمع الشلة حول قصة واحدة."
          copy="تتفقون على اللي صار، ثم تختبر الأسئلة الخاصة مدى تماسك التفاصيل."
          action={false}
        />
        <section className="simple-section">
          <div className="simple-container">
            <div className="simple-grid">
              <SimpleCard><h3>جوالات فقط</h3><p>كل لاعب يستخدم جواله. ما تحتاجون تلفزيون.</p></SimpleCard>
              <SimpleCard><h3>بدون حساب</h3><p>اكتب اسمك وادخل الرمز. ما فيه تسجيل.</p></SimpleCard>
              <SimpleCard><h3>٤–٦ لاعبين</h3><p>جلسة قصيرة للشلة في المكان نفسه.</p></SimpleCard>
            </div>
          </div>
        </section>
        <section className="simple-section simple-section--alternate">
          <div className="simple-container">
            <SectionHeader
              label="الخصوصية"
              title="شاشتك لك."
              copy="الأسئلة والأدلة الخاصة تظهر لصاحب الجوال فقط، ولا تنعرض في حالة الغرفة العامة."
            />
            <ActionGroup />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
