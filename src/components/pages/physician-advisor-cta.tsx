import Link from "next/link";

export function PhysicianAdvisorCta(): React.JSX.Element {
  return (
    <section data-mega-section="financial-advising-cta" className="bg-ivory">
      <div className="va-shell py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-x-14">
          <div className="relative lg:pr-8" />
          <div className="mt-6 lg:mt-1.5">
            <div className="max-w-[68ch] border-t border-ink/12 pt-8">
              <h3 className="font-display text-display-s leading-[1.22] font-medium text-ink">
                Ready to discuss your planning priorities?
              </h3>
              <p className="mt-2 font-body text-body-m leading-[1.6] text-charcoal">
                Schedule a confidential introductory call to discuss your goals, current planning concerns, and whether Elite Physician Wealth Planning™ may be a fit for your needs.
              </p>
              <Link
                href="/schedule"
                className="mt-6 inline-flex min-h-11 items-center bg-gold px-6 py-3 font-body text-[14px] font-semibold text-ink transition-colors duration-200 hover:bg-gold/85 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              >
                Schedule a strategy call
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
