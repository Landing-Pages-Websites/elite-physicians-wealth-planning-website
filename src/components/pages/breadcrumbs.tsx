import Link from "next/link";

/**
 * Forty-two source routes across four families need orientation, and the
 * approved frames have no pattern for it — so this is deliberately the
 * quietest thing on the page: one line, body scale, no chevron icons, the
 * current page carrying `aria-current` rather than a colour change alone.
 *
 * Quiet is not the same as small: the links were a 15px line box with 8px
 * between them, a third of the repo's own 44px floor and under even the 24px
 * WCAG 2.5.8 minimum. The target is padded to 44px and pulled back with a
 * negative margin, so it grows without moving anything.
 */
const SITE = "https://elitephysicianswealthplanning.com";

export function Breadcrumbs({
  trail,
}: {
  trail: readonly { href: string; label: string }[];
}): React.JSX.Element {
  // The one piece of structured data this site can emit that asserts nothing
  // unverifiable: it restates a trail already visible on the page.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      item: `${SITE}${crumb.href}`,
    })),
  };

  return (
    <nav aria-label="Breadcrumb">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-[12px] text-mist/55">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="inline-flex min-h-11 items-center text-mist/80">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="va-underline -my-2 inline-flex min-h-11 items-center py-2 transition-colors duration-200 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                >
                  {crumb.label}
                </Link>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-mist/30">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
