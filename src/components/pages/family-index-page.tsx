import { PageCta } from "./page-cta";
import { PageHero } from "./page-hero";
import { ChildIndex, type ChildLink } from "./child-index";
import { bodySections, ctaSection, getPage } from "@/lib/pages";

/**
 * The three family indexes: /who-we-serve, /services, /physicians.
 *
 * These pages already enumerate their own children in the source copy — the
 * client's `/who-we-serve` lists all six profiles with a sentence each. Adding
 * a link list under that enumeration made the page say everything twice, once
 * unlinked and once linked, which is what the first build did.
 *
 * So the source's own enumeration IS the index: each body section supplies the
 * label and the sentence, and `hrefs` supplies the destination. Nothing is
 * duplicated, nothing is rewritten, and no section is a dead end.
 *
 * A heading with no mapped route is dropped rather than rendered unlinked —
 * with one deliberate exception handled by the caller: /who-we-serve lists
 * "Practice Owners", whose page lives in the /physicians family, so it maps
 * across rather than disappearing.
 */
export function FamilyIndexPage({
  route,
  label,
  eyebrow,
  hrefs,
}: {
  route: string;
  label: string;
  eyebrow: string;
  /** Source heading (lowercased) → destination route. */
  hrefs: Readonly<Record<string, string>>;
}): React.JSX.Element {
  const page = getPage(route);
  const cta = ctaSection(page);

  const links: ChildLink[] = bodySections(page)
    .map((section) => {
      const heading = section.heading?.trim();
      if (!heading) return null;
      const href = hrefs[heading.toLowerCase()];
      if (!href) return null;
      return { href, label: heading, note: section.paras[0] ?? "" };
    })
    .filter((link): link is ChildLink => link !== null);

  return (
    <main id="main">
      <PageHero
        page={page}
        trail={[
          { href: "/", label: "Home" },
          { href: route, label },
        ]}
      />
      <ChildIndex eyebrow={eyebrow} links={links} />
      {cta ? <PageCta section={cta} /> : null}
    </main>
  );
}
