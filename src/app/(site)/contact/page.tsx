import type { Metadata } from "next";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { getPage, metaTitle } from "@/lib/pages";

const ROUTE = "/contact";

/**
 * The source's own notices for this form. They were stranded in a band ABOVE
 * the form, because the parser could not capture the form the client puts under
 * that heading — so the page carried the heading twice and told the visitor to
 * enter details where there were no fields. Hoisted under the form they belong to.
 */
const FINE_PRINT: readonly string[] = [
  "Please do not include sensitive personal, medical, tax, legal, or account information (Social Security numbers, account numbers, or health details) in this form.",
  "By submitting this form, you agree that Fiscal Vision Financial may contact you about your inquiry and provide educational communications. You may unsubscribe from email communications at any time. Submitting this form does not create an advisory relationship. Please do not submit sensitive personal, medical, tax, legal, or account information through this form."
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
      omitHeadings={["Send a message", "Office"]}
      trail={[{ href: "/", label: "Home" }, { href: ROUTE, label: "Contact" }]}
    >
      {/* The source repeats phone, email and hours in an "Office" band; the form
// band already renders them from the manifest brand, so that band is omitted. */}
      <FormBand
        id="contact-form"
        heading="Send a message."
        note="The practice will reply to your message. Office details are listed beside this form."
        submitLabel="Send message"
        intent="Website enquiry"
        fineprint={FINE_PRINT}
      />
    </PageShell>
  );
}
