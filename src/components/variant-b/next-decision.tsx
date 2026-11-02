import { LINKS, NEXT_DECISION, BRAND } from "@/lib/content";
import GoldArrow from "./gold-arrow";
import { RegistrationCross, TargetRosette, TickRail } from "./instrument";

const SUBHEAD = "Two calibrated paths. One clear decision.";

/**
 * The closing fork, rebuilt to the approved frame.
 *
 * The frame draws this as an instrument plate: rosettes on every corner and
 * edge midpoint, tick rails inset from both sides, a dotted fork from a gold
 * node down onto each card's top edge, an annotation hanging under each card on
 * its own dotted stem, and a ruled footer. The build had two plain cards on
 * navy — the reviewer's note was "the styling is missing here, so it looks very
 * simple; we want these sites to look like they are intentionally designed."
 *
 * Coordinates are percentages of the frame's 1536x864.
 */
function ForkSplit(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 1536 130"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute top-[26.5%] left-0 h-[15%] w-full"
      fill="none"
    >
      <g stroke="currentColor" className="text-white/60" strokeDasharray="2 6" strokeWidth="1.5">
        <path d="M767 34 C767 84 408 62 408 96" vectorEffect="non-scaling-stroke" />
        <path d="M767 34 C767 84 1095 64 1095 100" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/** Gold ring on a navy ground — the frame's junction mark. */
function ForkNode({
  left,
  top,
  large,
}: {
  left: number;
  top: number;
  large?: true;
}): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 bg-gold ${
        large ? "h-[1.5cqw] w-[1.5cqw]" : "h-[1.05cqw] w-[1.05cqw]"
      }`}
      style={{ left: `${left}%`, top: `${top}%` }}
    />
  );
}

/** A dotted stem from a card's foot down to a small rosette. */
function AnnotationStem({ left, top }: { left: number; top: number }): React.JSX.Element {
  return (
    <span aria-hidden="true" className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
      <span className="vb-stem block h-[2.6cqw] w-px -translate-x-1/2" />
      <TargetRosette className="h-[1.35cqw] w-[1.35cqw] -translate-x-1/2 text-white" />
    </span>
  );
}

function PathCard({
  title,
  body,
  emphasis,
  action,
  compact,
  className,
}: {
  title: string;
  body: string;
  emphasis?: string;
  action: React.ReactNode;
  /** Outside the desktop canvas there is no container, so cqw cannot be used. */
  compact?: true;
  className: string;
}): React.JSX.Element {
  const t = compact
    ? { pad: "px-6 py-6", title: "text-xl", gap: "mt-3", body: "text-body-s", act: "mt-6" }
    : {
        // 2.2cqw left the right card's title ~2px short of one line, stranding
        // "Guide" alone where the frame sets the whole title on one.
        pad: "px-[1.7cqw] py-[1.9cqw]",
        title: "text-[1.42cqw]",
        gap: "mt-[0.7cqw]",
        body: "text-[0.95cqw]",
        act: "mt-[1.3cqw]",
      };
  return (
    <article className={`rounded-[6px] bg-atlas-card ${t.pad} ${className}`}>
      <h3 className={`${t.title} leading-tight font-bold text-ink`}>{title}</h3>
      <span aria-hidden="true" className={`${t.gap} flex w-[60%] items-center`}>
        <span className="h-[2px] w-3 bg-gold" />
        <span className="h-px flex-1 bg-ink/35" />
      </span>
      <p className={`${compact ? "mt-4" : "mt-[1.1cqw]"} font-body ${t.body} leading-[1.6] text-charcoal`}>
        {body}
      </p>
      {emphasis ? (
        <p
          className={`${compact ? "mt-4 pt-4" : "mt-[1.1cqw] pt-[1.1cqw]"} border-t border-ink/15 font-body ${t.body} font-bold text-ink`}
        >
          {emphasis}
        </p>
      ) : null}
      <div className={t.act}>{action}</div>
    </article>
  );
}

function CardAction({
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
      className={`group flex w-full items-center justify-center gap-3 rounded-[3px] bg-ink font-bold text-white transition-colors duration-200 hover:bg-ink-hover ${
        compact ? "min-h-12 px-6 text-sm" : "px-[1.6cqw] py-[1cqw] text-[1.02cqw]"
      }`}
    >
      {label}
      <GoldArrow
        className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
          compact ? "h-4 w-4" : "h-[0.95cqw] w-[0.95cqw]"
        }`}
      />
    </a>
  );
}

