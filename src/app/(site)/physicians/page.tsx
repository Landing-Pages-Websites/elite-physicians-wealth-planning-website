import type { Metadata } from "next";
import { getPage, metaTitle } from "@/lib/pages";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/physicians";

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <FamilyIndexPage
      route={ROUTE}
      label="Physicians"
      eyebrow="Planning by career stage"
    />
  );
}
