import type { Metadata } from "next";
import { PracticePage, practiceMetadata } from "@/components/pages/practice-page";

const ROUTE = "/physicians/commercial-lending-sba-financing";

export const metadata: Metadata = practiceMetadata(ROUTE);

export default function Page(): React.JSX.Element {
  return <PracticePage route={ROUTE} />;
}
