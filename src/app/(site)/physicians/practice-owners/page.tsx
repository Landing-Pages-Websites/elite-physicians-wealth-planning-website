import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/practice-owners";

export const metadata: Metadata = {
  title: "Physician Practice Owner Planning | Elite Physicians",
  description:
    "Connect practice cash flow, taxes, benefits, succession, and personal wealth with a coordinated plan for physician practice owners.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/practice-owners", label: "Practice owners" }]} />;
}
