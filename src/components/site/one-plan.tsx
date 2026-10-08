import Image from "next/image";
import { HERO, LINKS, PORTRAIT } from "@/lib/content";
import { PortraitCaption } from "./portrait-caption";
import {
  CalendarIcon,
  FileTextIcon,
  RefreshIcon,
  ShieldIcon,
  StethoscopeIcon,
} from "./icons";

/**
 * The hero's gold route.
 *
 * The frame runs one continuous line through this band: it enters at the left
 * edge beside the orientation line, breaks for that text, resumes, turns down
 * the gutter and lands on the portrait card's left edge at a node — then leaves
 * the card's lower right and exits the section with an arrow into 02. The build
 * had only the middle rule, so the route appeared from nowhere and stopped in
 * space at both ends.
 */
function HeroRoute(): React.JSX.Element {
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
        opacity="0.75"
      >
        <path d="M0 150 H322" vectorEffect="non-scaling-stroke" />
        <path
          d="M872 150 H886 Q906 150 906 170 V400 Q906 420 926 420 H1062"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M1418 700 H1466 Q1490 700 1490 724 V812"
          vectorEffect="non-scaling-stroke"
        />
        <path d="M1478 800 L1490 813 L1502 800" vectorEffect="non-scaling-stroke" />
      </g>
      <circle cx="1068" cy="420" r="5.5" fill="var(--color-gold)" />
    </svg>
  );
}

/** Each proof gets the mark the frame draws beside it. */
const PROOF_ICONS = [ShieldIcon, StethoscopeIcon, RefreshIcon] as const;

/** The compass rosette the frame sets before the identity line. */
function CompassRose({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none" stroke="currentColor">
      <circle cx="16" cy="16" r="11" strokeOpacity="0.75" />
      <circle cx="16" cy="16" r="3.6" strokeOpacity="0.75" />
      <path
        d="M16 1.5 L18.6 13.4 L30.5 16 L18.6 18.6 L16 30.5 L13.4 18.6 L1.5 16 L13.4 13.4 Z"
        strokeOpacity="0.9"
      />
    </svg>
  );
}

/** The three-line monumental break of the manifest headline. */
function headlineLines(): readonly string[] {
  const headline: string = HERO.headline;
  const secondStart = headline.indexOf("Keep");
  const thirdStart = headline.indexOf("and Retire");
  if (secondStart === -1 || thirdStart === -1) {
    return [headline];
  }
  return [
    headline.slice(0, secondStart).trim(),
    headline.slice(secondStart, thirdStart).trim(),
    headline.slice(thirdStart).trim(),
  ];
}

/**
 * The frame draws this as a tall cream plate with a rounded GOLD border, not a
 * white card with a hairline ring — the gold edge is what ties it to the route
 * that runs into its left side and leaves from its lower right.
 */
function PortraitCard(): React.JSX.Element {
  return (
    <figure className="va-reveal relative w-full max-w-[19rem] rounded-[10px] border-2 border-gold/80 bg-ivory p-3 shadow-[0_24px_60px_rgba(2,10,22,0.55)] sm:max-w-[20rem] lg:mt-[9px] lg:w-[22rem] lg:max-w-none">
      <div className="relative aspect-[485/645] overflow-hidden">
        <Image
          src={PORTRAIT.src}
          alt={PORTRAIT.alt}
          fill
          priority
          sizes="(min-width: 1024px) 336px, 320px"
          className="object-cover object-[100%_20%]"
        />
      </div>
      <PortraitCaption className="text-body-s" />
    </figure>
  );
}

export function OnePlan(): React.JSX.Element {
  return (
    <section
      id="one-plan"
      aria-labelledby="one-plan-heading"
      className="va-hero relative overflow-hidden text-ivory"
    >
      <HeroRoute />
      <div className="relative z-10 va-shell flex min-h-[min(864px,100svh)] flex-col py-8">
        {/* The masthead that sat here has been LIFTED into the global
            SiteHeader — not copied. The approved frame shows this lockup at the
            hero's top-left; the fixed header now renders it in that same
            position on every route. Leaving it here as well would stack two
            wordmarks. The spacer below reserves the header's height so the
            hero's internal rhythm and its 1536x864 fold grouping are unchanged. */}
        <div aria-hidden="true" style={{ height: "var(--header-h)" }} />

        <div className="mt-10 flex items-center gap-5 lg:mt-14">
          {/* Serif italic, as drawn. It had been set as letterspaced caps,
              which made it read as a category label rather than the line the
              gold route runs out of. */}
          <p className="font-display text-[1.05rem] leading-none italic text-mist/90">
            {HERO.orientation}
          </p>
        </div>

        <div className="mt-7 grid items-start gap-12 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          <div className="max-w-2xl">
            <h1
              id="one-plan-heading"
              className="va-reveal text-display-xl font-display leading-[1.06] font-medium tracking-[-0.02em] text-balance text-ivory-bright"
            >
              {/* Below lg the spans go inline so the browser balances the whole
                  string — the authored break stranded "More," on its own line
                  at 390. At lg the three-line monument is unchanged. */}
              {headlineLines().map((line) => (
                <span key={line} className="block max-lg:inline">
                  {line}{" "}
                </span>
              ))}
            </h1>
            <p className="mt-7 max-w-[52ch] font-body text-body-l leading-[1.62] text-mist/80 text-pretty">
              {HERO.body}
            </p>
            <div className="mt-11 flex flex-wrap items-baseline gap-x-9 gap-y-4">
              <a
                href={LINKS.scheduleOnsite}
                className="va-btn va-btn-gold"
              >
                <CalendarIcon className="h-4 w-4" />
                {HERO.primaryCta}
              </a>
              {/* Drawn as a bordered button with its own mark, matched in
                  height to the gold action beside it — it was a text underline,
                  which read as a footnote next to a filled button. */}
              <a
                href={LINKS.processOnsite}
                className="va-btn border border-mist/45 text-mist transition-colors duration-200 hover:border-gold hover:text-ivory"
              >
                <FileTextIcon className="h-4 w-4" />
                {HERO.secondaryCta}
              </a>
            </div>
          </div>

          <PortraitCard />
        </div>

        {/* The frame gives each proof its own mark — shield, stethoscope,
            refresh — with a gold dot between them, not a dot in front of each.
            All three icons already existed in the set and none was used. */}
        <ul className="mt-auto grid gap-y-3.5 border-t border-white/10 pt-7 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-4">
          {HERO.proofLine.map((proof, index) => {
            const Icon = PROOF_ICONS[index] ?? ShieldIcon;
            return (
              <li key={proof} className="flex items-center gap-2.5">
                <span className="flex items-center gap-2.5 font-body text-body-s font-medium text-mist/90">
                  <Icon className="h-[1.15rem] w-[1.15rem] shrink-0 text-gold" />
                  {proof}
                </span>
                {index < HERO.proofLine.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="ml-3 hidden h-[5px] w-[5px] shrink-0 rounded-full bg-gold sm:block"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:gap-6">
          <p className="flex items-center gap-3 font-body text-body-s font-medium tracking-[0.14em] text-balance text-gold uppercase">
            <CompassRose className="h-6 w-6 shrink-0" />
            {HERO.identityLine}
          </p>
          <span aria-hidden="true" className="hidden h-8 w-px bg-mist/25 sm:block" />
          <p className="max-w-[46ch] font-body text-body-s leading-[1.5] text-mist/70">
            {HERO.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
