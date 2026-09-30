import Image from "next/image";
import { BLUEPRINT, LINKS } from "@/lib/content";
import GoldArrow from "./gold-arrow";
import { NodeRule, OutcomeNote, ScaleBar, TargetRosette, TickRail } from "./instrument";

const MAXIM_LINES = ["A structured process.", "A coordinated plan.", "A life of purpose."];

/**
 * The planning dial.
 *
 * The approved frame builds this section around an instrument face — concentric
 * rings, a dense tick scale, radial spokes with arrowheads — with the six
 * phases on beveled plates around its rim, each tied back to the dial by a gold
 * ring node. The build had replaced it with six circles on a horizontal line,
 * which is a process bar, not this drawing.
 *
 * The dial is a generated plate carrying no lettering. Card boxes and node
 * positions are read off a percentage grid laid over
 * public/design/b/refs/04-blueprint-rounds.png at its native 1536x864.
 */
type Phase = (typeof BLUEPRINT.phases)[number];

type PhaseCard = {
  /** Card box, percentages of the 1536x864 frame. */
  left: number;
  top: number;
  width: number;
  /**
   * Which edge of this plate faces the dial. The gold ring rides that edge
   * rather than sitting at a hand-typed coordinate — the plates are sized by
   * their own copy, so a fixed node position drifts off the plate the moment a
   * summary wraps to a different number of lines. That is exactly what
   * happened: every node floated 60px clear of the plate it belonged to.
   */
  face: "right" | "left" | "bottom" | "top";
};

const CARDS: readonly PhaseCard[] = [
  { left: 38, top: 21, width: 12.5, face: "right" },
  { left: 56.5, top: 6, width: 15, face: "bottom" },
  { left: 76, top: 25, width: 13.5, face: "left" },
  { left: 76.5, top: 52.5, width: 13.5, face: "left" },
  { left: 53.5, top: 68, width: 15.5, face: "top" },
  { left: 36, top: 52, width: 13.5, face: "right" },
] as const;

const NODE_POSITION: Record<PhaseCard["face"], string> = {
  right: "top-1/2 -right-2 -translate-y-1/2",
  left: "top-1/2 -left-2 -translate-y-1/2",
  bottom: "left-1/2 -bottom-2 -translate-x-1/2",
  top: "left-1/2 -top-2 -translate-x-1/2",
};

/** Dial plate: a square centred in the field's right two-thirds. */
const DIAL = { left: 43, top: 15, width: 36 };

function PhasePlate({ phase, card }: { phase: Phase; card: PhaseCard }): React.JSX.Element {
  return (
    <li
      className="absolute"
      style={{ left: `${card.left}%`, top: `${card.top}%`, width: `${card.width}%` }}
    >
      {/* The node sits OUTSIDE the clipped plate. Inside it, the bevel's
          clip-path cut it in half — the ring rendered as a crescent on every
          one of the six. */}
      <span
        aria-hidden="true"
        className={`absolute z-10 h-3.5 w-3.5 rounded-full border-2 border-gold bg-white ${NODE_POSITION[card.face]}`}
      />
      <div className="vb-bevel bg-ink/30 p-px shadow-[0_10px_24px_-14px_rgba(11,31,58,0.45)]">
        <div className="vb-bevel bg-white px-[1.05cqw] py-[0.8cqw]">
          <p className="flex items-baseline gap-2">
            <span className="text-[1.667cqw] leading-none font-bold tracking-[-0.01em] text-ink">
              {phase.number}
            </span>
            <span className="text-[0.99cqw] leading-none font-bold text-ink">{phase.name}</span>
          </p>
          <p className="mt-2 font-body text-[0.729cqw] leading-[1.45] text-charcoal">
            {phase.summary}
          </p>
        </div>
      </div>
    </li>
  );
}

function ProcessCta({ className }: { className: string }): React.JSX.Element {
  return (
    <a
      href={LINKS.process}
      className={`group vb-bevel inline-flex items-center gap-3 border border-gold/60 bg-ink px-7 py-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-ink-hover ${className}`}
    >
      {BLUEPRINT.cta}
      <GoldArrow className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </a>
  );
}

