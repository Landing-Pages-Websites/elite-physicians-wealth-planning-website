import Link from "next/link";

const BUYER_QUESTIONS = [
  {
    question: "What does a financial advisor for physicians help with?",
    answer:
      "A physician-focused financial advisor can help coordinate decisions about cash flow, tax strategy, investments, retirement income, practice and business planning, risk protection, and legacy goals. The work is not one-size-fits-all. Priorities may look different for a resident, an established physician, a practice owner, or a physician approaching retirement.",
  },
  {
    question: "When should I start working with a financial advisor?",
    answer:
      "Earlier planning can help you make informed decisions before income, benefits, debt, practice ownership, or retirement transitions accelerate. You do not need every detail organized first. An introductory conversation can help identify the decisions that matter most now and what to revisit as your career changes.",
  },
  {
    question: "How do you tailor planning to my career stage?",
    answer:
      "Planning starts with your career stage, family priorities, compensation and benefits, business interests, and time horizon. It then connects five areas: tax strategy, wealth management, retirement strategy, practice and business planning, and legacy planning. The Elite Physician Wealth Blueprint™ is designed to connect these areas rather than treat them as separate checklists.",
  },
  {
    question: "Do you work with residents, established physicians, and practice owners?",
    answer:
      "Elite Physician Wealth Planning works with physicians from residency and fellowship through established practice, practice ownership, and the transition into retirement. You can begin with the circumstances closest to your own and discuss the priorities that matter most at this stage of your career.",
  },
  {
    question: "How do I choose a financial advisor for physicians?",
    answer:
      "Consider whether the advisor understands physician career stages, explains how planning areas connect, communicates clearly about the relationship, and coordinates with your other qualified professionals. Ask what information is needed, how recommendations are reviewed, and how your plan can change as your career changes.",
  },
  {
    question: "What happens during an introductory call?",
    answer:
      "An introductory call is a confidential conversation about your goals, current planning concerns, and whether working together may fit your needs. You can bring the questions you are weighing; you do not need a perfect financial inventory before reaching out.",
  },
] as const;

export function PhysicianBuyerQuestions(): React.JSX.Element {
  return (
    <section data-mega-section="physician-buyer-questions" className="bg-sand">
      <div className="va-shell py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-x-14">
          <div className="relative lg:pr-8">
            <h2 className="max-w-[22ch] font-display text-display-m leading-[1.12] font-medium tracking-[-0.01em] text-balance text-ink">
              Questions physicians ask before working with a financial advisor
            </h2>
          </div>
          <div className="mt-6 lg:mt-1.5">
            <p className="max-w-[68ch] font-body text-body-l leading-[1.68] text-charcoal">
              Choosing a financial advisor is a meaningful decision. These answers explain how physician-focused planning can fit different career stages and what to expect before you reach out.
            </p>

            <div className="mt-8 max-w-[68ch] border-t border-ink/12">
              {BUYER_QUESTIONS.map((item) => (
                <div key={item.question} className="border-b border-ink/12 py-5">
                  <h3 className="font-display text-display-s leading-[1.22] font-medium text-ink">
                    {item.question}
                  </h3>
                  <p className="mt-2 font-body text-body-m leading-[1.6] text-charcoal">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-[68ch]">
              <Link
                href="/schedule"
                className="inline-flex min-h-11 items-center bg-gold px-6 py-3 font-body text-[14px] font-semibold text-ink transition-colors duration-200 hover:bg-gold/85 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              >
                Schedule a confidential introductory call
              </Link>
              <p className="mt-5 font-body text-body-s leading-[1.6] text-charcoal">
                Educational note: This information is general and is not individualized tax, legal, or investment advice. Consult qualified tax, legal, and financial professionals about your circumstances.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
