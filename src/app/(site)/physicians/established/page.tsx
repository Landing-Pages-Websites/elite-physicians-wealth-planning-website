import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/established";

export const metadata: Metadata = {
  title: "Established Physician Financial Planning | Elite",
  description:
    "Coordinate taxes, investments, protection, family goals, and retirement strategy as an established physician.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/established", label: "Established physicians" }]} />;
}