function Perimeter(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-white/55">
      <TargetRosette className="absolute top-[2.4%] left-[1.6%] h-[1.9cqw] w-[1.9cqw]" />
      <TargetRosette className="absolute top-[2.4%] right-[1.6%] h-[1.9cqw] w-[1.9cqw]" />
      <TargetRosette className="absolute bottom-[2.4%] left-[1.6%] h-[1.9cqw] w-[1.9cqw]" />
      <TargetRosette className="absolute right-[1.6%] bottom-[2.4%] h-[1.9cqw] w-[1.9cqw]" />
      <TargetRosette className="absolute top-[47%] left-[1.6%] h-[1.9cqw] w-[1.9cqw]" />
      <TargetRosette className="absolute top-[47%] right-[1.6%] h-[1.9cqw] w-[1.9cqw]" />
      <TargetRosette className="absolute top-[2.4%] left-1/2 h-[1.9cqw] w-[1.9cqw] -translate-x-1/2" />
      <TargetRosette className="absolute bottom-[2.4%] left-1/2 h-[1.9cqw] w-[1.9cqw] -translate-x-1/2" />
      <TickRail ticks={20} className="absolute top-[10%] bottom-[10%] left-[2.4%] !text-white/60" />
      <TickRail ticks={20} className="absolute top-[10%] right-[2.4%] bottom-[10%] !text-white/60" />
      <RegistrationCross className="absolute top-[3.2%] left-[6%] h-[0.8cqw] w-[0.8cqw]" />
      <RegistrationCross className="absolute top-[3.2%] right-[6%] h-[0.8cqw] w-[0.8cqw]" />
      <RegistrationCross className="absolute bottom-[3.2%] left-[6%] h-[0.8cqw] w-[0.8cqw]" />
      <RegistrationCross className="absolute right-[6%] bottom-[3.2%] h-[0.8cqw] w-[0.8cqw]" />
    </div>
  );
}

