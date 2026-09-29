import { PageCta } from "./page-cta";
import { PageHero } from "./page-hero";
import { ChildIndex, type ChildLink } from "./child-index";
import { bodySections, ctaSection, getPage } from "@/lib/pages";

/**
 * The three family indexes: /who-we-serve, /services, /physicians.
 *
 * These pages already enumerate their own children in the source copy — the
 * client's /who-we-serve lists all six profiles with a sentence each, and each
 * one is wrapped in a link. Adding a second link list underneath made the page
 * say everything twice, once unlinked and once linked.
 *
 * So the source's own enumeration IS the index, and its own anchors supply the
 * destinations. This used to carry a hand-written heading-to-route map per
 * page; the map was redundant once the parser stopped discarding the anchors,
 * and it was also WRONG — it sent "Practice Owners" to /physicians/practice-owners
 * when the client links it to /services/practice-owner-planning. A map
 * maintained by hand beside a source that already states the answer is a
 * standing invitation to drift.
 */
export function FamilyIndexPage({
  route,
  label,
  eyebrow,
}: {
  route: string;
  label: string;
  eyebrow: string;
}): React.JSX.Element {
  const page = getPage(route);
  const cta = ctaSection(page);

  const links: ChildLink[] = bodySections(page)
    .filter((section) => section.href && section.heading)
    .map((section) => ({
      href: section.href as string,
      label: section.heading as string,
      note: section.paras[0] ?? "",
    }));

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
