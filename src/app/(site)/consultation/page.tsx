import type { Metadata } from "next";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/consultation";

export const metadata: Metadata = {
  title: "Request a Private Consultation — Elite Physicians Wealth Planning™",
  description: "Request a private, no-pressure consultation with Elite Physicians Wealth Planning™. Discovery conversation for physicians and medical practice owners.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <PageShell
      page={getPage(ROUTE)}
      trail={[{ href: "/", label: "Home" }, { href: ROUTE, label: "Book a consultation" }]}
    >
      <FormBand
        id="consultation-form"
        heading="Request a private conversation."
        note="A discovery discussion about your career stage, priorities, and the decisions in front of you. Submitting this form does not create an advisory relationship."
        submitLabel="Request a conversation"
        intent="Private consultation request"
      />
    </PageShell>
  );
}
