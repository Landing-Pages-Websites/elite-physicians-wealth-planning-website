import type { Metadata } from "next";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { getPage } from "@/lib/pages";

const ROUTE = "/schedule";

export const metadata: Metadata = {
  title: "Schedule a Strategy Call — Elite Physicians Wealth Planning™",
  description: "Schedule your Elite Physician Strategy Call — a confidential conversation about your planning priorities, with no product presentation.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <PageShell
      page={getPage(ROUTE)}
      trail={[{ href: "/", label: "Home" }, { href: ROUTE, label: "Schedule a strategy call" }]}
    >
      <FormBand
        id="schedule-form"
        heading="Request a strategy call."
        note="Send this and the practice will reply to arrange a time. Direct calendar booking is not live yet — the scheduling embed is a client-supplied asset and is tracked in build/CLIENT-GAPS.md, so this page will not pretend to hold a slot it cannot."
        intent="Strategy call request"
      />
    </PageShell>
  );
}
