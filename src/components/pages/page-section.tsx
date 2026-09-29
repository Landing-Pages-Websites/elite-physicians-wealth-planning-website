import Link from "next/link";
import { ArrowRightIcon } from "@/components/site/icons";
import type { SectionGroup } from "@/lib/pages";

/**
 * NEW UNAPPROVED SURFACE — the interior band.
 *
 * Three rules from `hard_rules` shape this, and the obvious build breaks all
 * three: "do not make every section a generic card grid, rounded-card
 * collection, or centered text stack"; the coordination line "must not restart
 * independently inside every frame"; and folio numbers are allowed only in
 * 04-blueprint-rounds.
 *
 * So: no cards, nothing centred, no numbers. The band is a two-column editorial
 * split — label rail left, prose right — with the coordination line running the
 * gutter between them. One line threading every section is the manifest's own
 * metaphor, so the page furniture carries the argument rather than decorating it.
 *
 * A band renders an h2 AND the h3 subsections beneath it. The source groups its
 * cross-sell blocks that way ("Each pillar connects to the others", then five
 * h3s, each wrapped in a link). Rendering each h3 as its own full-width band
 * flattened one idea into five, lost the outline, and — because the parser had
 * dropped the wrapping anchors — left sixty in-content links as dead text.
 */
export function PageSection({
  group,
  index,
}: {
  group: SectionGroup;
  index: number;
}): React.JSX.Element {
  const { lead, subsections } = group;
  const ground = index % 2 === 0 ? "bg-ivory" : "bg-white";
  const hasRail = Boolean(lead.eyebrow || lead.heading);

  return (
    <section className={`relative ${ground}`}>
      <div className="va-shell relative py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-x-14">
          {hasRail ? (
            <div className="relative lg:pr-8">
              {/* When a band's only label is its eyebrow, the eyebrow IS the
                  heading — same words, same styling, correct outline level.
                  Rendering it as a <p> left five bands headingless. */}
              {lead.eyebrow ? (
                <EyebrowOrHeading asHeading={!lead.heading}>{lead.eyebrow}</EyebrowOrHeading>
              ) : null}
              {lead.heading ? (
                <h2
                  className={`max-w-[22ch] font-display text-display-m leading-[1.12] font-medium tracking-[-0.01em] text-ink ${
                    lead.eyebrow ? "mt-3" : ""
                  }`}
                >
                  {lead.heading}
                </h2>
              ) : null}
              <span
                aria-hidden="true"
                className="absolute top-1.5 -right-[calc(1.75rem+4px)] hidden h-2 w-2 rounded-full bg-gold lg:block"
              />
            </div>
          ) : null}

          <div className={hasRail ? "mt-6 lg:mt-1.5" : "lg:col-start-2"}>
            {lead.paras.map((para) => (
              <p
                key={para}
                className="max-w-[68ch] font-body text-body-l leading-[1.68] text-charcoal not-first:mt-4"
              >
                {para}
              </p>
            ))}

            {lead.items.length ? (
              <ul className={`max-w-[68ch] ${lead.paras.length ? "mt-7" : ""}`}>
                {lead.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-4 border-t border-ink/12 py-3.5 first:border-t-0 first:pt-0"
                  >
                    <span aria-hidden="true" className="mt-2.5 h-px w-5 shrink-0 bg-gold" />
                    <span className="font-body text-body-m leading-[1.6] text-charcoal">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {subsections.length ? (
              <ul
                className={`max-w-[68ch] border-t border-ink/12 ${
                  lead.paras.length || lead.items.length ? "mt-8" : ""
                }`}
              >
                {subsections.map((sub) => (
                  <li key={sub.heading ?? ""} className="border-b border-ink/12">
                    <Subsection section={sub} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The band's small gold label. It is the heading when the band has no other —
 * `gap-x-14` is a 3.5rem gutter, so the node sits at 1.75rem plus half its own
 * 8px width to land on the gutter's centre line rather than 8px left of it.
 */
function EyebrowOrHeading({
  asHeading,
  children,
}: {
  asHeading: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const className =
    "font-body text-[11px] font-semibold tracking-[0.24em] text-gold-text uppercase";
  return asHeading ? (
    <h2 className={className}>{children}</h2>
  ) : (
    <p className={className}>{children}</p>
  );
}

/** One h3 block. Linked where the source linked it, static where it did not. */
function Subsection({ section }: { section: SectionGroup["lead"] }): React.JSX.Element {
  const body = (
    <>
      <h3 className="font-display text-display-s leading-[1.22] font-medium text-ink transition-colors duration-200 group-hover:text-gold-text">
        {section.heading}
      </h3>
      {section.paras.map((para) => (
        <p
          key={para}
          className="mt-2 font-body text-body-m leading-[1.6] text-charcoal not-first:mt-2"
        >
          {para}
        </p>
      ))}
    </>
  );

  if (!section.href) return <div className="py-5">{body}</div>;

  return (
    <Link
      href={section.href}
      className="group flex items-start gap-6 py-5 transition-colors duration-200 hover:bg-white focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
    >
      <span className="min-w-0 flex-1">{body}</span>
      <ArrowRightIcon aria-hidden="true" className="mt-1.5 h-4 w-4 shrink-0 text-gold transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}
