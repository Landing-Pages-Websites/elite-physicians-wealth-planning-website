import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/established";

export const metadata: Metadata = {
  title: "Established Physicians — Elite Physicians Wealth Planning™",
  description: "Turn strong earnings into a coordinated strategy for wealth, family, and freedom.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/established", label: "Established physicians" }]} />;
}
