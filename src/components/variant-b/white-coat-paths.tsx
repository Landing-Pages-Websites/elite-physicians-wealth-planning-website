import Image from "next/image";
import { LINKS, WHITE_COAT_PATHS } from "@/lib/content";
import GoldArrow from "./gold-arrow";
import SectionEyebrow from "./section-eyebrow";

const IMAGE_ROOT = "/images/design/b/06-white-coat-paths";

/** The frame is 1536x864, so one unit of height is 0.5625 units of width. */
const FRAME_RATIO = 864 / 1536;

/**
 * Who we serve, as the frame lays it out.
 *
 * The frame runs the direction's ruled axis diagonally through the band —
 * entering top-left with tick marks and gold nodes and leaving bottom-right —
 * behind a five-card grid: two tall cards beside the copy, three shorter ones
 * across the foot. Each card is a photograph over a white plate whose copy is
 * indexed by a gold rule and node.
 *
 * Card boxes are measured off public/design/b/refs/06-white-coat-paths.png at
 * its native 1536x864.
 */
type CardBox = {
  left: number;
  top: number;
  width: number;
  /** Photo height as a percentage of the frame; the frame uses two. */
  photo: number;
};

const CARDS: readonly CardBox[] = [
  { left: 37.3, top: 6.1, width: 31.2, photo: 32.1 },
  { left: 69.2, top: 6.1, width: 29.2, photo: 32.1 },
  // The bottom row is not flush in the frame. The middle and right cards run
  // their photos from y 50.9% to 75.7%; the LEFT card starts lower, at 57.9%,
  // because the intro paragraph occupies that column above it — raising it to
  // match the other two puts the photograph behind the paragraph and drops that
  // text to 2.03:1. All three copy plates still begin together at ~75.8%.
  { left: 3.4, top: 57.9, width: 29.2, photo: 17.9 },
  { left: 33.1, top: 50.9, width: 35.4, photo: 24.8 },
  { left: 69.2, top: 50.9, width: 29.2, photo: 24.8 },
] as const;

const IMAGES = [
  `${IMAGE_ROOT}/physicians-specialists.jpg`,
  `${IMAGE_ROOT}/surgeons.jpg`,
  `${IMAGE_ROOT}/dentists-dental-specialists.jpg`,
  `${IMAGE_ROOT}/practice-owners-partners.jpg`,
  `${IMAGE_ROOT}/healthcare-executives.jpg`,
] as const;

const ALTS = [
  "A physician gesturing across a desk during a consultation",
  "A surgeon tying a surgical cap before a procedure",
  "A dental operatory with a panoramic X-ray on screen",
  "Two practice owners reviewing printed financial reports",
  "A clinician walking a bright hospital corridor",
] as const;

/** The ruled axis the frame runs diagonally behind the grid. */
function DiagonalAxis(): React.JSX.Element {
  const ticks = (x1: number, y1: number, x2: number, y2: number) => {
    const out = [];
    const steps = 14;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      out.push(
        <line
          key={`${x1}-${i}`}
          x1={x}
          y1={y - 9}
          x2={x}
          y2={y + 9}
          stroke="currentColor"
          strokeWidth="1"
          opacity={i % 4 === 0 ? 0.9 : 0.5}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    return out;
  };
  return (
    <svg
      viewBox="0 0 1536 864"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-ink"
      fill="none"
    >
      <line x1="0" y1="176" x2="470" y2="0" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {ticks(20, 168, 450, 8)}
      <circle cx="68" cy="150" r="6" fill="var(--color-gold)" />
      <circle cx="212" cy="115" r="6" fill="var(--color-gold)" />
      <circle cx="349" cy="61" r="6" fill="var(--color-gold)" />
      <line x1="1246" y1="864" x2="1536" y2="720" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {ticks(1262, 856, 1524, 726)}
      <circle cx="1440" cy="758" r="6" fill="var(--color-gold)" />
    </svg>
  );
}

function PathwayCard({
  index,
  box,
}: {
  index: number;
  box: CardBox;
}): React.JSX.Element {
  const pathway = WHITE_COAT_PATHS.pathways[index];
  return (
    <li
      className="absolute"
      style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%` }}
    >
      {/* `photo` is a percentage of the frame's HEIGHT and `width` a percentage
          of its WIDTH, so converting one into padding-top (which resolves
          against the card's own width) needs the frame's 864/1536 ratio. Without
          it every photo came out 1.78x too tall and the lower row ran off the
          canvas into the CTA. */}
      <div
        className="relative w-full"
        style={{ paddingTop: `${(box.photo * FRAME_RATIO * 100) / box.width}%` }}
      >
        <Image
          src={IMAGES[index]}
          alt={ALTS[index]}
          fill
          sizes="(min-width: 1024px) 32vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex gap-[1cqw] bg-white px-[1.3cqw] py-[1.2cqw]">
        <span aria-hidden="true" className="relative mt-[0.3cqw] w-px shrink-0 self-stretch bg-gold">
          <span className="absolute top-[0.9cqw] -left-[0.28cqw] block h-[0.6cqw] w-[0.6cqw] rounded-full bg-gold" />
        </span>
        <div>
          <h3 className="text-[1.05cqw] leading-snug font-bold text-ink">{pathway.audience}</h3>
          <p className="mt-[0.4cqw] font-body text-[0.85cqw] leading-[1.5] text-charcoal">
            {pathway.decision}
          </p>
        </div>
      </div>
    </li>
  );
}

function PlanningPathCta({ compact }: { compact?: true }): React.JSX.Element {
  return (
    <a
      href={LINKS.planningPath}
      className={`group inline-flex items-center gap-3 bg-ink font-bold text-white transition-colors duration-200 hover:bg-ink-hover ${
        compact ? "min-h-12 px-6 text-sm" : "px-[2cqw] py-[1.1cqw] text-[1.02cqw]"
      }`}
    >
      {WHITE_COAT_PATHS.cta}
      <GoldArrow
        className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
          compact ? "h-4 w-4" : "h-[1cqw] w-[1cqw]"
        }`}
      />
    </a>
  );
}

