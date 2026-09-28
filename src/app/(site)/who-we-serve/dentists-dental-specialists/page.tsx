import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/who-we-serve/dentists-dental-specialists";

export const metadata: Metadata = {
  title: "Financial Planning for Dentists — Elite Physicians Wealth Planning™",
  description: "Wealth strategy for dentists and dental specialists — associates building a foundation and owners managing practice cash flow, retirement plans, and exit planning.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/who-we-serve", label: "Who we serve" }, { href: "/who-we-serve/dentists-dental-specialists", label: "Dentists & dental specialists" }]} />;
}
