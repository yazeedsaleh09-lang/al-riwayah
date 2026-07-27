/** Central site constants + brand copy (Arabic-first). No fabricated metrics. */

export const SITE = {
  name: "الرواية",
  nameLatin: "AL RIWAYAH",
  descriptor: "اتفقوا على كذبة. لا تخربونها.",
  descriptorLatin: "Keep the story straight.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://al-riwayah.example",
  locale: "ar_SA",
  themeColor: "#050505",
  description:
    "الرواية لعبة جماعية على الجوالات. اتفقوا على رواية واحدة، وانفصلوا للتحقيق. المحقق يكفيه تناقض واحد.",
} as const;

export const NAV_LINKS = [
  { href: "/how-to-play", label: "كيف تُلعب" },
  { href: "/cases", label: "القضايا" },
  { href: "/create", label: "أنشئ غرفة" },
] as const;

/** Server origin for the realtime game (client-side). */
export function serverUrl(): string {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __SERVER_URL__?: string }).__SERVER_URL__;
    if (injected) return injected;
  }
  return process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";
}