function Maxims({ className = "" }: { className?: string }): React.JSX.Element {
  return (
    <p className={`font-display text-[0.95rem] leading-[1.5] italic text-ink/80 ${className}`}>
      {MAXIM_LINES.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}

/* The id lives on the DESKTOP render only. This component is called twice —
   once for the canvas and once for the lg:hidden stack — so an id written
   inside it appeared twice in the document and every aria-labelledby
   pointing at it resolved to nothing. */
function CopyBlock({ headingId }: { headingId?: string }): React.JSX.Element {
  return (
    <>
      {/* The frame sets this band's orientation line in serif italic, not in
          the direction's cap eyebrow. Kept as drawn. */}
      <p className="font-display text-[1.15rem] italic text-ink/85">{BLUEPRINT.orientation}</p>
      <h2
        id={headingId}
        className="mt-4 max-w-[13ch] text-[clamp(2rem,3.1vw,3.05rem)] leading-[1.08] font-bold tracking-[-0.02em] text-ink"
      >
        {BLUEPRINT.headline}
      </h2>
      <NodeRule className="mt-6 w-[52%] max-w-[13rem]" />
      <p className="mt-6 max-w-[36ch] font-body text-[0.9375rem] leading-[1.65] text-charcoal">
        <strong className="font-semibold text-ink">A structured process</strong>
        {BLUEPRINT.body.replace("A structured process", "")}
      </p>
    </>
  );
}

export default function BlueprintRounds(): React.JSX.Element {
  return (
    <section
      id="blueprint-rounds"
      aria-labelledby="blueprint-rounds-heading"
      className="relative overflow-hidden bg-white"
    >
      {/* Desktop: the frame's own canvas. */}
      {/* `@container` + cqw: the canvas keeps the frame's 1536x864 ratio at
          every width, so its type has to scale with it. Fixed rem sizes held
          their pixel size while the box shrank — at 1024 the plates grew past
          their slots and overlapped each other and the CTA. 1cqw = 15.36px of
          the frame, so every size below is the frame's own measurement. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        <div
          aria-hidden="true"
          className="absolute"
          style={{ left: `${DIAL.left}%`, top: `${DIAL.top}%`, width: `${DIAL.width}%` }}
        >
          <div className="relative aspect-square w-full">
            <Image
              src="/images/design/b/04-blueprint-rounds/orrery-dial.png"
              alt=""
              fill
              sizes="45vw"
              className="object-contain"
            />
          </div>
        </div>

        <ol>
          {BLUEPRINT.phases.map((phase, index) => (
            <PhasePlate key={phase.number} phase={phase} card={CARDS[index]} />
          ))}
        </ol>

        {/* Perimeter instrument furniture, placed off the frame. */}
        <TickRail orientation="horizontal" ticks={30} className="absolute top-[2%] left-[3.5%] w-[34%]" />
        <TickRail ticks={28} className="absolute top-[3%] bottom-[12%] left-[2%]" />
        <ScaleBar className="absolute bottom-[8.5%] left-[6.5%] w-[38%]" />
        <TargetRosette className="absolute top-[0.6%] left-[1.2%] h-8 w-8" />
        <TargetRosette className="absolute bottom-[6.4%] left-[1.2%] h-8 w-8" />

        <div className="absolute top-[13%] left-[4.5%] w-[33%]">
          <CopyBlock headingId="blueprint-rounds-heading" />
        </div>

        <p className="absolute top-[6%] left-[37.5%] flex items-start gap-2 font-display text-[0.95rem] leading-[1.45] italic text-ink/80">
          <span className="block">
            Decisions aligned.
            <br />
            Life in focus.
          </span>
          <span aria-hidden="true" className="mt-2 block h-px w-10 bg-gold/70" />
          <span aria-hidden="true" className="mt-[5px] block h-1.5 w-1.5 rounded-full bg-gold" />
        </p>

        <div className="absolute bottom-[11%] left-[5.5%] flex gap-3">
          <span aria-hidden="true" className="w-6 border-t border-l border-gold/70" />
          <Maxims />
        </div>

        <div className="absolute right-[3.5%] bottom-[9%] w-[21%]">
          <ProcessCta className="w-full justify-center" />
          <OutcomeNote label="Navigate to /our-process" className="mt-3" />
        </div>
      </div>

      {/* Below the canvas the dial cannot hold six plates, so the phases run as
          a numbered spine and the dial becomes a quiet ground behind them. */}
      <div className="relative vb-shell py-14 lg:hidden">
        <CopyBlock />
        <ol className="mt-10 grid gap-3">
          {BLUEPRINT.phases.map((phase) => (
            <li
              key={phase.number}
              className="vb-bevel border border-ink/20 bg-white px-5 py-4 shadow-[0_10px_24px_-16px_rgba(11,31,58,0.4)]"
            >
              <p className="flex items-baseline gap-2.5">
                <span className="text-2xl leading-none font-bold text-ink">{phase.number}</span>
                <span className="text-base leading-none font-bold text-ink">{phase.name}</span>
              </p>
              <p className="mt-2 font-body text-body-s leading-[1.5] text-charcoal">
                {phase.summary}
              </p>
            </li>
          ))}
        </ol>
        <Maxims className="mt-8" />
        <ProcessCta className="mt-8" />
      </div>
    </section>
  );
}
