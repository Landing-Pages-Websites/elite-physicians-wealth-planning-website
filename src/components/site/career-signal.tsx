import { CAREER_SIGNAL } from "@/lib/content";

/**
 * The career strip, built to the approved frame.
 *
 * The frame is a short navy band over a very dark office plate: a two-line
 * heading whose first line is gold with "focused" in italic, then one gold rule
 * carrying a short tick above each of the four stages, curving up at its right
 * end and leaving through the top-right corner. A stub drops from the middle of
 * the foot as the seam into 03.
 *
 * Geometry measured from public/design/a/refs/02-career-signal.png at its
 * native 1536x512.
 */
const FRAME = { w: 1536, h: 512 } as const;

/** Tick x-positions along the rule, measured off the frame. */
const STAGE_XS = [243, 580, 925, 1254] as const;
const RULE_Y = 251;

/**
 * Each stage label is set on two lines in the frame, gold over ivory, and the
 * break is not one a measure can find: line 2 of "One strategy," carries 24
 * characters where line 1 of "Resident to" carries 11, so any box wide enough
 * for the first is wide enough to pull "established" up onto the second. These
 * are the frame's own breaks, given as the number of words on line 1.
 */
const STAGE_LEAD_WORDS = [2, 2, 3, 2] as const;

function StageLabel({ text, leadWords }: { text: string; leadWords: number }): React.JSX.Element {
  const words = text.split(" ");
  return (
    <>
      <span className="block text-gold">{words.slice(0, leadWords).join(" ")}</span>
      <span className="block text-ivory-bright">{words.slice(leadWords).join(" ")}</span>
    </>
  );
}

/** The heading breaks at "across"; the first line is gold, the second ivory. */
function headingParts(): { lead: string; tail: string } {
  const line: string = CAREER_SIGNAL.identityLine;
  const at = line.indexOf("across");
  if (at === -1) return { lead: line, tail: "" };
  return { lead: line.slice(0, at).trim(), tail: line.slice(at).trim() };
}

/** "Physician-focused" sets "focused" in italic in the frame. */
function GoldLead({ text }: { text: string }): React.JSX.Element {
  const marker = "focused";
  const at = text.indexOf(marker);
  if (at === -1) return <span className="text-gold">{text}</span>;
  return (
    <span className="text-gold">
      {text.slice(0, at)}
      <em className="italic">{marker}</em>
      <span className="text-ivory-bright">{text.slice(at + marker.length)}</span>
    </span>
  );
}

function StageRule(): React.JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
    >
      <g stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* The rule, then up and out through the top-right corner. */}
        <path
          d={`M${STAGE_XS[0]} ${RULE_Y} H1240 Q1290 ${RULE_Y} 1300 ${RULE_Y - 60} Q1316 130 1372 96 H1536`}
          vectorEffect="non-scaling-stroke"
        />
        {STAGE_XS.map((x) => (
          <path key={x} d={`M${x} ${RULE_Y - 22} V${RULE_Y}`} vectorEffect="non-scaling-stroke" />
        ))}
        {/* Seam stub into 03. */}
        <path d="M768 431 V501" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

export function CareerSignal(): React.JSX.Element {
  const { lead, tail } = headingParts();
  return (
    <section
      id="career-signal"
      aria-labelledby="career-signal-heading"
      className="va-career relative overflow-hidden"
    >
      {/* Desktop: the frame's own canvas — 1536x512, not the 16:9 of the rest. */}
      <div className="@container relative hidden aspect-1536/512 w-full lg:block">
        <StageRule />

        <h2
          id="career-signal-heading"
          className="va-reveal absolute top-[13%] left-[3.8%] font-display text-[2.35cqw] leading-[1.35] font-medium tracking-[-0.01em]"
        >
          <span className="block">
            <GoldLead text={lead} />
          </span>
          <span className="block text-ivory-bright">{tail}</span>
        </h2>

        <ol>
          {CAREER_SIGNAL.signals.map((signal, index) => (
            <li
              key={signal}
              // 13% was narrower than every label's natural measure, so all
              // four broke at a different word and three ended on a one-word
              // orphan. No single width fixes it: the frame wants line 2 of
              // "One strategy," to hold 24 characters while line 1 of
              // "Resident to" holds 11, so any width wide enough for one is too
              // wide for the other. The frame's own break is carried in
              // STAGE_BREAKS and the box is only a guard against overflow.
              className="absolute w-[19%] -translate-x-1/2 text-center font-display text-[1.85cqw] leading-[1.35] font-medium"
              style={{
                left: `${(STAGE_XS[index] / FRAME.w) * 100}%`,
                top: `${(287 / FRAME.h) * 100}%`,
              }}
            >
              <StageLabel text={signal} leadWords={STAGE_LEAD_WORDS[index]} />
            </li>
          ))}
        </ol>
      </div>

      {/* Below the canvas the rule stands up as a spine. */}
      <div className="va-shell py-12 lg:hidden">
        <h2 className="relative font-display text-display-m leading-[1.3] font-medium tracking-[-0.01em]">
          <span className="block">
            <GoldLead text={lead} />
          </span>
          <span className="block text-ivory-bright">{tail}</span>
        </h2>
        <ol className="relative mt-8 space-y-6 border-l border-gold/70 pl-6">
          {CAREER_SIGNAL.signals.map((signal) => (
            <li key={signal} className="relative">
              <span
                aria-hidden="true"
                className="absolute top-[0.55em] -left-[calc(1.5rem+3px)] h-1.5 w-1.5 rounded-full bg-gold"
              />
              <p className="font-display text-lg leading-snug font-medium text-ivory-bright">
                {signal}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
