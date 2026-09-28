import Link from "next/link";
import type { PageSection } from "@/lib/pages";

/**
 * The closing band. The source site ends nearly every page with a persuasive
 * block, so that copy is the client's, not ours — only the action is decided
 * here, and it is decided conservatively.
 *
 * It points at /schedule, never at a booking widget. `customer_asks` promises
 * "direct Google Calendar scheduling using the supplied embed" and the embed
 * has not been supplied — confirmed by grepping all 42 captured source pages
 * for an iframe or any booking host and finding none. Inventing a booking
 * destination would invent the workflow the client is meant to approve, so the
 * page sends the visitor to a real page that explains what happens next.
 *
 * Navy ground, gold action: the accent does exactly one job on this site, and
 * this is it. Left-aligned to match every other band — the approved frames
 * never centre a closing block.
 */
export function PageCta({ section }: { section: PageSection }): React.JSX.Element {
  return (
    <section className="relative overflow-hidden bg-ink">
      <svg
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
      >
        {/* Resumes the hero's line where it left off — down the right margin,
            then out to the left under the copy. Same reason as the hero for
            keeping x at 1300: the heading runs to 24ch and the body to 56ch,
            so nothing the visitor reads is ever crossed by the motif. */}
        <g stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1300 0 V242 Q1300 260 1282 260 H0" vectorEffect="non-scaling-stroke" opacity="0.5" />
        </g>
        <circle cx="1300" cy="242" r="4.5" fill="var(--color-ink)" stroke="var(--color-gold)" strokeWidth="1.5" />
      </svg>

      <div className="va-shell relative z-10 py-14 lg:py-20">
        {section.heading ? (
          <h2 className="max-w-[24ch] font-display text-display-m leading-[1.1] font-medium tracking-[-0.01em] text-ivory-bright text-balance">
            {section.heading}
          </h2>
        ) : null}

        {section.paras.map((para) => (
          <p
            key={para}
            className="mt-5 max-w-[56ch] font-body text-body-l leading-[1.62] text-mist/80"
          >
            {para}
          </p>
        ))}

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/schedule"
            className="inline-flex min-h-12 items-center rounded-sm bg-gold px-7 font-body text-[14px] font-semibold text-ink transition-colors duration-200 hover:bg-gold-hover focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
          >
            Schedule a strategy call
          </Link>
          <Link
            href="/our-process"
            className="inline-flex min-h-12 items-center font-body text-[14px] text-mist/80 underline-offset-8 transition-colors duration-200 hover:text-gold hover:underline focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
          >
            See the Blueprint process
          </Link>
        </div>
      </div>
    </section>
  );
}
