import type { ReactNode } from "react";
import { heroImageFor } from "@/lib/hero-images";
import { ctaSection, groupedBody, type PageContent } from "@/lib/pages";
import { PageCta } from "./page-cta";
import { PageHero } from "./page-hero";
import { PageSection } from "./page-section";

/**
 * Composes one interior page from its captured copy, so a route file is a
 * route file and not a layout.
 *
 * `children` renders between the body bands and the closing CTA — that is where
 * a page with real functionality (the strategy-call form, the guide request,
 * the audience index) puts it, rather than interleaving it with prose it does
 * not belong to.
 */
export function PageShell({
  page,
  trail,
  omitHeadings,
  children,
}: {
  page: PageContent;
  trail?: readonly { href: string; label: string }[];
  /**
   * Source headings this page renders somewhere else. The four form pages each
   * carry a section that IS the form's intro and fine print — the parser could
   * not capture the form itself, so that copy was left stranded in a band above
   * the real form, on the guide page telling the visitor to "enter your details"
   * in a band with no fields. Named here, hoisted into the FormBand instead.
   */
  omitHeadings?: readonly string[];
  children?: ReactNode;
}): React.JSX.Element {
  const omit = new Set((omitHeadings ?? []).map((h) => h.toLowerCase()));
  const body = groupedBody(page).filter(
    (g) =>
      !omit.has((g.lead?.heading ?? "").toLowerCase()) &&
      !omit.has((g.lead?.eyebrow ?? "").toLowerCase()),
  );
  const cta = ctaSection(page);

  return (
    <main id="main">
      <PageHero page={page} trail={trail} image={heroImageFor(page.slug)} />
      {body.map((group, i) => (
        <PageSection
          key={`${group.lead?.heading ?? group.lead?.eyebrow ?? "peers"}-${i}`}
          group={group}
          index={i}
        />
      ))}
      {children}
      {cta ? <PageCta section={cta} /> : null}
    </main>
  );
}
