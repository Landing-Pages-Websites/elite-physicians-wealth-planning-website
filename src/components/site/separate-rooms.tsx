import Image from "next/image";
import { SEPARATE_ROOMS } from "@/lib/content";
import {
  AlertIcon,
  CalculatorIcon,
  ChartBarIcon,
  ScalesIcon,
  ShieldPlusIcon,
  UmbrellaIcon,
} from "./icons";

/**
 * The coordination gap, built to the approved frame.
 *
 * The frame draws five large floor plans around a ringed hub, each carrying its
 * own name INSIDE the plan — an icon above it and a short gold rule under it —
 * with solid gold spokes running hub-to-plan and a ring node at both ends of
 * every spoke. A gold route enters top centre and leaves bottom left under an
 * arrow.
 *
 * Two earlier judgment calls are reversed here. The plans had been shrunk and
 * their names moved outside, which is why the reviewer could not read them; and
 * the spokes had been drawn BROKEN on the argument that a fully wired hub
 * "draws the state the firm sells rather than the problem the copy describes."
 * The frame draws them solid.
 *
 * The one thing not reproduced is the navy masthead tab, which sets "The
 * Consult Ledger" — the internal A/B direction codename, not the client's
 * brand. Shipping it would publish a build artifact as the practice's identity.
 *
 * Every number below is measured, not read off the frame by eye, because eye
 * is what produced the reviewer's "the text is not centered so it looks
 * sloppy". Two separate errors were stacking:
 *
 *   1. The boxes did not match the assets. Each plan was placed in a box of a
 *      different aspect ratio and then drawn `object-contain`, so the browser
 *      letterboxed it — up to 34px of dead margin per side. Every plan
 *      therefore rendered SMALLER than the frame draws it, and the name, which
 *      was centred on the BOX, drifted away from the drawing inside it.
 *   2. The names are not centred on their plans in the frame. Each sits in the
 *      clear floor its drawing leaves — up to 6.6% of the plan's width off
 *      centre — so centring them was wrong even with the box fixed.
 *
 * `box` is now the asset's true position, recovered by cross-correlating each
 * transparent PNG against the reference frame: all five match at 1.000, i.e.
 * the assets sit in the frame at 1:1 and these are their exact coordinates.
 * Boxes are at the asset's own aspect ratio, so nothing letterboxes.
 *
 * `label` is where the frame actually sets the lockup, recovered by masking the
 * frame down to the pixels the asset leaves transparent and reading the icon,
 * the name and the gold rule out of what remains. Two of the five needed the
 * gold spoke crossing the plan excluded first, which is why the numbers are
 * taken inside the name's own column span.
 *
 * The frame also sets the two names that wrap one step smaller — 28.5px against
 * 33.5px on the 1536 frame — which is how "Insurance professional" fits a plan
 * narrower than the word. Solved against the shipped Cormorant Garamond by
 * fitting rendered ink to the measured ink, not guessed from cap heights.
 */
type RoomSpec = {
  role: (typeof SEPARATE_ROOMS.roles)[number];
  src: string;
  alt: string;
  width: number;
  height: number;
  Icon: (props: { className?: string }) => React.JSX.Element;
  /** Plan box, percentages of the frame. Matches the asset's aspect ratio. */
  box: { left: number; top: number; width: number; height: number };
  /**
   * Where the frame sets this plan's lockup, as a percentage of the PLAN, and
   * the measure the name wraps to. `x`/`y` are the centre of icon-name-rule.
   */
  label: { x: number; y: number; measure: number };
  /** Where the spoke meets this plan, and where it leaves the hub. */
  spoke: { x1: number; y1: number; x2: number; y2: number };
};

const ROOM_DIR = "/images/design/a/03-separate-rooms";

