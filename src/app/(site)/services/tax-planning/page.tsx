import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/services/tax-planning";

export const metadata: Metadata = {
  title: "Tax Planning for Physicians — Elite Physicians Wealth Planning™",
  description: "Elite Physicians Wealth Planning™ helps physicians evaluate tax planning opportunities before key decisions are made, in coordination with your CPA.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/services", label: "Services" }, { href: "/services/tax-planning", label: "Tax planning" }]} />;
}
