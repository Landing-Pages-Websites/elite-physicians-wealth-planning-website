import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/services/retirement-planning";

export const metadata: Metadata = {
  title: "Retirement Planning for Physicians — Elite Physicians Wealth Planning™",
  description: "Turning employer plans, IRAs, brokerage accounts, practice interests, and pensions into a retirement income strategy that accounts for taxes, healthcare, and legacy goals.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/services", label: "Services" }, { href: "/services/retirement-planning", label: "Retirement planning" }]} />;
}
