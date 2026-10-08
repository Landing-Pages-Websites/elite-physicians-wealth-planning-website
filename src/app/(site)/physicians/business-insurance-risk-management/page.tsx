import type { Metadata } from "next";
import { PracticePage, practiceMetadata } from "@/components/pages/practice-page";

const ROUTE = "/physicians/business-insurance-risk-management";

export const metadata: Metadata = practiceMetadata(ROUTE);

export default function Page(): React.JSX.Element {
  return <PracticePage route={ROUTE} />;
}
