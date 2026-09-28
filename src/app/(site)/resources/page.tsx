import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/resources";

export const metadata: Metadata = {
  title: "Physician Resource Center — Elite Physicians Wealth Planning™",
  description: "Educational guides, checklists, articles, and webinars for medical professionals on taxes, retirement, investments, practice ownership, and legacy planning.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/resources", label: "Resource center" }]} />;
}
