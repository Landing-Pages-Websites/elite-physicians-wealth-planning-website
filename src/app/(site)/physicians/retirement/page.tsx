import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/retirement";

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: { absolute: "Physicians Approaching Retirement: Income and Tax Planning" },
  description:
    "Physicians approaching retirement can align income, taxes, Medicare, healthcare costs, and legacy goals in one coordinated plan. Schedule a strategy call.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/retirement", label: "Approaching retirement" }]} />;
}
