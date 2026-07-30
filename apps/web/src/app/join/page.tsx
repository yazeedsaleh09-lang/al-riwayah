import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayForm } from "@/components/PlayForm";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "ادخل الغرفة",
  description: "ادخل غرفة الرواية برمز قصير واسمك فقط، بدون حساب.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return (
    <>
      <SiteNav />
      <Suspense fallback={<main className="form-shell">لحظة…</main>}>
        <PlayForm />
      </Suspense>
    </>
  );
}
