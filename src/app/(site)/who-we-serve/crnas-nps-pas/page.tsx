import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage, metaTitle } from "@/lib/pages";

const ROUTE = "/who-we-serve/crnas-nps-pas";

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/who-we-serve", label: "Who we serve" }, { href: "/who-we-serve/crnas-nps-pas", label: "CRNAs, NPs & PAs" }]} />;
}
