import type { PageContent } from "@/lib/pages";
import { Breadcrumbs } from "./breadcrumbs";

/**
 * NEW UNAPPROVED SURFACE — interior pages have no approved frame.
 *
 * Built from Direction A's own language rather than a generic page header: the
 * navy ground the homepage hero uses, Cormorant at display scale, the gold
 * coordination line entering from the left margin and turning down the page.
 *
 * The motif is the point. `page_flow.motif_continuity` describes ONE line that
 * travels the site, and a hero that started its own decorative rule would make
 * it per-section decoration. This one enters at the left edge, runs under the
 * eyebrow and exits downward at the same x the first body band picks it up.
 *
 * Asymmetric on purpose: the headline holds a 62%-wide measure against open
 * space on the right, because `hard_rules` bans "centered text stack" and the
 * approved frames never centre a headline.
 */
export function PageHero({
  page,
  trail,
}: {
  page: PageContent;
  trail?: readonly { href: string; label: string }[];
}): React.JSX.Element {
  return (
    <section data-dark-band className="relative overflow-hidden bg-ink pt-[calc(var(--header-h)+1px)]">
      {/* The coordination line: in at the left edge above the copy, across the
          band, and down its right margin to be picked up by the next section.
          It runs ABOVE and to the RIGHT of every text block on purpose — the
          first draft turned down at x=214 and put the line and its node
          straight through the breadcrumb, which the contrast gate caught at
          1.9:1 on /services/wealth-management. The copy column is at most 68ch
          (~700px of the 1440 frame), so a descent at x=1300 cannot reach it,
          and the crossbar sits above the breadcrumb at every band height
          because the band always clears the header plus its own top padding. */}
      <svg
        viewBox="0 0 1440 460"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
        fill="none"
      >
        <g stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M0 40 H1282 Q1300 40 1300 58 V460" vectorEffect="non-scaling-stroke" opacity="0.5" />
        </g>
        <circle cx="1300" cy="58" r="4.5" fill="var(--color-ink)" stroke="var(--color-gold)" strokeWidth="1.5" />
      </svg>

      <div className="va-shell relative z-10 py-14 lg:py-20">
        {trail ? <Breadcrumbs trail={trail} /> : null}

        {page.eyebrow ? (
          <p className="mt-7 font-body text-[11px] font-semibold tracking-[0.26em] text-gold uppercase">
            {page.eyebrow}
          </p>
        ) : null}

        <h1 className="mt-5 max-w-[19ch] font-display text-display-l leading-[1.04] font-medium tracking-[-0.015em] text-ivory-bright text-balance lg:max-w-[16ch]">
          {page.headline}
        </h1>

        {page.lede ? (
          <p className="mt-7 max-w-[58ch] font-body text-body-l leading-[1.62] text-mist/80">
            {page.lede}
          </p>
        ) : null}
      </div>
    </section>
  );
}
