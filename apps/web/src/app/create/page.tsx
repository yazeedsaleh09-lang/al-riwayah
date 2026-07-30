import type { Metadata } from "next";
import { CreateForm } from "@/components/CreateForm";

export const metadata: Metadata = {
  title: "أنشئ غرفة",
  description: "أنشئ غرفة الرواية وشارك الرمز مع الشلة. المنشئ لاعب عادي.",
  alternates: { canonical: "/create" },
};

export default function CreatePage() {
  return <CreateForm />;
}
