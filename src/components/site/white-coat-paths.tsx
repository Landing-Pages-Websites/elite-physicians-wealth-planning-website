import Image from "next/image";
import { LINKS, WHITE_COAT_PATHS } from "@/lib/content";
import { ArrowRightIcon } from "./icons";

const PHOTO_DIR = "/images/design/a/06-white-coat-paths";

/**
 * Who we serve, built to the approved frame.
 *
 * The frame is a descending cascade: five skewed photographs stepping down and
 * across the field, each with its audience set in display serif to the right,
 * and one gold route entering top-left, threading the nodes in turn, and
 * leaving bottom-right with an arrow.
 *
 * Two things had gone wrong and both read as crowding. The route was drawn as
 * detours that looped OVER the photographs and closed rounded boxes around
 * "Surgeons" and "Practice owners & partners" — in the frame the route runs
 * BEHIND the photographs and each node is reached by a short leader out of the
 * photograph beside it. And every label carried the same generous width, so
 * three of the five ran their lines out past the route instead of stacking
 * short. Route and box geometry below is traced from the gold channel of
 * public/design/a/refs/06-white-coat-paths.png at its native 1536x864.
 */
type Pathway = {
  src: string;
  alt: string;
  /** Photo box and label origin, percentages of the frame. */
  photo: { left: number; top: number; width: number; height: number };
  /** Label width is per-audience: the frame wraps each one to its own measure. */
  label: { left: number; top: number; width: number };
};

const PATHWAYS: readonly Pathway[] = [
  {
    src: `${PHOTO_DIR}/physicians-specialists-consultation.jpg`,
    alt: "A physician gesturing across a desk during a consultation",
    photo: { left: 37.1, top: 2.1, width: 24.4, height: 24.3 },
    label: { left: 64.4, top: 9.5, width: 15.7 },
  },
  {
    src: `${PHOTO_DIR}/surgeons-operating-room.jpg`,
    alt: "Surgeons working under operating-room lights",
    photo: { left: 56.1, top: 22.9, width: 24.1, height: 21.1 },
    label: { left: 81.9, top: 29.4, width: 12.6 },
  },
  {
    src: `${PHOTO_DIR}/dental-office-planning.jpg`,
    alt: "A dental clinician reviewing a panoramic X-ray in an operatory",
    photo: { left: 35.5, top: 45.4, width: 23.4, height: 23.1 },
    label: { left: 63.6, top: 50.5, width: 17.5 },
  },
  {
    src: `${PHOTO_DIR}/practice-owner-meeting.jpg`,
    alt: "A practice owner taking notes at a desk",
    photo: { left: 55.3, top: 63.4, width: 21.5, height: 19 },
    label: { left: 80.2, top: 67.4, width: 16.9 },
  },
  {
    src: `${PHOTO_DIR}/healthcare-executive-hallway.jpg`,
    alt: "A clinician walking a bright hospital corridor",
    photo: { left: 32.2, top: 79.6, width: 22.5, height: 20.4 },
    label: { left: 56.6, top: 83.2, width: 13.8 },
  },
] as const;

/** Node centres on the frame's grid, in the order the route reaches them. */
const NODES = [
  [973, 100],
  [1240, 271],
  [957, 452],
  [1211, 597],
  [846, 733],
] as const;

/**
 * One gold route, on the frame's own grid so it lands on the nodes at any
 * width. It is drawn UNDER the photographs: each leg runs into a photograph,
 * is masked by it, and re-emerges as the leader that indexes the next label.
 * The last node has only its leader — by then the route has already left.
 */
function CascadeRoute(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 1536 864"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block"
      fill="none"
    >
      <g
        stroke="var(--color-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {/* In at the top left, along under the headline, into the first photo. */}
        <path d="M35 0 V90 Q35 103 48 103 H573 Q586 103 586 116 V186" />
        {/* Out of it at the node, then straight down under the second photo. */}
        <path d="M936 100 H980" />
        <path d="M973 100 V206" />
        {/* Out at the second node, down, back across, down to the third. */}
        <path d="M1198 271 H1242" />
        <path d="M1240 271 V404 Q1240 417 1227 417 H970 Q957 417 957 430 V452" />
        {/* Third node's leader, then under the fourth photo and out at its node. */}
        <path d="M912 452 H959" />
        <path d="M957 452 V562 Q957 575 970 575 H1198 Q1211 575 1211 588 V597" />
        <path d="M1176 597 H1220" />
        {/* Down the right margin and off the frame. */}
        <path d="M1211 597 V805 Q1211 818 1224 818 H1522" />
        <path d="M1509 806 L1522 818 L1509 830" />
        {/* The fifth label is indexed by its leader alone. */}
        <path d="M818 733 H848" />
      </g>
      {NODES.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="var(--color-gold)" />
      ))}
    </svg>
  );
}

function PathwayLabel({ pathway, index }: { pathway: Pathway; index: number }): React.JSX.Element {
  const audience = WHITE_COAT_PATHS.pathways[index];
  return (
    <div
      className="absolute z-10"
      style={{
        left: `${pathway.label.left}%`,
        top: `${pathway.label.top}%`,
        width: `${pathway.label.width}%`,
      }}
    >
      <h3 className="font-display text-[1.55cqw] leading-[1.15] font-medium text-ink">
        {audience.audience}
      </h3>
      <p className="mt-[0.65cqw] font-body text-[0.9cqw] leading-[1.5] text-pretty text-charcoal">
        {audience.decision}
      </p>
    </div>
  );
}

