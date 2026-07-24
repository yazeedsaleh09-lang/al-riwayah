import type { Metadata } from "next";
import { RoomShell } from "@/components/game/RoomShell";

export const metadata: Metadata = {
  title: "الغرفة",
  robots: { index: false, follow: false },
};

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomShell code={code.toUpperCase()} />;
}
