import type { Metadata } from "next";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/contact";

export const metadata: Metadata = {
  title: "Contact — Elite Physicians Wealth Planning™",
  description: "Contact Elite Physicians Wealth Planning™, powered by Fiscal Vision Financial, with planning questions, referral partnerships, or speaking requests.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <PageShell
      page={getPage(ROUTE)}
      trail={[{ href: "/", label: "Home" }, { href: ROUTE, label: "Contact" }]}
    >
      <FormBand
        id="contact-form"
        heading="Send a message."
        note="Please do not include Social Security numbers, account numbers, health information, or tax documents. Email is not a secure channel."
        intent="Website enquiry"
      />
    </PageShell>
  );
}
