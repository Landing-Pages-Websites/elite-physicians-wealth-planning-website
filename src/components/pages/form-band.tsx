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
}: {
  id: string;
  heading: string;
  note: string;
  intent: string;
}): React.JSX.Element {
  return (
    <section id={id} className="bg-ink">
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
              <div className="flex gap-6 border-b border-ivory/15 py-3.5">
                <dt className="w-24 shrink-0 font-body text-[12px] tracking-[0.14em] text-mist/50 uppercase">
                  Office
                </dt>
                <dd className="font-body text-body-m text-mist/85">
                  <a
                    href={telHref(BRAND.phone)}
                    className="underline-offset-4 transition-colors duration-200 hover:text-gold hover:underline"
                  >
                    {BRAND.phone}
                  </a>
                </dd>
              </div>
              <div className="flex gap-6 border-b border-ivory/15 py-3.5">
                <dt className="w-24 shrink-0 font-body text-[12px] tracking-[0.14em] text-mist/50 uppercase">
                  Email
                </dt>
                <dd className="font-body text-body-m break-all text-mist/85">
                  <a
                    href={`mailto:${BRAND.email}`}
                    className="underline-offset-4 transition-colors duration-200 hover:text-gold hover:underline"
                  >
                    {BRAND.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-6 border-b border-ivory/15 py-3.5">
                <dt className="w-24 shrink-0 font-body text-[12px] tracking-[0.14em] text-mist/50 uppercase">
                  Hours
                </dt>
                <dd className="font-body text-body-m text-mist/85">{BRAND.hours}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-10 lg:mt-0">
            <StrategyCallForm tone="ledger" intent={intent} />
          </div>
        </div>
      </div>
    </section>
  );
}
