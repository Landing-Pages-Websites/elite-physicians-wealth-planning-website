import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/who-we-serve/physicians-specialists";

export const metadata: Metadata = {
  title: "Financial Planning for Physicians & Specialists — Elite Physicians Wealth Planning™",
  description: "Financial strategy for physicians and specialists with complex income, limited time, and coordinated tax, retirement, investment, and protection needs.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/who-we-serve", label: "Who we serve" }, { href: "/who-we-serve/physicians-specialists", label: "Physicians & specialists" }]} />;
}
