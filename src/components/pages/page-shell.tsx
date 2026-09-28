import type { ReactNode } from "react";
import { bodySections, ctaSection, type PageContent } from "@/lib/pages";
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
  children,
}: {
  page: PageContent;
  trail?: readonly { href: string; label: string }[];
  children?: ReactNode;
}): React.JSX.Element {
  const body = bodySections(page);
  const cta = ctaSection(page);

  return (
    <main id="main">
      <PageHero page={page} trail={trail} />
      {body.map((section, i) => (
        <PageSection key={`${section.heading ?? section.eyebrow ?? "s"}-${i}`} section={section} index={i} />
      ))}
      {children}
      {cta ? <PageCta section={cta} /> : null}
    </main>
  );
}