const ROOMS: readonly RoomSpec[] = [
  {
    role: "CPA",
    src: `${ROOM_DIR}/room-cpa.png`,
    alt: "Hand-drawn floor plan of a CPA\u2019s separate office",
    width: 422,
    height: 278,
    Icon: CalculatorIcon,
    box: { left: 32.81, top: 6.48, width: 27.47, height: 32.18 },
    label: { x: 55.6, y: 42.4, measure: 46 },
    spoke: { x1: 906, y1: 350, x2: 742, y2: 256 },
  },
  {
    role: "Attorney",
    src: `${ROOM_DIR}/room-attorney.png`,
    alt: "Hand-drawn floor plan of an attorney\u2019s separate office",
    width: 494,
    height: 278,
    Icon: ScalesIcon,
    box: { left: 66.54, top: 6.48, width: 32.16, height: 32.18 },
    label: { x: 43.4, y: 41.7, measure: 46 },
    spoke: { x1: 1038, y1: 350, x2: 1232, y2: 256 },
  },
  {
    role: "TPA",
    src: `${ROOM_DIR}/room-tpa.png`,
    alt: "Hand-drawn floor plan of a third-party administrator\u2019s separate office",
    width: 316,
    height: 260,
    Icon: ShieldPlusIcon,
    box: { left: 33.01, top: 35.65, width: 20.57, height: 30.09 },
    label: { x: 55.5, y: 43.1, measure: 46 },
    spoke: { x1: 877, y1: 425, x2: 790, y2: 425 },
  },
  {
    role: "Insurance professional",
    src: `${ROOM_DIR}/room-insurance-professional.png`,
    alt: "Hand-drawn floor plan of an insurance professional\u2019s separate office",
    width: 388,
    height: 261,
    Icon: UmbrellaIcon,
    box: { left: 73.31, top: 35.53, width: 25.26, height: 30.21 },
    label: { x: 47.3, y: 46.4, measure: 40 },
    spoke: { x1: 1067, y1: 425, x2: 1155, y2: 425 },
  },
  {
    role: "Financial advisor",
    src: `${ROOM_DIR}/room-financial-advisor.png`,
    alt: "Hand-drawn floor plan of a financial advisor\u2019s separate office",
    width: 411,
    height: 278,
    Icon: ChartBarIcon,
    box: { left: 41.86, top: 63.19, width: 26.76, height: 32.18 },
    label: { x: 47.6, y: 42.4, measure: 30 },
    spoke: { x1: 972, y1: 520, x2: 972, y2: 592 },
  },
] as const;

const HUB = { cx: 972, cy: 425, r: 95 } as const;

