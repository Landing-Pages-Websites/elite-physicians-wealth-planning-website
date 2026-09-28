import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/who-we-serve/surgeons";

export const metadata: Metadata = {
  title: "Financial Planning for Surgeons — Elite Physicians Wealth Planning™",
  description: "Wealth planning for surgeons with demanding schedules, high earning potential, tax exposure, risk considerations, and retirement complexity.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/who-we-serve", label: "Who we serve" }, { href: "/who-we-serve/surgeons", label: "Surgeons" }]} />;
}
