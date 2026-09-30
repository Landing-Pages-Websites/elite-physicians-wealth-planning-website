import type { Metadata } from "next";
import { PageCta } from "@/components/pages/page-cta";
import { PageHero } from "@/components/pages/page-hero";
import { heroImageFor } from "@/lib/hero-images";
import { bodySections, ctaSection, getPage } from "@/lib/pages";

const ROUTE = "/insights";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Educational writing for physicians and medical practice owners: ideas, checklists, and frameworks — not individualized advice.",
  alternates: { canonical: ROUTE },
};

/**
 * A contents page, and deliberately not twelve links.
 *
 * The source site publishes twelve article URLs. All twelve are unwritten: each
 * carries `Published: [Pending]` and `Reviewer: [Pending]` in its own markup,
 * and all twelve share one identical body paragraph ("This article will walk
 * through the framework…"). Shipping them would put twelve near-duplicate thin
 * pages on a brand-new domain in a regulated vertical — the exact pattern that
 * cost a previous build its index — and writing them here would mean authoring
 * regulated content whose own source marks the review as outstanding.
 *
 * So the titles and summaries ship (they are real, and they are the client's),
 * the articles do not, and nothing links to a route that would 404. The twelve
 * are listed in build/CLIENT-GAPS.md against the reviewer the source is waiting
 * on. This page becomes a normal index the moment the copy arrives.
 */
export default function InsightsPage(): React.JSX.Element {
  const page = getPage(ROUTE);
  const entries = bodySections(page);
  const cta = ctaSection(page);

  return (
    <main id="main">
      <PageHero
        page={page}
        image={heroImageFor(ROUTE)}
        trail={[
          { href: "/", label: "Home" },
          { href: ROUTE, label: "Insights" },
        ]}
      />

      <section className="bg-ivory">
        <div className="va-shell py-12 lg:py-16">
          <p className="font-body text-[11px] font-semibold tracking-[0.24em] text-gold-text uppercase">
            Planned for publication
          </p>
          <p className="mt-3 max-w-[64ch] font-body text-body-m leading-[1.65] text-charcoal">
            These are the pieces in preparation. Each is published only once it has been
            through review, so the list below is a table of contents rather than a set of
            links.
          </p>

          <ul className="va-stagger mt-8 border-t border-ink/12">
            {entries.map((entry) => (
              <li key={entry.heading ?? ""} className="border-b border-ink/12 py-6">
                {entry.eyebrow ? (
                  <p className="mb-1.5 font-body text-[11px] font-semibold tracking-[0.18em] text-gold-text uppercase">
                    {entry.eyebrow}
                  </p>
                ) : null}
                <h2 className="max-w-[46ch] font-display text-display-s leading-[1.22] font-medium text-ink">
                  {entry.heading}
                </h2>
                {entry.paras.slice(0, 1).map((para) => (
                  <p
                    key={para}
                    className="mt-2.5 max-w-[66ch] font-body text-body-m leading-[1.6] text-charcoal"
                  >
                    {para}
                  </p>
                ))}
                <p className="mt-3 font-body text-[11px] tracking-[0.18em] text-charcoal/55 uppercase">
                  In preparation
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {cta ? <PageCta section={cta} /> : null}
    </main>
  );
}
