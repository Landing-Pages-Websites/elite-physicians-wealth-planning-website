import Image from "next/image";
import { BLUEPRINT, LINKS } from "@/lib/content";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClipboardIcon,
  CompassIcon,
  MagnifierIcon,
  NodesIcon,
  TrendingUpIcon,
} from "./icons";

type StepIcon = (props: { className?: string }) => React.JSX.Element;

/**
 * The blueprint rounds, built to the approved frame.
 *
 * The frame steps the six phases in a ZIGZAG — 01, 03 and 05 above the route,
 * 02, 04 and 06 below it — threaded by one gold line that enters at the left
 * edge, rises and falls onto each medallion in turn, and leaves under an arrow
 * at the right. Every medallion is a navy disc with a gold ring and a gold mark;
 * its number is the largest thing in the group, in display serif. The desk
 * still-life bleeds off the top-right corner rather than sitting in a frame.
 *
 * The build had flattened the run onto a single horizontal line with the
 * photograph boxed beside the headline. Positions below are measured from
 * public/design/a/refs/04-blueprint-rounds.png at its native 1536x864.
 *
 * The frame's own still-life carries three fabricated book titles and a
 * handwritten list misspelling "Tax Efficency"; the generated plate replaces it
 * and contains no lettering at all.
 */
type Step = {
  Icon: StepIcon;
  /** Medallion centre, percentages of the frame. */
  cx: number;
  cy: number;
  /** Above the route or below it. */
  above: boolean;
};

const STEPS: readonly Step[] = [
  { Icon: CompassIcon, cx: 8.5, cy: 55.6, above: true },
  { Icon: MagnifierIcon, cx: 25.7, cy: 74.7, above: false },
  { Icon: NodesIcon, cx: 37, cy: 54.4, above: true },
  { Icon: ClipboardIcon, cx: 52.9, cy: 75, above: false },
  { Icon: TrendingUpIcon, cx: 66.4, cy: 51.3, above: true },
  { Icon: CalendarIcon, cx: 82.8, cy: 73, above: false },
] as const;

