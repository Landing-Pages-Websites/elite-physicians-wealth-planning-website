import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/who-we-serve";

/** Source heading → destination. The copy beside each one is the client's own. */
const HREFS: Readonly<Record<string, string>> = {
  "physicians & specialists": "/who-we-serve/physicians-specialists",
  "surgeons": "/who-we-serve/surgeons",
  "dentists & dental specialists": "/who-we-serve/dentists-dental-specialists",
  "practice owners": "/physicians/practice-owners",
  "crnas, nps & pas": "/who-we-serve/crnas-nps-pas",
  "healthcare executives": "/who-we-serve/healthcare-executives",
};

export const metadata: Metadata = {
  title: "Who We Serve — Elite Physicians Wealth Planning™",
  description: "Elite Physicians Wealth Planning™ serves physicians, surgeons, dentists, practice owners, advanced practice providers, and healthcare executives.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <FamilyIndexPage
      route={ROUTE}
      label="Who we serve"
      eyebrow="Planning profiles"
      hrefs={HREFS}
    />
  );
}
