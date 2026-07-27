import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayForm } from "@/components/PlayForm";

export const metadata: Metadata = {
  title: "ادخل الغرفة",
  description: "ادخل غرفة الرواية برمز قصير واسمك فقط، بدون حساب.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="form-shell">لحظة…</main>}>
      <PlayForm />
    </Suspense>
  );
}