/** One gold line, rising and falling onto every medallion in turn. */
function ProcessRoute(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 1536 864"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
    >
      <g stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M0 716 H92 Q130 716 130 678 V510
             M130 510 V546 Q130 584 168 584 H356 Q394 584 394 622 V646
             M394 646 V612 Q394 574 432 574 H530 Q568 574 568 536 V500
             M568 500 V536 Q568 574 606 574 H774 Q812 574 812 612 V648
             M812 648 V614 Q812 576 850 576 H982 Q1020 576 1020 538 V472
             M1020 472 V510 Q1020 548 1058 548 H1234 Q1272 548 1272 586 V630
             M1272 630 V690 Q1272 728 1310 728 H1490"
          vectorEffect="non-scaling-stroke"
        />
        <path d="M1478 716 L1492 728 L1478 740" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

function StepGroup({ step, index }: { step: Step; index: number }): React.JSX.Element {
  const phase = BLUEPRINT.phases[index];
  const { Icon } = step;
  return (
    <li
      className="absolute flex w-[15.5%] items-start gap-[0.9cqw]"
      style={{
        left: `${step.cx}%`,
        top: `${step.cy}%`,
        transform: "translate(-1.9cqw, -1.9cqw)",
      }}
    >
      <span className="va-medallion flex h-[3.8cqw] w-[3.8cqw] shrink-0 items-center justify-center rounded-full">
        <Icon className="h-[1.7cqw] w-[1.7cqw] text-gold" />
      </span>
      <div className="pt-[0.2cqw]">
        {/* Cormorant Garamond defaults to oldstyle figures, so "01" set an
            x-height zero beside a serifed one and read as "OI". */}
        <p className="font-display text-[2.05cqw] leading-none font-medium text-gold lining-nums">
          {phase.number}
        </p>
        <h3 className="mt-[0.35cqw] font-display text-[1.35cqw] leading-none font-medium text-ink">
          {phase.name}
        </h3>
        <p className="mt-[0.6cqw] font-body text-[0.78cqw] leading-[1.45] text-charcoal">
          {phase.summary}
        </p>
      </div>
    </li>
  );
}

function ProcessCta({ className }: { className?: string }): React.JSX.Element {
  return (
    <a href={LINKS.processOnsite} className={`va-btn va-btn-navy ${className ?? ""}`}>
      {BLUEPRINT.cta}
      <ArrowRightIcon className="h-5 w-5 text-gold" />
    </a>
  );
}

/* The id lives on the DESKTOP render only. This component is called twice —
   once for the canvas and once for the lg:hidden stack — so an id written
   inside it appeared twice in the document and every aria-labelledby
   pointing at it resolved to nothing. */
function Intro({ compact, headingId }: { compact?: true; headingId?: string }): React.JSX.Element {
  return (
    <>
      <p
        className={`font-body font-semibold tracking-[0.2em] text-gold-text uppercase ${
          compact ? "text-[11px]" : "text-[0.82cqw]"
        }`}
      >
        {BLUEPRINT.orientation}
      </p>
      <h2
        id={headingId}
        className={`va-reveal font-display leading-[1.14] font-medium tracking-[-0.01em] text-ink ${
          compact ? "mt-5 text-display-m text-balance" : "mt-[1.3cqw] max-w-[34ch] text-[3.9cqw]"
        }`}
      >
        {BLUEPRINT.headline}
      </h2>
      <p
        className={`font-body leading-[1.55] text-charcoal ${
          compact ? "mt-5 text-body-m" : "mt-[1.5cqw] max-w-[52ch] text-[0.95cqw]"
        }`}
      >
        {BLUEPRINT.body}
      </p>
    </>
  );
}

export function BlueprintRounds(): React.JSX.Element {
  return (
    <section
      id="blueprint-rounds"
      aria-labelledby="blueprint-rounds-heading"
      className="va-blueprint relative overflow-hidden"
    >
      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        {/* The still-life bleeds off the top-right corner. */}
        <div className="absolute top-0 right-0 h-[48.6%] w-[47.9%]">
          <Image
            src="/images/design/a/04-blueprint-rounds/desk-still-life.jpg"
            alt=""
            fill
            sizes="48vw"
            className="object-cover"
            style={{ objectPosition: "62% 46%" }}
          />
          {/* Feathered into the field so the plate has no hard corner seam. */}
          <span
            aria-hidden="true"
            className="va-blueprint-feather pointer-events-none absolute inset-0"
          />
        </div>

        <ProcessRoute />

        <div className="absolute top-[16%] left-[4.9%] w-[46%]">
          <Intro headingId="blueprint-rounds-heading" />
        </div>

        <ol>
          {STEPS.map((step, index) => (
            <StepGroup key={BLUEPRINT.phases[index].number} step={step} index={index} />
          ))}
        </ol>

        <ProcessCta className="absolute top-[88%] left-[40.9%]" />
      </div>

      {/* Below the canvas the zigzag cannot hold, so the run stands up. */}
      <div className="va-shell py-14 lg:hidden">
        <Intro compact />
        <ol className="mt-10 flex flex-col">
          {STEPS.map((step, index) => {
            const phase = BLUEPRINT.phases[index];
            const { Icon } = step;
            return (
              <li key={phase.number} className="relative pb-8 last:pb-0">
                {index < STEPS.length - 1 && (
                  <span aria-hidden="true" className="absolute top-16 bottom-0 left-7 w-[2px] bg-gold/70" />
                )}
                <div className="flex items-start gap-4">
                  <span className="va-medallion flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                    <Icon className="h-6 w-6 text-gold" />
                  </span>
                  <div>
                    <p className="font-display text-[1.6rem] leading-none font-medium text-gold">
                      {phase.number}
                    </p>
                    <h3 className="mt-1 font-display text-xl leading-none font-medium text-ink">
                      {phase.name}
                    </h3>
                    <p className="mt-2 font-body text-body-s leading-[1.5] text-charcoal">
                      {phase.summary}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <ProcessCta className="mt-10" />
      </div>
    </section>
  );
}
