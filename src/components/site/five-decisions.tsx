import { FIVE_DECISIONS } from "@/lib/content";

/**
 * The disciplines ledger, built to the approved frame.
 *
 * The frame is a banded table: alternating warm and cool rows, the discipline
 * set in display serif on the left, its sentence on the right, and one gold
 * rule down the column gutter carrying a node on every row. Two gold elbow
 * brackets frame it — one leaving the headline and running off the top edge,
 * one wrapping the disclaimer at the foot.
 *
 * The build had replaced all of it with hairlines and a sticky heading. The
 * reviewer's note was "these disconnected lines look sloppy" — they were
 * disconnected because the brackets they belong to had been removed.
 *
 * Geometry is traced from the gold channel of
 * public/design/a/refs/05-five-decisions.png at its native 1536x864: the table
 * runs x 122-861 (57.4% of the shell) with its gutter rule at x 447, i.e. 44%
 * across the table itself, which is how both are expressed below so they hold
 * at any width. Neither bracket stops inside the frame — the head rail leaves
 * a leader out of the headline's first line and runs off the right edge, and
 * the foot bracket turns at the disclaimer and runs off the left. Drawn short
 * of those edges they read as the stray hairlines the reviewer objected to.
 */
function DisciplineRow({
  discipline,
  index,
}: {
  discipline: (typeof FIVE_DECISIONS.disciplines)[number];
  index: number;
}): React.JSX.Element {
  return (
    <li
      className={`relative grid gap-y-1.5 px-5 py-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)] lg:items-center lg:gap-x-8 lg:gap-y-0 lg:px-4 ${
        index % 2 === 0 ? "bg-ledger-warm" : "bg-ledger-cool"
      }`}
    >
      <h3 className="font-display text-[clamp(1.3rem,2.19vw,2.1rem)] leading-[1.15] font-medium text-ink">
        {discipline.name}
      </h3>
      <p className="font-body text-body-m leading-[1.5] text-pretty text-charcoal lg:max-w-[18rem]">
        {discipline.summary}
      </p>
      {/* The node the gutter rule carries on every row. */}
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-[44%] hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold lg:block"
      />
    </li>
  );
}

export function FiveDecisions(): React.JSX.Element {
  return (
    <section
      data-mega-section="five-decisions"
      id="five-decisions"
      aria-labelledby="five-decisions-heading"
      className="relative overflow-hidden bg-white"
    >
      <div className="va-shell relative z-10 pt-14 pb-16 lg:pt-16 lg:pb-20">
        <p className="font-body text-[11px] font-semibold tracking-[0.22em] text-gold-text uppercase">
          Orientation: {FIVE_DECISIONS.orientation}
        </p>
        <div className="relative">
          <h2
            id="five-decisions-heading"
            className="va-reveal mt-5 max-w-[26ch] text-display-m font-display leading-[1.12] font-medium tracking-[-0.01em] text-balance text-ink"
          >
            {FIVE_DECISIONS.headline}
          </h2>
          {/* Out of the headline's first line: a short leader, up, then off the
              right edge. --lead is that leader's height, so the node, the
              corner and the rail cannot drift apart. */}
          <span
            aria-hidden="true"
            className="absolute top-[-2.2rem] right-[-50vw] left-[39.5%] hidden h-[calc(var(--lead)-0.875rem)] rounded-tl-[20px] border-t-[1.5px] border-l-[1.5px] border-gold [--lead:4.06rem] lg:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-[calc(-2.2rem+var(--lead)-0.875rem)] left-[35.6%] hidden h-3.5 w-[3.9%] rounded-br-[14px] border-r-[1.5px] border-b-[1.5px] border-gold [--lead:4.06rem] lg:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-[calc(-2.2rem+var(--lead))] left-[35.6%] hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold [--lead:4.06rem] lg:block"
          />
        </div>

        <div className="relative mt-4 lg:w-[57.4%] lg:max-w-none">
          {/* One rule down the column gutter, the full height of the table. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-[44%] z-10 hidden w-px bg-gold/80 lg:block"
          />
          <ol>
            {FIVE_DECISIONS.disciplines.map((discipline, index) => (
              <DisciplineRow key={discipline.name} discipline={discipline} index={index} />
            ))}
          </ol>
        </div>

        {/* The foot bracket wraps the disclaimer: in from the table's right
            edge, round the corner, down the left margin, then out off the
            frame. --drop is where that turn happens, shared by both strokes. */}
        <div className="relative mt-3 pt-8 lg:pl-5">
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 hidden h-[var(--drop)] w-[57.4%] rounded-tl-[20px] border-t-[1.5px] border-l-[1.5px] border-gold [--drop:calc(100%+0.8rem)] lg:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-[calc(var(--drop)-0.25rem)] right-[calc(100%-1.5px)] hidden h-5 w-[50vw] rounded-br-[20px] border-r-[1.5px] border-b-[1.5px] border-gold [--drop:calc(100%+0.8rem)] lg:block"
          />
          <p className="relative max-w-[35.5rem] font-body text-body-m leading-[1.6] text-charcoal">
            {FIVE_DECISIONS.boundaryNote}
          </p>
        </div>
      </div>
    </section>
  );
}
