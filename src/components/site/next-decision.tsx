import { BRAND, LINKS, NEXT_DECISION } from "@/lib/content";
import {
  ArrowRightIcon,
  CalendarClockIcon,
  FileLockIcon,
  InfoIcon,
  MailIcon,
  MessageIcon,
} from "./icons";

/**
 * The closing fork, built to the approved frame.
 *
 * The frame draws one gold route: out of each ringed icon at the top of its
 * column, inward, down the diagonals to a junction on the centre line, straight
 * down, and out along an inverted bracket that lifts into the foot of both
 * actions. Both actions are gold fills. Under them, a ringed mail mark, a ruled
 * divider with a node, the wordmark and the disclaimer.
 *
 * Geometry measured from public/design/a/refs/08-next-decision.png at its
 * native 1536x864.
 */
function ForkRoute(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 1536 864"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] hidden h-full w-full lg:block"
      fill="none"
    >
      <g
        stroke="var(--color-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M422 243 H668 L767 345" vectorEffect="non-scaling-stroke" />
        <path d="M1117 243 H866 L767 345" vectorEffect="non-scaling-stroke" />
        <path d="M767 345 V683" vectorEffect="non-scaling-stroke" />
        <path d="M386 660 V671 Q386 683 398 683 H1118 Q1130 683 1130 671 V660" vectorEffect="non-scaling-stroke" />
      </g>
      <circle cx="422" cy="243" r="6" fill="var(--color-gold)" />
      <circle cx="1117" cy="243" r="6" fill="var(--color-gold)" />
      <circle cx="767" cy="683" r="7" fill="var(--color-gold)" />
    </svg>
  );
}

/** A gold ring holding the path's mark, as the frame draws it. */
function PathRing({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="flex h-[5.5cqw] w-[5.5cqw] items-center justify-center rounded-full border border-gold text-gold">
      {children}
    </span>
  );
}

/** The frame's rule under each path heading: a hairline with a node on it. */
function NodeDivider(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="relative mt-[1.4cqw] block h-px w-full bg-gold/55">
      <span className="absolute top-1/2 left-1/2 block h-[0.55cqw] w-[0.55cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold" />
    </span>
  );
}

function GoldAction({
  href,
  label,
  cta,
  compact,
}: {
  href: string;
  label: string;
  /** Stable `data-mega-cta` label; the visible label is page copy. */
  cta: string;
  compact?: true;
}): React.JSX.Element {
  return (
    <a
      data-mega-cta={cta}
      href={href}
      className={`group inline-flex items-center justify-center gap-3 rounded-sm bg-gold font-semibold tracking-[0.08em] text-ink uppercase transition-colors duration-200 hover:bg-gold-hover ${
        compact ? "min-h-12 w-full px-6 text-[13px]" : "w-full px-[1.4cqw] py-[1.15cqw] text-[0.86cqw] whitespace-nowrap"
      }`}
    >
      {label}
      <ArrowRightIcon
        className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
          compact ? "h-4 w-4" : "h-[1cqw] w-[1cqw]"
        }`}
      />
    </a>
  );
}

function ClosingIdentity({ compact }: { compact?: true }): React.JSX.Element {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "gap-3" : "gap-[1cqw]"}`}>
      <a
        href={`mailto:${NEXT_DECISION.contact}`}
        className={`inline-flex items-center transition-colors duration-200 hover:text-gold ${
          compact ? "min-h-11 gap-3 text-body-s text-mist" : "gap-[1cqw] text-[1.05cqw] text-mist"
        }`}
      >
        <span
          className={`flex items-center justify-center rounded-full border border-gold text-gold ${
            compact ? "h-9 w-9" : "h-[2.9cqw] w-[2.9cqw]"
          }`}
        >
          <MailIcon className={compact ? "h-4 w-4" : "h-[1.1cqw] w-[1.1cqw]"} />
        </span>
        {NEXT_DECISION.contact}
      </a>
      <span
        aria-hidden="true"
        className={`relative block h-px bg-gold/55 ${compact ? "w-40" : "w-[31%]"}`}
      >
        <span className="absolute top-1/2 left-1/2 block h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold" />
      </span>
      <p
        className={`font-display font-medium text-gold ${
          compact ? "text-base" : "text-[1.35cqw]"
        }`}
      >
        {NEXT_DECISION.identityLine}
      </p>
      <p className={`text-mist/65 ${compact ? "text-[11px]" : "font-body text-[0.82cqw]"}`}>
        {NEXT_DECISION.disclaimer}
      </p>
      <p className="sr-only">{BRAND.phone}</p>
    </div>
  );
}