export default function WhiteCoatPaths(): React.JSX.Element {
  return (
    <section
      data-mega-section="white-coat-paths"
      id="white-coat-paths"
      aria-labelledby="white-coat-paths-heading"
      className="relative overflow-hidden bg-atlas-tint/55"
    >
      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        <DiagonalAxis />

        <div className="absolute top-[24%] left-[3.4%] w-[32%]">
          <SectionEyebrow>{WHITE_COAT_PATHS.orientation}</SectionEyebrow>
          <span aria-hidden="true" className="mt-[0.7cqw] block h-[2px] w-[5.5cqw] bg-gold" />
          <h2
            id="white-coat-paths-heading"
            className="mt-[1.4cqw] text-[2.35cqw] leading-[1.15] font-bold tracking-[-0.02em] text-ink"
          >
            {WHITE_COAT_PATHS.headline}
          </h2>
          <p className="mt-[1.4cqw] font-body text-[0.98cqw] leading-[1.55] text-charcoal">
            {WHITE_COAT_PATHS.body}
          </p>
        </div>

        <ol>
          {CARDS.map((box, index) => (
            <PathwayCard key={WHITE_COAT_PATHS.pathways[index].audience} index={index} box={box} />
          ))}
        </ol>

        <div className="absolute bottom-[5.3%] left-[3.4%] flex items-center gap-[1.2cqw]">
          <PlanningPathCta />
          <span aria-hidden="true" className="vb-leader h-px w-[4cqw]" />
          <span aria-hidden="true" className="h-[0.55cqw] w-[0.55cqw] rounded-full bg-gold" />
          <span className="font-body text-[0.85cqw] text-charcoal">
            Navigate to /who-we-serve
          </span>
        </div>
      </div>

      {/* Below the canvas the five cards stack. */}
      <div className="vb-shell py-14 lg:hidden">
        <SectionEyebrow>{WHITE_COAT_PATHS.orientation}</SectionEyebrow>
        <span aria-hidden="true" className="mt-3 block h-[2px] w-20 bg-gold" />
        <h2 className="mt-5 text-display-m leading-[1.15] font-bold tracking-[-0.02em] text-ink">
          {WHITE_COAT_PATHS.headline}
        </h2>
        <p className="mt-5 font-body text-body-m leading-[1.55] text-charcoal">
          {WHITE_COAT_PATHS.body}
        </p>
        <ol className="mt-9 grid gap-5 sm:grid-cols-2">
          {WHITE_COAT_PATHS.pathways.map((pathway, index) => (
            <li key={pathway.audience} className="bg-white">
              <div className="relative aspect-video w-full">
                <Image
                  src={IMAGES[index]}
                  alt={ALTS[index]}
                  fill
                  sizes="(min-width: 640px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex gap-3 px-5 py-4">
                <span aria-hidden="true" className="w-px shrink-0 self-stretch bg-gold" />
                <div>
                  <h3 className="text-base leading-snug font-bold text-ink">{pathway.audience}</h3>
                  <p className="mt-1.5 font-body text-body-s leading-[1.5] text-charcoal">
                    {pathway.decision}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-9">
          <PlanningPathCta compact />
        </div>
      </div>
    </section>
  );
}
