import Image from "next/image";
import { CAREER_SIGNAL } from "@/lib/content";

/**
 * The career axis, as the frame draws it.
 *
 * The frame is a surveyed strip: a pale field with topographic contours in the
 * lower left and a protractor arc in the upper right, and one long ruled line
 * DESCENDING left to right with dense tick marks along it, four gold nodes on
 * the line, and a stem rising from each to its stage.
 *
 * The build had a flat level line on plain white, with a comment justifying it:
 * "a career axis that falls reads as decline, so the rail is level." That was
 * an approved drawing overruled by an opinion — the reviewer's note on this
 * band was "this looks very bare, the design at least has some style to it."
 * The line descends, as drawn.
 *
 * Geometry measured from public/design/b/refs/02-career-signal.png at its
 * native 1536x512: the rule runs y=223 to y=452, and the four nodes sit on it.
 */
const FRAME = { w: 1536, h: 512 } as const;
const RULE = { x1: 0, y1: 223, x2: FRAME.w, y2: 452 } as const;

/** Node x-positions, measured off the frame. y is derived from the rule. */
const NODE_XS = [286, 618, 942, 1242] as const;

function ruleY(x: number): number {
  return RULE.y1 + ((RULE.y2 - RULE.y1) * (x - RULE.x1)) / (RULE.x2 - RULE.x1);
}

/** The ruled axis: one line, a tick every 24 units, a longer tick every fifth. */
function Axis(): React.JSX.Element {
  const ticks = [];
  for (let i = 0, x = 18; x < FRAME.w; x += 24, i += 1) {
    const major = i % 5 === 0;
    const y = ruleY(x);
    ticks.push(
      <line
        key={x}
        x1={x}
        y1={y}
        x2={x}
        y2={y + (major ? 16 : 8)}
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  return (
    <svg
      viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-ink"
      fill="none"
    >
      <line
        x1={RULE.x1}
        y1={RULE.y1}
        x2={RULE.x2}
        y2={RULE.y2}
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <g opacity="0.6">{ticks}</g>
      {/* Seam marker to 03, and the index mark the frame sets top right. */}
      <line x1="767" y1="461" x2="767" y2="500" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1="1264" y1="44" x2="1536" y2="44" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StageMarker({ x, label }: { x: number; label: string }): React.JSX.Element {
  const y = ruleY(x);
  return (
    <li
      className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
      style={{ left: `${(x / FRAME.w) * 100}%`, top: `${(y / FRAME.h) * 100}%` }}
    >
      {/* At 13cqw the first label set one wide line that came within 15px of
          the section H2 — the frame leaves 33px. Breaking after "Resident to"
          and shortening the stem drops the block clear. */}
      <p className="mb-[1.1cqw] max-w-[10cqw] text-center text-[1.04cqw] leading-[1.3] font-bold text-ink">
        {label}
      </p>
      <span aria-hidden="true" className="h-[3.4cqw] w-px bg-ink/70" />
      <span
        aria-hidden="true"
        className="absolute bottom-[-0.42cqw] left-1/2 h-[0.84cqw] w-[0.84cqw] -translate-x-1/2 rounded-full bg-gold"
      />
    </li>
  );
}

export default function CareerSignal(): React.JSX.Element {
  return (
    <section
      data-mega-section="career-signal"
      id="career-signal"
      aria-labelledby="career-signal-heading"
      className="relative overflow-hidden bg-white"
    >
      {/* The navy seam the frame sets across the top of this band. */}
      <div aria-hidden="true" className="h-[6px] bg-ink" />

      {/* Desktop: the frame's own canvas — 1536x512, not the 16:9 of the others. */}
      <div className="@container relative hidden aspect-1536/512 w-full lg:block">
        <Image
          src="/images/design/b/02-career-signal/survey-field.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <Axis />

        <h2
          id="career-signal-heading"
          className="absolute top-[11%] left-[6.3%] max-w-[38%] text-[2.72cqw] leading-[1.15] font-bold tracking-[-0.02em] text-ink"
        >
          {CAREER_SIGNAL.identityLine}
        </h2>

        <ol>
          {CAREER_SIGNAL.signals.map((signal, index) => (
            <StageMarker key={signal} x={NODE_XS[index]} label={signal} />
          ))}
        </ol>

        <span
          aria-hidden="true"
          className="absolute top-[8.6%] left-[91.8%] h-[0.84cqw] w-[0.84cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold"
        />
      </div>

      {/* Below the canvas the axis cannot carry four stems, so it stands up as
          a rail with the same nodes on it. */}
      <div className="vb-shell py-14 lg:hidden">
        <h2 className="max-w-[22ch] text-display-m leading-[1.15] font-bold tracking-[-0.02em] text-ink">
          {CAREER_SIGNAL.identityLine}
        </h2>
        <ol className="relative mt-10 space-y-7 border-l border-ink/40 pl-7">
          {CAREER_SIGNAL.signals.map((signal, index) => (
            <li key={signal} className="relative">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-[calc(1.75rem+4px)] h-2 w-2 rounded-full bg-gold"
              />
              <p
                className={`leading-snug font-bold ${
                  index === CAREER_SIGNAL.signals.length - 1
                    ? "text-body-m text-ink"
                    : "text-body-s text-ink/80"
                }`}
              >
                {signal}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
