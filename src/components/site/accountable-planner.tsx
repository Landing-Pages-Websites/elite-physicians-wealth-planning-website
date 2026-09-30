import Image from "next/image";
import { ACCOUNTABLE_PLANNER, LINKS, PORTRAIT } from "@/lib/content";
import { ArrowRightIcon } from "./icons";
import { splitNameCredentials } from "./portrait-caption";

/**
 * Meet the planner, built to the approved frame.
 *
 * The frame sets the portrait in a thin gold-bordered plate on a cream field,
 * with the desk photograph bleeding off the left edge behind it and one gold
 * route arriving from the top, touching the plate's left edge, and dropping out
 * of its foot to a node. The narrative sits to the right: gold cap eyebrow over
 * a short rule, display-serif headline, a full-width gold rule ending in a
 * node, the name, the body, and a navy action.
 *
 * Geometry measured from public/design/a/refs/07-accountable-planner.png at its
 * native 1536x864. The desk plate is the generated one — the frame's own desk
 * carries three fabricated book titles.
 */
function PlannerRoute(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 1536 864"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] hidden h-full w-full lg:block"
      fill="none"
    >
      <g stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M940 0 V44 Q940 78 906 78 H716 Q683 78 683 112" vectorEffect="non-scaling-stroke" />
        <path d="M232 405 H307" vectorEffect="non-scaling-stroke" />
        <path d="M683 735 V828" vectorEffect="non-scaling-stroke" />
      </g>
      <circle cx="683" cy="838" r="6" fill="var(--color-gold)" />
    </svg>
  );
}

/* The id lives on the DESKTOP render only. This component is called twice —
   once for the canvas and once for the lg:hidden stack — so an id written
   inside it appeared twice in the document and every aria-labelledby
   pointing at it resolved to nothing. */
function PlannerNarrative({ compact, headingId }: { compact?: true; headingId?: string }): React.JSX.Element {
  const { name, credentials } = splitNameCredentials();
  return (
    <>
      <p
        className={`font-body font-semibold tracking-[0.22em] text-gold-text uppercase ${
          compact ? "text-[11px]" : "text-[0.8cqw]"
        }`}
      >
        {ACCOUNTABLE_PLANNER.orientation}
      </p>
      <span
        aria-hidden="true"
        className={`block bg-gold ${compact ? "mt-3 h-px w-16" : "mt-[0.9cqw] h-px w-[4.7cqw]"}`}
      />
      <h2
        id={headingId}
        className={`va-reveal font-display leading-[1.14] font-medium tracking-[-0.01em] text-ink ${
          compact ? "mt-5 text-display-m text-balance" : "mt-[1.6cqw] text-[3.9cqw]"
        }`}
      >
        {ACCOUNTABLE_PLANNER.headline}
      </h2>
      {/* Full-width rule ending in a node, as drawn. */}
      <span
        aria-hidden="true"
        className={`relative flex items-center ${compact ? "mt-6" : "mt-[2cqw]"}`}
      >
        <span className="h-px flex-1 bg-gold" />
        <span
          className={`ml-1 block shrink-0 rounded-full bg-gold ${
            compact ? "h-1.5 w-1.5" : "h-[0.55cqw] w-[0.55cqw]"
          }`}
        />
      </span>
      <p
        className={`font-display font-medium text-ink ${
          compact ? "mt-5 text-2xl" : "mt-[1.5cqw] text-[2.35cqw] leading-none"
        }`}
      >
        {name}
        {credentials ? (
          <span className={compact ? "text-lg" : "text-[1.25cqw]"}>, {credentials}</span>
        ) : null}
      </p>
      <p
        className={`font-body leading-[1.6] text-charcoal ${
          compact ? "mt-4 text-body-m" : "mt-[1.4cqw] text-[1.02cqw]"
        }`}
      >
        {ACCOUNTABLE_PLANNER.body}
      </p>
      <a
        href={LINKS.meetMichaelOnsite}
        className={`va-btn va-btn-navy ${compact ? "mt-8" : "mt-[2cqw]"}`}
      >
        {ACCOUNTABLE_PLANNER.cta}
        <ArrowRightIcon className="h-4 w-4 text-gold" />
      </a>
    </>
  );
}

export function AccountablePlanner(): React.JSX.Element {
  return (
    <section
      id="accountable-planner"
      aria-labelledby="accountable-planner-heading"
      className="va-planner relative overflow-hidden"
    >
      <PlannerRoute />

      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative z-10 hidden aspect-1536/864 w-full lg:block">
        <figure className="va-planner-card va-reveal absolute top-[12.7%] left-[20%] w-[27%] p-[0.7cqw]">
          <div className="relative aspect-[405/610] overflow-hidden">
            <Image
              src={PORTRAIT.src}
              alt={PORTRAIT.alt}
              fill
              sizes="27vw"
              className="object-cover object-[58%_12%]"
            />
          </div>
        </figure>

        {/* 37.4% is ~47px narrower than the frame's narrative column, which
            broke the h2 mid-clause and stranded the article "A" at the end of
            line 1. At 40.5% line 1 breaks after the full stop, as drawn. */}
        <div className="absolute top-[17.5%] left-[52.7%] w-[40.5%]">
          <PlannerNarrative headingId="accountable-planner-heading" />
        </div>
      </div>

      {/* Below the canvas the plate and the narrative stack. */}
      <div className="va-shell relative z-10 py-14 lg:hidden">
        <figure className="va-planner-card mx-auto w-full max-w-[19rem] p-3">
          <div className="relative aspect-[405/560] overflow-hidden">
            <Image
              src={PORTRAIT.src}
              alt={PORTRAIT.alt}
              fill
              sizes="304px"
              className="object-cover object-[58%_12%]"
            />
          </div>
        </figure>
        <div className="mt-9">
          <PlannerNarrative compact />
        </div>
      </div>
    </section>
  );
}
