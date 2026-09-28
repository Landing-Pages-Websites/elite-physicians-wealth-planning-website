import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/physicians";

/** Source heading → destination. The copy beside each one is the client's own. */
const HREFS: Readonly<Record<string, string>> = {
  "residents & fellows": "/physicians/residents-fellows",
  "established physicians": "/physicians/established",
  "practice owners & partners": "/physicians/practice-owners",
  "physicians approaching retirement": "/physicians/retirement",
};

export const metadata: Metadata = {
  title: "Who We Help — Elite Physicians Wealth Planning™",
  description: "Planning for physicians at every career stage: residents and fellows, established physicians, practice owners and partners, and those approaching retirement.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <FamilyIndexPage
      route={ROUTE}
      label="Physicians"
      eyebrow="Planning by career stage"
      hrefs={HREFS}
    />
  );
}
