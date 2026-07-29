import type { Metadata, Viewport } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import "./marketing.css";
import { SITE } from "@/lib/site";
import { HydrationMarker } from "@/components/HydrationMarker";

const arabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});

const display = Alexandria({
  weight: ["500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-display-arabic",
  display: "swap",
});

const approvedArabic = Noto_Sans_Arabic({
  weight: ["400", "700", "800", "900"],
  subsets: ["arabic", "latin"],
  variable: "--font-approved-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.descriptor}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.nameLatin,
  keywords: ["الرواية", "لعبة جماعية", "تحقيق", "جوال", "party game", "Arabic"],
  authors: [{ name: SITE.nameLatin }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.descriptor}`,
    description: SITE.description,
    url: SITE.url,
    images: [{ url: "/social-preview.png", width: 1200, height: 630, alt: "الرواية — لعبة تحقيق اجتماعية" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.descriptor}`,
    description: SITE.description,
    images: ["/social-preview.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body className={`${arabic.variable} ${display.variable} ${approvedArabic.variable}`}>
        <HydrationMarker />
        <a href="#main" className="skip-link">
          تجاوز إلى المحتوى
        </a>
        {children}
      </body>
    </html>
  );
}
