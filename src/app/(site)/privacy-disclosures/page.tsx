import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/privacy-disclosures";

export const metadata: Metadata = {
  title: "Privacy & Website Disclosures — Elite Physicians Wealth Planning™",
  description: "Privacy and website disclosures for Elite Physicians Wealth Planning™, powered by Fiscal Vision Financial.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/privacy-disclosures", label: "Privacy & disclosures" }]} />;
}
