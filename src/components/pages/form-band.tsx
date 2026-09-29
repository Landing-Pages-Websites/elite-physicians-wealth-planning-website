import { StrategyCallForm } from "@/components/shared/strategy-call-form";
import { BRAND, telHref } from "@/lib/content";

/**
 * The lead-capture band for /schedule, /contact, /consultation and the gated
 * guide. It reuses the homepage's form rather than growing a second one — two
 * implementations drift the moment either is edited, and this one already
 * carries the repo's auto-fail floors (validate-first off a `type="button"`,
 * `requestSubmit()`, the manual dataLayer push).
 *
 * `note` is where each page states, in the client's own terms, what actually
 * happens after submit. It is a required prop on purpose: a form that accepts
 * input and leaves the visitor guessing is the failure this band exists to
 * avoid, and every caller has to answer it.
 *
 * Contact details come from the manifest brand, not the source site — the
 * hard rule names the reference-site email as incorrect, and no street address
 * appears anywhere until White Plains versus Waldorf is resolved.
 */
export function FormBand({
  id,
  heading,
  note,
  intent,
  submitLabel,
  fineprint,
}: {
  id: string;
  heading: string;
  note: string;
  intent: string;
  /** What this form's button does. Four pages share the form; three of them
      are not requesting a strategy call. */
  submitLabel?: string;
  /** The source's own fine print for this form, hoisted from the body. */
  fineprint?: readonly string[];
}): React.JSX.Element {
  return (
    <section data-dark-band id={id} className="bg-ink">
      <div className="va-shell py-14 lg:py-20">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:gap-x-16">
          <div>
            <h2 className="max-w-[20ch] font-display text-display-m leading-[1.1] font-medium tracking-[-0.01em] text-ivory-bright">
              {heading}
            </h2>
            <p className="mt-5 max-w-[46ch] font-body text-body-m leading-[1.65] text-mist/75">
              {note}
            </p>

            <dl className="mt-9 border-t border-ivory/15">
              <div className="border-b border-ivory/15 py-3.5 sm:flex sm:gap-6">
                <dt className="font-body text-[12px] tracking-[0.14em] text-mist/50 uppercase sm:w-24 sm:shrink-0">
                  Office
                </dt>
                <dd className="mt-1 font-body text-body-m text-mist/85 sm:mt-0">
                  <a
                    href={telHref(BRAND.phone)}
                    className="underline-offset-4 transition-colors duration-200 hover:text-gold hover:underline"
                  >
                    {BRAND.phone}
                  </a>
                </dd>
              </div>
              <div className="border-b border-ivory/15 py-3.5 sm:flex sm:gap-6">
                <dt className="font-body text-[12px] tracking-[0.14em] text-mist/50 uppercase sm:w-24 sm:shrink-0">
                  Email
                </dt>
                <dd className="mt-1 font-body text-body-m break-all text-mist/85 sm:mt-0">
                  <a
                    href={`mailto:${BRAND.email}`}
                    className="underline-offset-4 transition-colors duration-200 hover:text-gold hover:underline"
                  >
                    {BRAND.email}
                  </a>
                </dd>
              </div>
              <div className="border-b border-ivory/15 py-3.5 sm:flex sm:gap-6">
                <dt className="font-body text-[12px] tracking-[0.14em] text-mist/50 uppercase sm:w-24 sm:shrink-0">
                  Hours
                </dt>
                <dd className="mt-1 font-body text-body-m text-mist/85 sm:mt-0">{BRAND.hours}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-10 lg:mt-0">
            <StrategyCallForm tone="ledger" intent={intent} submitLabel={submitLabel} />
            {fineprint?.length ? (
              <div className="mt-6 border-t border-ivory/15 pt-5">
                {fineprint.map((line) => (
                  <p
                    key={line}
                    className="font-body text-[12px] leading-[1.6] text-mist/55 not-first:mt-2"
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
