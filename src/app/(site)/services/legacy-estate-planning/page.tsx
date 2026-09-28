import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/services/legacy-estate-planning";

export const metadata: Metadata = {
  title: "Legacy & Estate Planning Coordination — Elite Physicians Wealth Planning™",
  description: "Coordinating estate documents, beneficiary designations, asset titling, insurance, charitable giving, and family wealth transfer with qualified estate planning attorneys.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return <PageShell page={getPage(ROUTE)} trail={[{ href: "/", label: "Home" }, { href: "/services", label: "Services" }, { href: "/services/legacy-estate-planning", label: "Legacy & estate planning" }]} />;
}