function PlanningPathCta({ compact }: { compact?: true }): React.JSX.Element {
  return (
    <a
      href={LINKS.planningPathOnsite}
      className={`group inline-flex items-center gap-3 bg-ink font-semibold text-gold transition-colors duration-200 hover:bg-ink-hover ${
        compact ? "min-h-12 px-6 text-sm" : "px-[2.3cqw] py-[1.25cqw] text-[1.1cqw]"
      }`}
    >
      {WHITE_COAT_PATHS.cta}
      <ArrowRightIcon
        className={`transition-transform duration-200 group-hover:translate-x-0.5 ${
          compact ? "h-4 w-4" : "h-[1.1cqw] w-[1.1cqw]"
        }`}
      />
    </a>
  );
}

export function WhiteCoatPaths(): React.JSX.Element {
  return (
    <section
      data-mega-section="white-coat-paths"
      id="white-coat-paths"
      aria-labelledby="white-coat-paths-heading"
      className="va-mist relative overflow-hidden"
    >
      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        <CascadeRoute />

        {PATHWAYS.map((pathway) => (
          <figure
            key={pathway.src}
            className="va-clip-cascade absolute z-[1] overflow-hidden"
            style={{
              left: `${pathway.photo.left}%`,
              top: `${pathway.photo.top}%`,
              width: `${pathway.photo.width}%`,
              height: `${pathway.photo.height}%`,
            }}
          >
            <Image
              src={pathway.src}
              alt={pathway.alt}
              fill
              sizes="(min-width: 1024px) 26vw, 100vw"
              className="object-cover"
            />
          </figure>
        ))}

        {PATHWAYS.map((pathway, index) => (
          <PathwayLabel key={pathway.src} pathway={pathway} index={index} />
        ))}

        {/* The headline runs to 37% because the frame sets it that large; the
            paragraph under it keeps the frame's shorter measure of its own. */}
        <div className="absolute top-[15.5%] left-[3.6%] z-10 w-[38.5%]">
          {/* w-fit, not the column's width: the route's first leg descends
              through this row on its way under the opening photograph, and a
              full-width box would put that gold stroke inside the eyebrow's
              own background — which is how the contrast gate reads it. */}
          <p className="w-fit font-body text-[0.95cqw] font-semibold tracking-[0.2em] text-gold-text uppercase">
            Orientation:{" "}
            <span className="font-display text-[1.28cqw] tracking-normal italic normal-case">
              {WHITE_COAT_PATHS.orientation}
            </span>
          </p>
          <h2
            id="white-coat-paths-heading"
            className="va-reveal mt-[1.9cqw] font-display text-[3.7cqw] leading-[1.14] font-medium tracking-[-0.01em] text-ink"
          >
            {WHITE_COAT_PATHS.headline}
          </h2>
          <span aria-hidden="true" className="mt-[2.1cqw] block h-px w-[4.8cqw] bg-gold" />
          <p className="mt-[1.7cqw] max-w-[71%] font-body text-[1.26cqw] leading-[1.55] text-charcoal">
            {WHITE_COAT_PATHS.body}
          </p>
          <div className="mt-[3.6cqw]">
            <PlanningPathCta />
          </div>
        </div>
      </div>

      {/* Below the canvas the cascade cannot hold, so the five stack. */}
      <div className="va-shell py-14 lg:hidden">
        <p className="font-body text-[11px] font-semibold tracking-[0.2em] text-gold-text uppercase">
          Orientation:{" "}
          <span className="font-display text-base tracking-normal italic normal-case">
            {WHITE_COAT_PATHS.orientation}
          </span>
        </p>
        <h2 className="mt-4 text-display-m font-display leading-[1.14] font-medium tracking-[-0.01em] text-balance text-ink">
          {WHITE_COAT_PATHS.headline}
        </h2>
        <span aria-hidden="true" className="mt-6 block h-px w-16 bg-gold" />
        <p className="mt-6 max-w-[46ch] font-body text-body-m leading-[1.55] text-charcoal">
          {WHITE_COAT_PATHS.body}
        </p>
        <ol className="mt-9 grid gap-8">
          {PATHWAYS.map((pathway, index) => (
            <li key={pathway.src}>
              <figure className="va-clip-cascade relative aspect-video w-full overflow-hidden">
                <Image src={pathway.src} alt={pathway.alt} fill sizes="100vw" className="object-cover" />
              </figure>
              <div className="relative mt-4 pl-5">
                <span aria-hidden="true" className="absolute top-[0.5em] left-0 h-2 w-2 rounded-full bg-gold" />
                <h3 className="font-display text-display-s leading-[1.15] font-medium text-ink">
                  {WHITE_COAT_PATHS.pathways[index].audience}
                </h3>
                <p className="mt-2 font-body text-body-s leading-[1.55] text-charcoal">
                  {WHITE_COAT_PATHS.pathways[index].decision}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <PlanningPathCta compact />
        </div>
      </div>
    </section>
  );
}
