import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/our-process";

export const metadata: Metadata = {
  title: "The Elite Physician Wealth Blueprint™",
  description: "A six-phase advisory process — Discover, Assess, Strategize, Implement, Optimize, Review — for physicians and medical professionals.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/our-process", label: "Our process" }]} />;
}