export function NextDecision(): React.JSX.Element {
  const { strategyCall, guide, headline } = NEXT_DECISION;
  return (
    <section
      data-mega-section="next-decision"
      id="next-decision"
      aria-labelledby="next-decision-heading"
      className="va-decision relative overflow-hidden text-ivory"
    >
      <ForkRoute />

      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative z-10 hidden aspect-1536/864 w-full lg:block">
        <h2
          id="next-decision-heading"
          // 24ch, then 21ch, both fit "Choose the next step that" on line 1.
          // The frame breaks after "step"; 18ch is inside the 17-21ch window
          // that forces it without breaking earlier, after "next".
          className="va-reveal absolute top-[6.5%] right-0 left-0 mx-auto max-w-[18ch] text-center font-display text-[4.05cqw] leading-[1.1] font-medium tracking-[-0.02em] text-ivory-bright"
        >
          {headline}
        </h2>

        {/* Left path. */}
        <div className="absolute top-[24.5%] left-[15.4%] w-[20.6%]">
          <PathRing>
            <CalendarClockIcon className="h-[2.2cqw] w-[2.2cqw]" />
          </PathRing>
          {/* The frame centres both path headings over their column, with the
              gold dot on the rule below landing under the heading's centre.
              Left-aligned, the heading and the dot sat on two different axes. */}
          <h3 className="mx-auto mt-[1.5cqw] max-w-[11ch] text-center font-display text-[2.2cqw] leading-[1.15] font-medium text-ivory-bright">
            {strategyCall.label}
          </h3>
          <NodeDivider />
          <p className="mt-[1.3cqw] font-body text-[0.95cqw] leading-[1.55] text-mist/85">
            {strategyCall.summary}
          </p>
          <p className="mt-[1.4cqw] flex items-start gap-[0.9cqw] font-body text-[0.95cqw] leading-[1.45] text-gold">
            <span className="flex h-[2.2cqw] w-[2.2cqw] shrink-0 items-center justify-center rounded-full border border-gold/70">
              <MessageIcon className="h-[1cqw] w-[1cqw]" />
            </span>
            {strategyCall.expectation}
          </p>
          <div className="mt-[2cqw]">
            <GoldAction cta="schedule-strategy-call" href={LINKS.scheduleOnsite} label={strategyCall.label} />
          </div>
        </div>

        {/* Right path. */}
        <div className="absolute top-[24.5%] left-[56.6%] w-[25.7%]">
          <span className="flex justify-end">
            <PathRing>
              <FileLockIcon className="h-[2.2cqw] w-[2.2cqw]" />
            </PathRing>
          </span>
          <h3 className="mt-[1.5cqw] text-center font-display text-[2.2cqw] leading-[1.15] font-medium text-ivory-bright">
            {guide.label}
          </h3>
          <NodeDivider />
          <p className="mt-[1.3cqw] font-body text-[0.95cqw] leading-[1.55] text-mist/85">
            {guide.summary}
          </p>
          {/* The frame reserves a dashed "GUIDE COVER PLACEHOLDER / FINAL FILE
              REQUIRED" slot here and sets a build instruction beside it. Both
              are documentation for us, not copy for a visitor; the note keeps
              the frame's ringed mark and gold lead-in, and says the same thing
              in the reader's terms. The instruction stays in content.ts and in
              build/CLIENT-GAPS.md. */}
          <p className="mt-[1.4cqw] flex items-start gap-[0.9cqw] font-body text-[0.95cqw] leading-[1.45] text-mist/85">
            <span className="flex h-[2.2cqw] w-[2.2cqw] shrink-0 items-center justify-center rounded-full border border-gold/70 text-gold">
              <InfoIcon className="h-[1cqw] w-[1cqw]" />
            </span>
            <span>
              <strong className="font-semibold text-gold">Guide availability: </strong>
              {guide.requestNote}
            </span>
          </p>
          <div className="mt-[2cqw] flex justify-end">
            <span className="w-[63%]">
              <GoldAction cta="request-guide" href={LINKS.guideRequest} label={guide.cta} />
            </span>
          </div>
        </div>

        <div className="absolute right-0 bottom-[3%] left-0">
          <ClosingIdentity />
        </div>
      </div>

      {/* Below the canvas the fork cannot hold, so the two paths stack. */}
      <div className="va-shell relative z-10 py-16 lg:hidden">
        <h2 className="text-center font-display text-display-l leading-[1.1] font-medium tracking-[-0.02em] text-balance text-ivory-bright">
          {headline}
        </h2>
        <div className="mt-10 grid gap-10">
          <div>
            <h3 className="font-display text-display-s leading-[1.15] font-medium text-ivory-bright">
              {strategyCall.label}
            </h3>
            <span aria-hidden="true" className="mt-4 block h-px w-full bg-gold/55" />
            <p className="mt-4 font-body text-body-s leading-[1.55] text-mist/85">
              {strategyCall.summary}
            </p>
            <p className="mt-4 font-body text-body-s leading-[1.45] text-gold">
              {strategyCall.expectation}
            </p>
            <div className="mt-6">
              <GoldAction compact cta="schedule-strategy-call" href={LINKS.scheduleOnsite} label={strategyCall.label} />
            </div>
          </div>
          <div>
            <h3 className="font-display text-display-s leading-[1.15] font-medium text-ivory-bright">
              {guide.label}
            </h3>
            <span aria-hidden="true" className="mt-4 block h-px w-full bg-gold/55" />
            <p className="mt-4 font-body text-body-s leading-[1.55] text-mist/85">
              {guide.summary}
            </p>
            <p className="mt-4 font-body text-body-s leading-[1.45] text-mist/85">
              <strong className="font-semibold text-gold">Guide availability: </strong>
              {guide.requestNote}
            </p>
            <div className="mt-6">
              <GoldAction compact cta="request-guide" href={LINKS.guideRequest} label={guide.cta} />
            </div>
          </div>
        </div>
        <div className="mt-12">
          <ClosingIdentity compact />
        </div>
      </div>
    </section>
  );
}
