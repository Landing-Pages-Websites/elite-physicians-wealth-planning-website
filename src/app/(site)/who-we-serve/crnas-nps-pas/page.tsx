import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/who-we-serve/crnas-nps-pas";

export const metadata: Metadata = {
  title: "Financial Planning for CRNAs, NPs & PAs — Elite Physicians Wealth Planning™",
  description: "Financial planning for CRNAs, nurse practitioners, and physician assistants building long-term wealth with rising income and benefits decisions.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/who-we-serve", label: "Who we serve" }, { href: "/who-we-serve/crnas-nps-pas", label: "CRNAs, NPs & PAs" }]} />;
}
