import type { Metadata } from "next";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/physician-tax-retirement-guide";

export const metadata: Metadata = {
  title: "Physician Tax & Retirement Planning Guide — Elite Physicians Wealth Planning™",
  description: "Download the Physician Tax &amp; Retirement Planning Guide — a structured framework for coordinating tax, retirement, investment, and practice decisions.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <PageShell
      page={getPage(ROUTE)}
      trail={[{ href: "/", label: "Home" }, { href: ROUTE, label: "Tax & retirement guide" }]}
    >
      <FormBand
        id="guide-form"
        heading="Request the guide."
        note="The guide is sent by the practice, not downloaded here. The final file and its delivery workflow are client-supplied and still outstanding, so this page takes your request and does not promise an instant download."
        intent="Guide request"
      />
    </PageShell>
  );
}
