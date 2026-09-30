import type { Metadata } from "next";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { getPage, metaTitle } from "@/lib/pages";

const ROUTE = "/schedule";

/**
 * The source's own notices for this form. They were stranded in a band ABOVE
 * the form, because the parser could not capture the form the client puts under
 * that heading — so the page carried the heading twice and told the visitor to
 * enter details where there were no fields. Hoisted under the form they belong to.
 */
const FINE_PRINT: readonly string[] = [
  "Please do not include sensitive personal, medical, tax, legal, or account information (Social Security numbers, account numbers, or health details) in this form.",
  "By submitting this form, you agree that Fiscal Vision Financial may contact you about your inquiry. Consent is not a condition of purchasing services. Messaging and data rates may apply if text messaging is enabled. Please do not submit sensitive personal, medical, tax, legal, or account information through this form."
];

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <PageShell
      page={getPage(ROUTE)}
      omitHeadings={["Request your call"]}
      trail={[{ href: "/", label: "Home" }, { href: ROUTE, label: "Schedule a strategy call" }]}
    >
      {/* The Calendar embed is an unsupplied client asset (build/CLIENT-GAPS.md
// 1.3). That is OUR problem, not the visitor's. */}
      <FormBand
        id="schedule-form"
        heading="Request a strategy call."
        note="Send this and the practice will reply to arrange a time. Direct calendar booking is not available on this page yet."
        submitLabel="Request a strategy call"
        intent="Strategy call request"
        fineprint={FINE_PRINT}
      />
    </PageShell>
  );
}
