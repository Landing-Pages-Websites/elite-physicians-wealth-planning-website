import type { Metadata } from "next";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { getPage, metaTitle } from "@/lib/pages";

const ROUTE = "/physician-tax-retirement-guide";

/**
 * The source's own notices for this form. They were stranded in a band ABOVE
 * the form, because the parser could not capture the form the client puts under
 * that heading — so the page carried the heading twice and told the visitor to
 * enter details where there were no fields. Hoisted under the form they belong to.
 */
const FINE_PRINT: readonly string[] = [
  "Please do not include sensitive personal, medical, tax, legal, or account information (Social Security numbers, account numbers, or health details) in this form.",
  "By submitting this form, you agree to receive educational communications from Elite Physicians Wealth Planning\u2122 and Fiscal Vision Financial. You may unsubscribe from email communications at any time. Submitting this form does not create an advisory relationship."
];

const GUIDE = {
  href: "/guides/physician-tax-retirement-planning-guide-2026.pdf",
  label: "Download the guide (PDF)",
} as const;

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
      omitHeadings={["Request the guide"]}
      heroAction={{ href: "#guide-form", label: "Request the guide" }}
      trail={[{ href: "/", label: "Home" }, { href: ROUTE, label: "Tax & retirement guide" }]}
    >
      {/* The client supplied the final file on 2026-10-08 (EPWP v3.3), so the
          gate now hands it over: details first, then the download. The
          blueprint's delivery workflow is "Download a Physician Planning
          Guide", tracked as a guide download. */}
      <FormBand
        id="guide-form"
        heading="Request the guide."
        note="Enter your details and the download appears here straight away: the 2026 edition, as a 21-page PDF."
        submitLabel="Request the guide"
        intent="Guide request"
        fineprint={FINE_PRINT}
        delivery={GUIDE}
      />
    </PageShell>
  );
}
