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
  );
}
