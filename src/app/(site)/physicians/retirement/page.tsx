import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/retirement";

export const metadata: Metadata = {
  title: "Physicians Approaching Retirement — Elite Physicians Wealth Planning™",
  description: "Retire from medicine with a coordinated plan for income, taxes, healthcare, and legacy.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/retirement", label: "Approaching retirement" }]} />;
}