function ClosingFooter({ compact }: { compact?: true }): React.JSX.Element {
  const size = compact ? "text-body-s" : "text-[0.88cqw]";
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-8 gap-y-3 font-body ${size} text-white/80 ${
        compact ? "" : "px-[1cqw]"
      }`}
    >
      <a
        href={`mailto:${NEXT_DECISION.contact}`}
        className="inline-flex min-h-11 items-center gap-3 transition-colors hover:text-gold"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="h-4 w-4 shrink-0 text-white/60">
          <rect x="2" y="5" width="20" height="14" rx="1" />
          <path d="m2 7 10 7 10-7" />
        </svg>
        {NEXT_DECISION.contact}
      </a>
      <p className="font-semibold">{NEXT_DECISION.identityLine}</p>
      <p className="max-w-[34ch] text-white/65">
        <strong className="font-semibold text-white/85">Educational information only.</strong>{" "}
        {NEXT_DECISION.disclaimer.replace("Educational information only.", "").trim()}
      </p>
      <p className="sr-only">{BRAND.phone}</p>
    </div>
  );
}

export default function NextDecision(): React.JSX.Element {
  const { strategyCall, guide, headline } = NEXT_DECISION;
  return (
    <section
      data-mega-section="next-decision"
      id="next-decision"
      aria-labelledby="next-decision-heading"
      className="relative overflow-hidden bg-ink-deep"
    >
      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        <Perimeter />

        <div className="absolute top-[7.5%] right-0 left-0 text-center">
          <h2
            id="next-decision-heading"
            className="mx-auto max-w-[17ch] text-[3.55cqw] leading-[1.12] font-bold tracking-[-0.02em] text-white"
          >
            {headline}
          </h2>
          <p className="mt-[1.1cqw] font-display text-[0.85cqw] tracking-[0.22em] text-white/85 uppercase">
            {SUBHEAD}
          </p>
        </div>

        <ForkSplit />
        <ForkNode left={49.9} top={28.8} large />
        <ForkNode left={26.6} top={34.95} />
        <ForkNode left={71.3} top={35.3} />

        <PathCard
          className="absolute top-[34.95%] left-[8.66%] w-[37.4%]"
          title={strategyCall.label}
          body={strategyCall.summary}
          emphasis={strategyCall.expectation}
          action={<CardAction cta="schedule-strategy-call" href={LINKS.schedule} label={strategyCall.label} />}
        />
        <PathCard
          className="absolute top-[35.3%] left-[55.3%] w-[33.9%]"
          title={guide.label}
          body={guide.summary}
          action={<CardAction cta="request-guide" href={LINKS.guideRequest} label={guide.cta} />}
        />

        <AnnotationStem left={26.6} top={69.5} />
        <p className="absolute top-[74.6%] left-[11.5%] flex w-[29.3%] items-stretch gap-[1cqw] rounded-[4px] bg-atlas-tint px-[1.2cqw] py-[0.9cqw]">
          <span className="shrink-0 self-center font-body text-[0.72cqw] font-bold tracking-[0.16em] text-ink uppercase">
            Outcome
          </span>
          <span aria-hidden="true" className="w-px shrink-0 bg-gold" />
          <span className="font-body text-[0.85cqw] leading-[1.5] text-charcoal">
            {LINKS.scheduleOutcome}
          </span>
        </p>

        <AnnotationStem left={71.3} top={62.5} />
        {/* The frame prints a build instruction here — "CUSTOMER INPUT REQUIRED:
            the final guide file and approved delivery workflow must be supplied
            before delivery is represented as available." That is documentation
            for us, not copy for a visitor. The plate is drawn exactly as
            specified; what it carries is the reader-facing note that says the
            same thing truthfully. */}
        <aside className="absolute top-[68%] left-[53.4%] flex w-[37.1%] items-center gap-[1.2cqw] rounded-[4px] border border-dashed border-gold/70 bg-white/95 px-[1.4cqw] py-[1.1cqw]">
          <TargetRosette className="h-[2.4cqw] w-[2.4cqw] shrink-0 text-gold" />
          <p className="font-body text-[0.85cqw] leading-[1.5] text-charcoal">
            <strong className="font-bold text-ink">Guide availability:</strong>{" "}
            {guide.requestNote}
          </p>
        </aside>

        <span aria-hidden="true" className="absolute top-[85.3%] right-[3%] left-[3%] h-px bg-white/30" />
        <TargetRosette className="absolute top-[85.3%] left-1/2 h-[1.6cqw] w-[1.6cqw] -translate-x-1/2 -translate-y-1/2 text-gold" />

        <div className="absolute right-[5%] bottom-[4.5%] left-[5%]">
          <ClosingFooter />
        </div>
      </div>

      {/* Below the canvas the plate cannot hold its perimeter, so the two paths
          stack and keep their annotations. */}
      <div className="vb-shell py-16 lg:hidden">
        <h2 className="text-display-l leading-[1.12] font-bold tracking-[-0.02em] text-balance text-white">
          {headline}
        </h2>
        <p className="mt-4 font-display text-[11px] tracking-[0.22em] text-white/85 uppercase">
          {SUBHEAD}
        </p>
        <div className="mt-10 grid gap-5">
          <PathCard
            compact
            className=""
            title={strategyCall.label}
            body={strategyCall.summary}
            emphasis={strategyCall.expectation}
            action={<CardAction compact cta="schedule-strategy-call" href={LINKS.schedule} label={strategyCall.label} />}
          />
          <PathCard
            compact
            className=""
            title={guide.label}
            body={guide.summary}
            action={<CardAction compact cta="request-guide" href={LINKS.guideRequest} label={guide.cta} />}
          />
          <aside className="flex items-center gap-3 rounded-[4px] border border-dashed border-gold/70 bg-white/95 px-4 py-3">
            <TargetRosette className="h-8 w-8 shrink-0 text-gold" />
            <p className="font-body text-body-s leading-[1.5] text-charcoal">
              <strong className="font-bold text-ink">Guide availability:</strong>{" "}
              {guide.requestNote}
            </p>
          </aside>
        </div>
        <span aria-hidden="true" className="mt-10 block h-px w-full bg-white/30" />
        <div className="mt-6">
          <ClosingFooter compact />
        </div>
      </div>
    </section>
  );
}
