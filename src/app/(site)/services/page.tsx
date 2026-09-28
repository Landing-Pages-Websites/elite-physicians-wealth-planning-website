import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/services";

/** Source heading → destination. The copy beside each one is the client's own. */
const HREFS: Readonly<Record<string, string>> = {
  "tax strategy": "/services/tax-planning",
  "retirement strategy": "/services/retirement-planning",
  "wealth management": "/services/wealth-management",
  "practice & business planning": "/services/practice-owner-planning",
  "legacy planning": "/services/legacy-estate-planning",
};

export const metadata: Metadata = {
  title: "Services for Physicians — Elite Physicians Wealth Planning™",
  description: "Elite Physicians Wealth Planning™ is built around five planning pillars: tax strategy, retirement strategy, wealth management, practice planning, and legacy planning.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <FamilyIndexPage
      route={ROUTE}
      label="Services"
      eyebrow="Five planning disciplines"
      hrefs={HREFS}
    />
  );
}
