import type { Metadata } from "next";
import "./variant-b.css";
import OnePlanHero from "@/components/variant-b/one-plan-hero";
import CareerSignal from "@/components/variant-b/career-signal";
import SeparateRooms from "@/components/variant-b/separate-rooms";
import BlueprintRounds from "@/components/variant-b/blueprint-rounds";
import FiveDecisions from "@/components/variant-b/five-decisions";
import WhiteCoatPaths from "@/components/variant-b/white-coat-paths";
import AccountablePlanner from "@/components/variant-b/accountable-planner";
import NextDecision from "@/components/variant-b/next-decision";
import StrategyCall from "@/components/variant-b/strategy-call";

export const metadata: Metadata = {
  alternates: { canonical: "/decision-atlas" },
  // A review surface, not part of the site. Crawlable so the noindex is read.
  robots: { index: false, follow: false },
  title: "The Decision Atlas",
  description:
    "Direction B homepage for Elite Physicians Wealth Planning: a bright clinical decision atlas with Inter-led declarations, navy calibration rails, and small gold decision points.",
};

export default function VariantBPage(): React.JSX.Element {
  return (
    <main id="main" className="bg-white">
      <OnePlanHero />
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
