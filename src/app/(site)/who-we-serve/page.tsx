import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/who-we-serve";

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
    />
  );
}
