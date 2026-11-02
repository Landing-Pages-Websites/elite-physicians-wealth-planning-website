import Image from "next/image";
import { HERO, LINKS, PORTRAIT } from "@/lib/content";
import { PortraitCaption } from "@/components/site/portrait-caption";
import GoldArrow from "./gold-arrow";
import SectionEyebrow from "./section-eyebrow";

const CONTOUR_PATHS = [
  "M-40 700 C 180 660, 360 726, 560 692 S 940 640 1140 704 S 1440 668 1580 700",
  "M-40 728 C 200 690, 380 750, 580 718 S 960 668 1160 730 S 1460 696 1580 726",
  "M-40 756 C 220 722, 400 776, 600 746 S 980 700 1180 758 S 1480 726 1580 754",
  "M-40 784 C 240 754, 420 802, 620 776 S 1000 734 1200 786 S 1500 758 1580 782",
];

/**
 * Ground texture only. The dashed "blueprint" rect, the four corner
 * registration ticks and the two gold dots were removed: at 1440 the slice
 * transform pushed the rect's left edge off-canvas and drove its right and
 * bottom edges straight through the headline, the ticks clipped entirely, and
 * the dots were endpoints of no line. Gated to lg so the slice cannot stretch
 * the contours into diagonal scratches across the mobile portrait caption.
 */
function HeroFieldOrnaments(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 1536 820"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      fill="none"
    >
      {CONTOUR_PATHS.map((d) => (
        <path key={d} d={d} stroke="currentColor" className="text-ink/10" />
      ))}
    </svg>
  );
}

function StrategyPlaque(): React.JSX.Element {
  return (
    <div className="relative z-10 mt-6 w-full max-w-xs border border-ink/15 bg-ivory p-6 shadow-[0_18px_40px_-18px_rgba(11,31,58,0.30)] lg:absolute lg:bottom-10 lg:-left-10 lg:mt-0 lg:w-64">
      <ul className="relative">
        {HERO.proofLine.map((item, index) => (
          <li
            key={item}
            className={`flex items-center gap-3 py-3 ${index > 0 ? "border-t border-gold/40" : ""}`}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            <span className="text-sm font-semibold tracking-wide text-ink">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroActions(): React.JSX.Element {
  return (
    <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
      <a
        data-mega-cta="schedule-strategy-call"
        href={LINKS.schedule}
        className="group va-btn va-btn-navy w-full justify-center whitespace-nowrap sm:w-auto sm:justify-start"
      >
        {HERO.primaryCta}
        <GoldArrow className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </a>
      <a
        href={LINKS.process}
        className="group va-link border-ink/35 whitespace-nowrap text-ink hover:border-ink hover:opacity-100"
      >
        {HERO.secondaryCta}
        {/* The same glyph as the primary, in currentColor: gold on white is
            2.32:1, so the affordance was the least visible part of the control. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4 text-ink transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </a>
    </div>
  );
}

export default function OnePlanHero(): React.JSX.Element {
  return (
    <section data-mega-section="hero" id="one-plan" aria-labelledby="one-plan-heading" className="relative overflow-hidden bg-white">
      {/* The navy wordmark bar that sat here is now the global SiteHeader —
          lifted, not duplicated, exactly as on the Consult Ledger. The spacer
          reserves the fixed header's height so the hero keeps its rhythm. */}
      <div aria-hidden="true" style={{ height: "var(--header-h)" }} />

      <div className="relative bg-gradient-to-b from-white via-white to-mist/40">
        <HeroFieldOrnaments />
        <div className="vb-shell relative pb-14 pt-12 lg:grid lg:min-h-[42rem] lg:grid-cols-12 lg:gap-12 lg:pt-16">
          <div className="lg:col-span-6">
            <SectionEyebrow>{HERO.orientation}</SectionEyebrow>
            <h1
              id="one-plan-heading"
              className="mt-6 max-w-none text-balance text-display-l tracking-[-0.02em] font-bold leading-[1.06] text-ink md:max-w-[21ch] md:text-display-xl"
            >
              {HERO.headline}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-charcoal">{HERO.body}</p>
            <HeroActions />
            <div className="mt-10 flex items-center gap-4 border-t border-ink/10 pt-6">
              <div className="vb-portrait-clip shrink-0 bg-ink/60 p-px">
                <div className="vb-portrait-clip relative aspect-[270/315] w-28 overflow-hidden bg-mist/50">
                  <Image
                    src={PORTRAIT.src}
                    alt={PORTRAIT.alt}
                    fill
                    sizes="112px"
                    className="object-cover object-top"
                  />
                </div>
              </div>
              <PortraitCaption className="max-w-none px-0 pt-0 pb-0 text-left text-body-s text-charcoal" />
            </div>
          </div>

          {/* The plate this replaces (medical-office-scene.jpg) failed on the
              pixels, not on taste. At 4x it has a second hand with no thumb and
              no wrist dissolving into the desk, a pen nib forked into three
              tines that does not touch the paper it is marking, and hard-edged
              rectangular composite patches across the right of frame — and the
              file is 642x405 being stretched to 621x652. It was also arguing
              the wrong case: a wealth-planning hero whose subject is an MRI
              reads as a radiology practice.

              The media column held a 526x317 photograph in the top half of a
              650px column and then a 208px portrait thumbnail floating at the
              bottom right with its caption detached beside it — a sticker in a
              field of white, and 130px of empty column under the CTAs opposite.
              The photograph fills its column now, and the portrait moved to the
              left column where it belongs: the face of the person you are about
              to book sits with the button that books him. */}
          {/* Below lg the photograph took the whole container while the plaque
              stayed in flow on top of it, covering the top 62% of the frame —
              both subjects' heads. The photograph gets its own row on mobile
              and only goes behind the plaque once the plaque floats, at lg. */}
          <div className="relative mt-12 lg:col-span-6 lg:mt-0 lg:min-h-[22rem]">
            <div className="relative aspect-4/3 w-full overflow-hidden bg-mist [filter:saturate(0.82)_contrast(1.02)] lg:absolute lg:inset-0 lg:aspect-auto">
              <Image
                src="/images/design/b/01-one-plan/planning-conversation.jpg"
                alt="A physician and a planner in conversation across a consulting table"
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover"
              />
            </div>
            <StrategyPlaque />
          </div>
        </div>

        <div className="vb-shell relative flex flex-wrap items-baseline gap-x-10 gap-y-2 pb-10">
          <p className="text-xs font-semibold tracking-[0.06em] text-ink/80">{HERO.identityLine}</p>
          <p className="text-body-s leading-relaxed text-charcoal/70">{HERO.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
