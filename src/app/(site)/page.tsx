import type { Metadata } from "next";
import { AccountablePlanner } from "@/components/site/accountable-planner";
import { BlueprintRounds } from "@/components/site/blueprint-rounds";
import { CareerSignal } from "@/components/site/career-signal";
import { FiveDecisions } from "@/components/site/five-decisions";
import { NextDecision } from "@/components/site/next-decision";
import { OnePlan } from "@/components/site/one-plan";
import { SeparateRooms } from "@/components/site/separate-rooms";
import { StrategyCall } from "@/components/site/strategy-call";
import { WhiteCoatPaths } from "@/components/site/white-coat-paths";
import "./site.css";

export const metadata: Metadata = {
  // Approved manifest copy; no new claims.
  description:
    "Elite Physicians Wealth Planning helps physicians and medical professionals coordinate tax planning, retirement planning, wealth management, practice planning, and legacy planning into one clear financial strategy.",
  alternates: { canonical: "/" },
};

const LOCAL_BUSINESS_LD = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "FinancialService"],
  "@id": "https://elitephysicianswealthplanning.com/#local-business",
  name: "Elite Physicians Wealth Planning",
  url: "https://elitephysicianswealthplanning.com",
  email: "info@fiscalvisionfinancial.com",
  telephone: "+1-301-259-1636",
  description:
    "Financial planning for physicians and medical practice owners, coordinating tax, retirement, wealth, practice, and legacy decisions into one strategy.",
  areaServed: [
    { "@type": "City", name: "White Plains" },
    { "@type": "State", name: "Maryland" },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "White Plains",
    addressRegion: "MD",
    postalCode: "20695",
    addressCountry: "US",
  },
  parentOrganization: {
    "@id": "https://elitephysicianswealthplanning.com/#organization",
  },
} as const;

/**
 * The approved homepage. Direction A, "The Consult Ledger", promoted to the
 * root on the operator's instruction at the Stage-2 checkpoint — the approval
 * record lives in the client conversation, not in this repo, where the two
 * manifests are byte-identical.
 *
 * The review chooser that used to sit here is gone; /consult-ledger redirects
 * to this route so any link already shared still lands. Direction B stays at
 * /decision-atlas until this one has actually shipped.
 *
 * Section order is the approved `page_flow` and must not be reordered — the
 * gold coordination route crosses the seams in this exact sequence.
 */
export default function HomePage(): React.JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_LD) }}
      />
      <main id="main">
        <OnePlan />
        <CareerSignal />
        <SeparateRooms />
        <BlueprintRounds />
        <FiveDecisions />
        <WhiteCoatPaths />
        <AccountablePlanner />
        <NextDecision />
        <StrategyCall />
      </main>
    </>
  );
}
