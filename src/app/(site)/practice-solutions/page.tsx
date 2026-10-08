import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";
import { getPage, metaTitle } from "@/lib/pages";

/**
 * The "Physician Practice Solutions" menu the practice pages' handoff asks for:
 * "Add both pages beneath a prominent Business Owners or Physician Practice
 * Solutions menu. Do not bury them under a generic Resources page." Its copy is
 * the handoff's suggested cross-promotion block.
 */
const ROUTE = "/practice-solutions";

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <FamilyIndexPage route={ROUTE} label="Practice solutions" eyebrow="Finance the practice. Protect the practice." />;
}
