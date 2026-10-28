import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physicians/residents-fellows";

export const metadata: Metadata = {
  title: "Resident & Fellow Financial Planning | Elite Physicians",
  description:
    "Build a strong financial foundation for residency and fellowship with guidance on debt, benefits, taxes, protection, and long-term goals.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/physicians", label: "Physicians" }, { href: "/physicians/residents-fellows", label: "Residents & fellows" }]} />;
}
