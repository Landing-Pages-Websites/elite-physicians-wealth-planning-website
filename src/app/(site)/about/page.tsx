import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/about";

export const metadata: Metadata = {
  title: "About Elite Physicians Wealth Planning",
  description: "A wealth strategy platform built for physicians and medical professionals — coordinating tax, retirement, wealth, practice, and legacy planning.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/about", label: "About" }]} />;
}
