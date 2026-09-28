import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/meet-michael-epps";

export const metadata: Metadata = {
  title: "Meet Michael A. Epps, ChFC®, RICP®",
  description: "Michael A. Epps, ChFC®, RICP®, Founder &amp; Chief Wealth Strategist of Fiscal Vision Financial, founded Elite Physicians Wealth Planning™ for physicians and medical professionals.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/meet-michael-epps", label: "Michael A. Epps" }]} />;
}
