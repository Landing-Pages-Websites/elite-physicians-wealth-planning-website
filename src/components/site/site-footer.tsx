import Link from "next/link";
import { BRAND, HERO, SEPARATE_ROOMS, telHref } from "@/lib/content";

/**
 * NEW UNAPPROVED SURFACE. The approved mockup has no footer.
 *
 * Deliberately NOT a copy of the closing section's ContactClose block, which
 * lives inside approved section 08 and already carries email, phone, hours and
 * the identity line. Cannibalising that block into a footer was a trap flagged
 * in review. This footer does a different job: site navigation and the
 * per-page compliance lines that have to appear on every route, not just the
 * homepage.
 *
 * /privacy-disclosures is linked because the client publishes that text
 * themselves and it was captured with the rest of the source. The other seven
 * documents their own footer advertises — Terms of Use, Accessibility
 * Statement, Cookie Notice, Form CRS, Form ADV, BrokerCheck/IAPD, Insurance &
 * Licensing — all 404 on the live site today. They are not reproduced here:
 * advertising a Form ADV that does not resolve is worse on a regulated site
 * than not listing it, and drafting those documents is not an agency call.
 * They are named in build/CLIENT-GAPS.md.
 */
const SECTIONS = [
  { href: "/who-we-serve", label: "Who we serve" },
  { href: "/services", label: "Services" },
  { href: "/our-process", label: "Our process" },
  { href: "/physicians", label: "Who we help" },
  { href: "/resources", label: "Resource center" },
  { href: "/insights", label: "Insights" },
  { href: "/meet-michael-epps", label: "Michael A. Epps" },
  // Without these three, /about/team, /contact and /consultation had no inbound
  // link from anywhere on the site while still being emitted in sitemap.xml.
  { href: "/about/team", label: "Meet the team" },
  { href: "/contact", label: "Contact" },
  { href: "/consultation", label: "Request a consultation" },
] as const;

export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-ink/10 bg-ivory">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-14">
        <div>
          <p className="font-display text-xl font-medium text-ink">
            {BRAND.name}
            <span className="align-super text-[0.6em]">™</span>
          </p>
          {/* Tracked uppercase at 390 stranded "Financial" on its own line. */}
          <p className="mt-1 font-body text-[10px] font-semibold tracking-[0.28em] text-balance text-ink/70 uppercase">
            {BRAND.poweredBy}
          </p>
          <span aria-hidden="true" className="mt-5 block h-px w-12 bg-gold" />
          <p className="mt-5 max-w-xs font-body text-[13px] leading-relaxed text-charcoal/80">
            {SEPARATE_ROOMS.boundaryNote}
          </p>
        </div>

        <nav aria-label="Sections">
          <h2 className="font-body text-[11px] font-semibold tracking-[0.22em] text-ink uppercase">
            On this site
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {SECTIONS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="-my-2 inline-flex min-h-11 items-center py-2 font-body text-[13px] text-charcoal underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-body text-[11px] font-semibold tracking-[0.22em] text-ink uppercase">
            Contact
          </h2>
          <ul className="mt-5 flex flex-col gap-3 font-body text-[13px] text-charcoal">
            <li>
              <a
                href={`mailto:${BRAND.email}`}
                className="-my-2 inline-flex min-h-11 items-center py-2 underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
              >
                {BRAND.email}
              </a>
            </li>
            <li>
              <a
                href={telHref()}
                className="-my-2 inline-flex min-h-11 items-center py-2 underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
              >
                {BRAND.phone}
              </a>
            </li>
            <li className="text-charcoal/80">{BRAND.hours}</li>
          </ul>
          <Link
            href="/schedule"
            className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-ink px-5 font-body text-[13px] font-semibold text-ivory transition-colors duration-200 hover:bg-ink/90"
          >
            Schedule a strategy call
          </Link>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-6 font-body text-[11px] leading-relaxed text-charcoal/80 sm:px-10 lg:px-14">
          {/* Compliance lines belong on every route, not only the homepage. */}
          <p>{HERO.disclaimer}</p>
          <p>{BRAND.wordmark}</p>
          <p>
            <Link
              href="/privacy-disclosures"
              className="underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
            >
              Privacy &amp; website disclosures
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
