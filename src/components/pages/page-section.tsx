import type { PageSection as Section } from "@/lib/pages";

/**
 * NEW UNAPPROVED SURFACE — the interior band.
 *
 * Three rules from `hard_rules` shape this and are worth naming, because the
 * obvious build breaks all three: "do not make every section a generic card
 * grid, rounded-card collection, or centered text stack"; the coordination line
 * "must not restart independently inside every frame"; and folio numbers are
 * allowed only in 04-blueprint-rounds.
 *
 * So: no cards, nothing centred, no numbers. The band is a two-column editorial
 * split — label rail left, prose right — with the coordination line running
 * down the gutter BETWEEN them and a node where each heading sits. One line
 * threading every section is the manifest's own metaphor ("a single precise
 * coordination line connects decisions that are usually handled in separate
 * rooms"), so the page furniture is the argument rather than decoration.
 *
 * Lists are hairline-separated rows, not a grid of boxes. Grounds alternate
 * ivory/white to carry the `page_flow` weight rhythm instead of eight
 * identical bands.
 */
export function PageSection({
  section,
  index,
}: {
  section: Section;
  index: number;
}): React.JSX.Element {
  const ground = index % 2 === 0 ? "bg-ivory" : "bg-white";
  const hasRail = Boolean(section.eyebrow || section.heading);

  return (
    <section className={`relative ${ground}`}>
      <div className="va-shell relative py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-x-14">
          {hasRail ? (
            <div className="relative lg:pr-8">
              {section.eyebrow ? (
                <p className="font-body text-[11px] font-semibold tracking-[0.24em] text-gold-text uppercase">
                  {section.eyebrow}
                </p>
              ) : null}
              {section.heading ? (
                <h2
                  className={`max-w-[22ch] font-display text-display-m leading-[1.12] font-medium tracking-[-0.01em] text-ink ${
                    section.eyebrow ? "mt-3" : ""
                  }`}
                >
                  {section.heading}
                </h2>
              ) : null}
              {/* The gutter node — the coordination line is drawn by the page,
                  not by each band, so this marks where it passes. */}
              <span
                aria-hidden="true"
                className="absolute top-1.5 -right-[calc(1.75rem+1px)] hidden h-2 w-2 -translate-x-1/2 rounded-full bg-gold lg:block"
              />
            </div>
          ) : null}

          <div className={hasRail ? "mt-6 lg:mt-1.5" : ""}>
            {section.paras.map((para) => (
              <p
                key={para}
                className="max-w-[68ch] font-body text-body-l leading-[1.68] text-charcoal not-first:mt-4"
              >
                {para}
              </p>
            ))}

            {section.items.length ? (
              <ul className={`max-w-[68ch] ${section.paras.length ? "mt-7" : ""}`}>
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-4 border-t border-ink/12 py-3.5 first:border-t-0 first:pt-0"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2.5 h-px w-5 shrink-0 bg-gold"
                    />
                    <span className="font-body text-body-m leading-[1.6] text-charcoal">
                      {item}
                    </span>
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
