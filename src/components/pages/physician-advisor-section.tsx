const PLANNING_AREAS = [
  {
    heading: "Tax strategy",
    copy:
      "Coordinate income, retirement-plan, charitable, and business-owner decisions with your broader financial strategy and qualified tax professionals.",
  },
  {
    heading: "Wealth management",
    copy:
      "Build and monitor an investment strategy around your goals, cash flow, risk tolerance, and tax situation.",
  },
  {
    heading: "Retirement strategy",
    copy:
      "Plan for the income you will need and connect savings, withdrawals, healthcare costs, taxes, and legacy goals.",
  },
  {
    heading: "Practice and business planning",
    copy:
      "For practice owners and future owners, connect compensation, cash flow, retirement benefits, succession, and exit considerations with personal wealth.",
  },
  {
    heading: "Legacy planning",
    copy:
      "Organize estate-planning conversations, beneficiary reviews, family wealth-transfer goals, charitable giving, and risk management with qualified legal advisors.",
  },
] as const;

export function PhysicianAdvisorSection(): React.JSX.Element {
  return (
    <section data-mega-section="financial-advising" className="bg-ivory">
      <div className="va-shell py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-x-14">
          <div className="relative lg:pr-8">
            <h2 className="max-w-[22ch] font-display text-display-m leading-[1.12] font-medium tracking-[-0.01em] text-balance text-ink">
              Financial advising for physicians, coordinated around your career
            </h2>
          </div>
          <div className="mt-6 lg:mt-1.5">
            <p className="max-w-[68ch] font-body text-body-l leading-[1.68] text-charcoal">
              Physicians make high-stakes decisions about taxes, investments, retirement income, practice ownership, and family wealth at different points in a demanding career. Elite Physician Wealth Planning helps coordinate those decisions through the Elite Physician Wealth Blueprint™, so each planning area supports the others.
            </p>

            <div className="mt-8 max-w-[68ch] border-t border-ink/12">
              {PLANNING_AREAS.map((area) => (
                <div key={area.heading} className="border-b border-ink/12 py-5">
                  <h3 className="font-display text-display-s leading-[1.22] font-medium text-ink">
                    {area.heading}
                  </h3>
                  <p className="mt-2 font-body text-body-m leading-[1.6] text-charcoal">
                    {area.copy}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
