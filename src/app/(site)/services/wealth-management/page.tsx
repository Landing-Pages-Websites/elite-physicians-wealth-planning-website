import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/services/wealth-management";

export const metadata: Metadata = {
  title: "Wealth Management for Physicians — Elite Physicians Wealth Planning™",
  description: "Portfolio design for physicians that reflects taxes, risk tolerance, time horizon, cash-flow needs, retirement income goals, and concentration risk.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/services", label: "Services" }, { href: "/services/wealth-management", label: "Wealth management" }]} />;
}
