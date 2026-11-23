import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/established";

export const metadata: Metadata = {
  title: { absolute: "Physician Compensation Planning | Elite Physicians" },
  description:
    "Coordinate physician compensation with tax strategy, investments, protection, family goals, and retirement planning with Elite Physicians.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/established", label: "Established physicians" }]} />;
}
