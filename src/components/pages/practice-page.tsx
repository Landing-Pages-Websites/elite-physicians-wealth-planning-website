import type { Metadata } from "next";
import { ctaSection, getPage, metaTitle } from "@/lib/pages";
import { FormBand } from "./form-band";
import { PageShell } from "./page-shell";

const FORM_ID = "practice-form";

/**
 * The two practice pages from Roderick Johnson's handoff: commercial lending &
 * SBA financing, and business insurance & risk management.
 *
 * The handoff asks for the primary action in the hero and at the close, and for
 * "separate lead forms for financing and insurance so leads can be routed
 * directly to the correct workflow" — so each closes on its own form, with its
 * own intent and the handoff's recommended fields, instead of the shared
 * strategy-call band. Its disclosure is the handoff's compliance language.
 */
export function PracticePage({ route }: { route: string }): React.JSX.Element {
  const page = getPage(route);
  const close = ctaSection(page);
  const form = page.form;
  if (!close?.heading || !form) throw new Error(`${route} needs a closing section and a form`);

  return (
    <PageShell
      page={page}
      heroAction={{ href: `#${FORM_ID}`, label: form.primary }}
      trail={[
        { href: "/", label: "Home" },
        { href: "/practice-solutions", label: "Practice solutions" },
        { href: route, label: page.eyebrow ?? page.title },
      ]}
      closing={
        <FormBand
          id={FORM_ID}
          heading={close.heading}
          note={close.paras[0] ?? ""}
          intent={form.intent}
          submitLabel={form.submit}
          extraFields={form.fields}
          fineprint={[
            "Please do not include Social Security numbers, account numbers, health information, tax documents, or other sensitive data in this form.",
          ]}
        />
      }
    />
  );
}

export function practiceMetadata(route: string): Metadata {
  const page = getPage(route);
  return {
    title: metaTitle(page),
    description: page.description,
    alternates: { canonical: route },
  };
}
