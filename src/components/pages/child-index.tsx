import Link from "next/link";

export type ChildLink = {
  readonly href: string;
  readonly label: string;
  readonly note: string;
};

/**
 * The route-family index used by /services, /who-we-serve and /physicians.
 *
 * Hairline-separated rows rather than a grid of cards, because `hard_rules`
 * bans "a generic card grid, rounded-card collection" and a five-card row is
 * the single most recognisable generated-site tell. The row gives the label
 * display scale and the note a real measure, so it reads as a contents page
 * rather than navigation dressed up as content.
 *
 * The whole row is the target — 44px minimum comes free from the padding — and
 * the gold arrow is the only accent, so the page keeps one focal colour.
 */
export function ChildIndex({
  eyebrow,
  links,
}: {
  eyebrow: string;
  links: readonly ChildLink[];
}): React.JSX.Element {
  return (
    <section className="bg-white">
      <div className="va-shell py-12 lg:py-16">
        <p className="font-body text-[11px] font-semibold tracking-[0.24em] text-gold-text uppercase">
          {eyebrow}
        </p>
        {/* Capped so the arrow stays related to its own row: at full shell width
            the affordance sat ~700px from the text it belonged to. */}
        <ul className="mt-7 max-w-[62rem] border-t border-ink/12">
          {links.map((child) => (
            <li key={child.href} className="border-b border-ink/12">
              <Link
                href={child.href}
                className="group flex items-start gap-6 py-6 transition-colors duration-200 hover:bg-ivory focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none lg:gap-10"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-display-s leading-[1.2] font-medium text-ink transition-colors duration-200 group-hover:text-gold-text">
                    {child.label}
                  </span>
                  <span className="mt-2 block max-w-[62ch] font-body text-body-m leading-[1.6] text-charcoal">
                    {child.note}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="mt-2 shrink-0 font-body text-[18px] leading-none text-gold transition-transform duration-200 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
