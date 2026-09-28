import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/who-we-serve/healthcare-executives";

export const metadata: Metadata = {
  title: "Financial Planning for Healthcare Executives — Elite Physicians Wealth Planning™",
  description: "Wealth planning for healthcare executives with equity compensation, deferred compensation, complex benefits, and multi-year tax considerations.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/who-we-serve", label: "Who we serve" }, { href: "/who-we-serve/healthcare-executives", label: "Healthcare executives" }]} />;
}
