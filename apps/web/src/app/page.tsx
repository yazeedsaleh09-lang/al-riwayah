import { ApprovedHome } from "@/components/ApprovedHome";
import { SITE } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Game",
  name: SITE.name,
  alternateName: SITE.nameLatin,
  description: SITE.description,
  inLanguage: "ar",
  numberOfPlayers: { "@type": "QuantitativeValue", minValue: 4, maxValue: 6 },
  gamePlatform: "Web (mobile browser)",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ApprovedHome />
    </>
  );
}
