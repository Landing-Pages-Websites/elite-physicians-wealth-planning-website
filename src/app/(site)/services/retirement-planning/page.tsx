import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage, metaTitle } from "@/lib/pages";

const ROUTE = "/services/retirement-planning";

const PAGE = getPage(ROUTE);

const SERVICE_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://elitephysicianswealthplanning.com/services/retirement-planning#service",
  name: "Retirement Planning for Physicians",
  serviceType: "Retirement planning",
  url: "https://elitephysicianswealthplanning.com/services/retirement-planning",
  description:
    "Physicians often accumulate wealth across employer plans, IRAs, brokerage accounts, practice interests, real estate, pensions, and insurance arrangements. The challenge is turning those assets into a retirement income strategy that accounts for taxes, healthcare, inflation, investment risk, family goals, and legacy priorities.",
  provider: {
    "@id": "https://elitephysicianswealthplanning.com/#organization",
  },
  mainEntityOfPage: {
    "@id": "https://elitephysicianswealthplanning.com/services/retirement-planning",
  },
} as const;

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_LD) }}
      />
      <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/services", label: "Services" }, { href: "/services/retirement-planning", label: "Retirement planning" }]} />
    </>
  );
}
