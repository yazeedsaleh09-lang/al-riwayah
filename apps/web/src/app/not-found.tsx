import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { ActionGroup, SimplePageHero } from "@/components/SimpleUI";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="simple-page">
        <SimplePageHero
          label="٤٠٤"
          title="الصفحة اختفت."
          copy="ما لقينا هالصفحة. تقدر ترجع تنشئ غرفة أو تدخل برمز."
          action={false}
        />
        <section className="simple-section simple-state-section">
          <div className="simple-container"><ActionGroup /></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
