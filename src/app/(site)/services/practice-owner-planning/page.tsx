import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/services/practice-owner-planning";

export const metadata: Metadata = {
  title: "Practice Owner Planning — Elite Physicians Wealth Planning™",
  description: "Planning for medical and dental practice owners: retirement-plan design, employee benefits, entity structure, buy-sell coordination, succession, and exit planning.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/services", label: "Services" }, { href: "/services/practice-owner-planning", label: "Practice owner planning" }]} />;
}
