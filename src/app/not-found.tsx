import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Lives at the ROOT, not inside the (site) group, because a route-group
 * not-found only catches notFound() calls raised from inside that group — an
 * unmatched URL never enters it. The eight compliance paths the client's own
 * footer still advertises (Form ADV, Form CRS, BrokerCheck and the rest) all
 * land here, so this is a page real visitors will see.
 *
 * Next's built-in error screen has no <main>, no header, no footer, no skip
 * link and no way back into the site. This one is the site.
 */
const WAYS_BACK = [
  { href: "/services", label: "Six planning disciplines" },
  { href: "/who-we-serve", label: "Who we serve" },
  { href: "/our-process", label: "The Blueprint process" },
  { href: "/insights", label: "Insights" },
] as const;

export default function NotFound(): React.JSX.Element {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section
          data-dark-band
          className="relative overflow-hidden bg-ink pt-[calc(var(--header-h)+1px)]"
        >
          <div className="va-shell relative z-10 py-14 lg:py-20">
            <p className="font-body text-[11px] font-semibold tracking-[0.26em] text-gold uppercase">
              Page not found
            </p>
            <h1 className="mt-5 max-w-[19ch] font-display text-display-l leading-[1.04] font-medium tracking-[-0.015em] text-ivory-bright text-balance lg:max-w-[16ch]">
              That page is not here.
            </h1>
            <p className="mt-7 max-w-[58ch] font-body text-body-l leading-[1.62] text-mist/80">
              The address may have changed, or the page may not have been published yet.
              These are the places most people are looking for.
            </p>
          </div>
        </section>

        <section className="bg-ivory">
          <div className="va-shell py-12 lg:py-16">
            <ul className="max-w-[62rem] border-t border-ink/12">
              {WAYS_BACK.map((way) => (
                <li key={way.href} className="border-b border-ink/12">
                  <Link
                    href={way.href}
                    className="flex min-h-11 items-center py-5 font-display text-display-s leading-[1.2] font-medium text-ink transition-colors duration-200 hover:text-gold-text focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                  >
                    {way.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/schedule"
              className="mt-9 inline-flex min-h-12 items-center rounded-sm bg-ink px-7 font-body text-[14px] font-semibold text-ivory transition-colors duration-200 hover:bg-ink-hover focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              Schedule a strategy call
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
