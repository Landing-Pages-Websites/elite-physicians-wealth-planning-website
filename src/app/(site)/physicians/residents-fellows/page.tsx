import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/residents-fellows";

export const metadata: Metadata = {
  title: "Residents & Fellows — Elite Physicians Wealth Planning™",
  description: "Build a strong financial foundation before your career and income accelerate.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/residents-fellows", label: "Residents & fellows" }]} />;
}
