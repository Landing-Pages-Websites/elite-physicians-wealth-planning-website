import { StrategyCallForm } from "@/components/shared/strategy-call-form";
import { BRAND, telHref } from "@/lib/content";

/**
 * Where the closing fork lands. The two paths above merge on the gold route;
 * this is the step that merge leads to, so it sits on the ledger's deep ground
 * rather than introducing a new surface.
 */
export function StrategyCall(): React.JSX.Element {
  return (
    <section
      id="form"
      aria-labelledby="form-heading"
      className="relative overflow-hidden bg-ink"
    >
      {/* The left column was 0.85fr carrying a headline and three lines, which
          left roughly 300px of empty navy under it. It is now sized to its
          content so the form — the only thing on the page a visitor can
          actually complete — takes the width it was giving away. */}
      <div className="relative z-10 va-shell grid gap-12 py-14 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+4rem)] lg:self-start">
          <h2
            id="form-heading"
            className="max-w-[18ch] text-display-m font-display leading-[1.08] font-medium tracking-[-0.02em] text-balance text-ivory"
          >
            Start with a conversation, not a proposal.
          </h2>
          {/* The summary and the "not a product pitch" line are NOT repeated
              here: next-decision renders both about 1,100px above this section,
              and printing them twice read as a template loop rather than
              emphasis. Nothing replaces them — writing a fresh sentence would
              be inventing reader-facing copy for a regulated site, which the
              manifest reserves to the client. The section opens on its
              headline and goes straight to the form. */}
          <dl className="mt-10 grid gap-4 border-t border-ivory/15 pt-8 font-body text-[13px] text-ivory/70">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-ivory/60">Call</dt>
              <dd>
                <a
                  className="-my-2 inline-flex min-h-11 items-center underline underline-offset-4 transition-colors hover:text-gold focus-visible:text-gold"
                  href={telHref()}
                >
                  {BRAND.phone}
                </a>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-ivory/60">Email</dt>
              <dd>
                <a
                  className="-my-2 inline-flex min-h-11 items-center underline underline-offset-4 transition-colors hover:text-gold focus-visible:text-gold"
                  href={`mailto:${BRAND.email}`}
                >
                  {BRAND.email}
                </a>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-ivory/60">Hours</dt>
              <dd>{BRAND.hours}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-sm border border-ivory/15 bg-white/4 p-6 sm:p-8">
          <StrategyCallForm tone="ledger" />
        </div>
      </div>
    </section>
  );
}
