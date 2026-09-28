import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/about/team";

export const metadata: Metadata = {
  title: "Meet the Team — Elite Physicians Wealth Planning™",
  description: "Elite Physicians Wealth Planning™ is a coordinated team, not a single point of failure. Meet the people behind your plan.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/about", label: "About" }, { href: "/about/team", label: "Meet the team" }]} />;
}
