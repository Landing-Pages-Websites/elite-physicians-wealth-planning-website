import type { Metadata } from "next";
import { CalendarEmbed } from "@/components/pages/calendar-embed";
import { FormBand } from "@/components/pages/form-band";
import { PageShell } from "@/components/pages/page-shell";
import { BRAND } from "@/lib/content";
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
      {/* Client, 2026-10-19: "It should say call Gabi to schedule your
          appointment." Gabi (Gabriella Gomez Sanchez) keeps Michael A. Epps's
          calendar, per her bio; she books each call by hand because he works
          from more than one office (client, 2026-10-13). The online calendar
          stays as the second route; the client is renaming it in Google to
          "Strategy call with Elite Physicians Wealth Planning". */}
      <CalendarEmbed
        heading="Call Gabi to schedule your appointment."
        note="Gabi manages Michael A. Epps’s calendar. She will book your strategy call and confirm the time and place with you, because he works from more than one office. The call is a confidential conversation about your goals, current planning concerns and next steps — not a product presentation."
        phone={BRAND.phone}
        onlineNote="Pick a time below and our office will schedule your meeting on Michael A. Epps’s calendar and confirm it with you."
      />
      <FormBand
        id="schedule-form"
        heading="Or send a message instead."
        note="If you would rather describe your situation first, send this and the practice will reply to arrange a time."
        submitLabel="Request a strategy call"
        intent="Strategy call request"
        fineprint={FINE_PRINT}
      />
    </PageShell>
  );
}
