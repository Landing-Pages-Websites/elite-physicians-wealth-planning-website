import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage, metaTitle } from "@/lib/pages";

const ROUTE = "/privacy-disclosures";

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/privacy-disclosures", label: "Privacy & disclosures" }]} />;
}
