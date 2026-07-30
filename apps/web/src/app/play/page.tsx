import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayForm } from "@/components/PlayForm";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "ادخل برمز",
  description: "ادخل غرفة الرواية برمز الغرفة واسمك.",
  alternates: { canonical: "/join" },
};

export default function PlayPage() {
  return (
    <>
      <SiteNav />
      <Suspense fallback={<main className="form-shell">…</main>}>
        <PlayForm />
      </Suspense>
    </>
  );
}
