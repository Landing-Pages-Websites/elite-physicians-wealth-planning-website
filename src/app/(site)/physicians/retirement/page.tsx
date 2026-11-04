import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/retirement";

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: { absolute: "Physician Retirement Planning | Elite Physicians" },
  description:
    "Prepare for physician retirement with a coordinated strategy for income, taxes, healthcare, and legacy goals.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/retirement", label: "Approaching retirement" }]} />;
}