/** Solid spokes with a ring node at both ends, plus the seam route. */
function NetworkRoute(): React.JSX.Element {
  const node = (cx: number, cy: number, key: string): React.JSX.Element => (
    <g key={key}>
      <circle cx={cx} cy={cy} r="7" fill="var(--color-ivory)" stroke="var(--color-gold)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--color-gold)" />
    </g>
  );
  return (
    <svg
      viewBox="0 0 1536 864"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
    >
      <g stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Arrival from 02: in at the top edge, down the clear channel between
            the two upper plans, onto the hub's crown. */}
        <path d="M730 0 V22 Q730 40 748 40 H954 Q972 40 972 58 V330" vectorEffect="non-scaling-stroke" />
        {ROOMS.map((room) => (
          <path
            key={room.role}
            d={`M${room.spoke.x1} ${room.spoke.y1} L${room.spoke.x2} ${room.spoke.y2}`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Exit to 04 under the lowest plan and out to the left edge. */}
        <path d="M880 795 Q862 795 862 813 V828 H104" vectorEffect="non-scaling-stroke" />
        <path d="M116 816 L104 828 L116 840" vectorEffect="non-scaling-stroke" />
      </g>
      <circle cx={HUB.cx} cy={HUB.cy} r={HUB.r} fill="var(--color-ivory)" stroke="var(--color-gold)" strokeWidth="2" />
      <circle cx={HUB.cx} cy={HUB.cy} r={HUB.r - 9} fill="none" stroke="var(--color-gold)" strokeWidth="1" />
      {node(730, 40, "entry")}
      {ROOMS.flatMap((room) => [
        node(room.spoke.x1, room.spoke.y1, `${room.role}-hub`),
        node(room.spoke.x2, room.spoke.y2, `${room.role}-plan`),
      ])}
    </svg>
  );
}

/** The plan, with its name set inside as the frame does. */
function RoomFigure({ room }: { room: RoomSpec }): React.JSX.Element {
  const { Icon } = room;
  // The frame sets a name that wraps one step down so it clears its own walls.
  const wraps = room.role.includes(" ");
  return (
    <figure
      className="absolute"
      style={{
        left: `${room.box.left}%`,
        top: `${room.box.top}%`,
        width: `${room.box.width}%`,
        height: `${room.box.height}%`,
      }}
    >
      <Image
        src={room.src}
        alt={room.alt}
        fill
        sizes="(min-width: 1024px) 33vw, 256px"
        className="object-contain"
      />
      {/* On the plan's own clear floor, not at its centre: mark, name, rule. */}
      <figcaption
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{
          left: `${room.label.x}%`,
          top: `${room.label.y}%`,
          width: `${room.label.measure}%`,
        }}
      >
        <Icon className="h-[2.2cqw] w-[2.2cqw] text-gold" />
        <span
          className={`mt-[0.6cqw] text-center font-display leading-[1.1] font-medium text-ink ${
            wraps ? "text-[1.86cqw]" : "text-[2.18cqw]"
          }`}
        >
          {room.role}
        </span>
        <span aria-hidden="true" className="mt-[0.8cqw] block h-px w-[3.4cqw] bg-gold" />
      </figcaption>
    </figure>
  );
}

function BoundaryNote({ className }: { className?: string }): React.JSX.Element {
  return (
    <aside className={`flex items-start gap-3 border-l-2 border-gold bg-ivory/70 py-3 pr-4 pl-5 ${className ?? ""}`}>
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gold text-gold">
        <AlertIcon className="h-4 w-4" />
      </span>
      <p className="font-body text-body-s leading-[1.55] text-charcoal">
        {SEPARATE_ROOMS.boundaryNote}
      </p>
    </aside>
  );
}

/* The id lives on the DESKTOP render only. This component is called twice —
   once for the canvas and once for the lg:hidden stack — so an id written
   inside it appeared twice in the document and every aria-labelledby
   pointing at it resolved to nothing. */
function CopyBlock({ compact, headingId }: { compact?: true; headingId?: string }): React.JSX.Element {
  return (
    <>
      <p
        className={`font-body font-semibold tracking-[0.2em] uppercase ${
          compact ? "text-[11px]" : "text-[0.78cqw]"
        }`}
      >
        <span className="text-gold-text">Orientation: </span>
        <span className="text-ink">{SEPARATE_ROOMS.orientation}</span>
      </p>
      <h2
        id={headingId}
        className={`va-reveal font-display leading-[1.14] font-medium tracking-[-0.01em] text-ink ${
          compact ? "mt-5 text-display-m text-balance" : "mt-[1.5cqw] text-[3.9cqw]"
        }`}
      >
        {SEPARATE_ROOMS.headline}
      </h2>
      <span
        aria-hidden="true"
        className={`flex items-center ${compact ? "mt-6 w-40" : "mt-[1.8cqw] w-[88%]"}`}
      >
        <span className="h-px flex-1 bg-gold" />
        <span className={`ml-1 block shrink-0 rounded-full bg-gold ${compact ? "h-1.5 w-1.5" : "h-[0.5cqw] w-[0.5cqw]"}`} />
      </span>
      <p
        className={`font-body leading-[1.6] text-charcoal ${
          compact ? "mt-6 text-body-m" : "mt-[1.8cqw] text-[1.02cqw]"
        }`}
      >
        {SEPARATE_ROOMS.body}
      </p>
    </>
  );
}

export function SeparateRooms(): React.JSX.Element {
  return (
    <section
      id="separate-rooms"
      aria-labelledby="separate-rooms-heading"
      className="va-rooms relative overflow-hidden"
    >
      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        <NetworkRoute />
        {ROOMS.map((room) => (
          <RoomFigure key={room.role} room={room} />
        ))}
        {/* The hub label sat 2.8% of the frame — 24px — above the ring it is
            set in. Measured off the frame's own ink: centre (63.48%, 48.32%),
            8.40% wide, wrapping after "Your". */}
        <p className="absolute top-[48.32%] left-[63.48%] w-[9%] -translate-x-1/2 -translate-y-1/2 text-center font-display text-[1.6cqw] leading-[1.15] font-medium text-ink">
          {SEPARATE_ROOMS.centerLabel}
        </p>
        <div className="absolute top-[18%] left-[3.6%] w-[30%]">
          <CopyBlock headingId="separate-rooms-heading" />
        </div>
        <BoundaryNote className="absolute right-[4%] bottom-[11%] w-[21%]" />
      </div>

      <div className="va-shell relative z-10 lg:hidden">
        <div className="px-6 pt-10 sm:px-10">
          <CopyBlock compact />
        </div>
        {/* Mobile: one trunk off the hub with five branches. The old stack
            chained room to room, which read as a referral pipeline — the
            opposite of what the copy claims. */}
        <div className="px-6 pb-14 sm:px-10">
          <div className="mt-10 flex flex-col items-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-gold bg-ivory">
              <span aria-hidden="true" className="absolute inset-2 rounded-full border border-gold" />
              <p className="px-6 text-center font-display text-xl leading-tight font-medium text-ink">
                {SEPARATE_ROOMS.centerLabel}
              </p>
            </div>
            <ul className="relative mt-8 w-full space-y-6 border-l-2 border-gold pl-8">
              {ROOMS.map((room) => {
                const { Icon } = room;
                return (
                  <li key={room.role} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 left-[-2.35rem] h-[2px] w-8 -translate-y-1/2 bg-gold"
                    />
                    <figure className="relative w-full max-w-[18rem]">
                      <Image
                        src={room.src}
                        alt={room.alt}
                        width={room.width}
                        height={room.height}
                        sizes="256px"
                        className="h-auto w-full"
                      />
                      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
                        <Icon className="h-5 w-5 text-gold" />
                        {/* max-w-[9ch] is narrower than "professional", and a
                            max-width cannot break a word: the line overhung
                            its own ivory chip and sat off the lockup's axis.
                            The chip has to be at least as wide as the longest
                            word it backs. */}
                        <span className="mt-1 max-w-[14ch] bg-ivory/80 px-1 text-center font-display text-lg leading-tight font-medium text-ink">
                          {room.role}
                        </span>
                        <span aria-hidden="true" className="mt-1 block h-px w-10 bg-gold" />
                      </figcaption>
                    </figure>
                  </li>
                );
              })}
            </ul>
          </div>
          <BoundaryNote className="mt-10" />
        </div>
      </div>
    </section>
  );
}
