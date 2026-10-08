/**
 * The client's compliance language for one page: the blueprint's per-service
 * disclosure notes, and the lending and insurance disclosures from the practice
 * pages' handoff. The blueprint asks for these "near the related claim or
 * action", so they sit directly under the page's closing action rather than in
 * the site footer, set small but at full contrast — fine print that fails AA is
 * fine print nobody can be held to.
 */
export function PageDisclosure({ lines }: { lines: readonly string[] }): React.JSX.Element {
  return (
    <section aria-labelledby="page-disclosure" className="border-t border-ink/10 bg-ivory">
      <div className="va-shell py-8 lg:py-10">
        <h2
          id="page-disclosure"
          className="font-body text-[11px] font-semibold tracking-[0.24em] text-gold-text uppercase"
        >
          Important disclosure
        </h2>
        {lines.map((line) => (
          <p
            key={line}
            className="mt-3 max-w-[96ch] font-body text-[13px] leading-[1.65] text-charcoal"
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
