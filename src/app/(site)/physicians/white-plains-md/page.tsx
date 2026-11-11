import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/white-plains-md";

export const metadata: Metadata = {
  title: { absolute: "White Plains Physician Financial Planning | Elite Physicians" },
  description:
    "Physician financial planning for White Plains, Maryland and the Mid-Atlantic, with coordinated tax, wealth, retirement, practice, and legacy guidance.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <PageShell
      page={getPage(ROUTE)}
      trail={[
        { href: "/", label: "Home" },
        { href: "/physicians", label: "Physicians" },
        { href: ROUTE, label: "White Plains" },
      ]}
    />
  );
}
