import Image from "next/image";
import { FIVE_DECISIONS } from "@/lib/content";
import SectionEyebrow from "./section-eyebrow";
import { CornerBracket, NodeRule, ScaleBar, TickRail } from "./instrument";

const PULL_LINE = "One life. Five disciplines. Aligned by design.";

/**
 * Five descending columns, measured off the approved frame.
 *
 * This had been rebuilt as a plain ruled list, with a comment arguing that a
 * descending silhouette "asserts rank and decline" — an approved design
 * overruled by an opinion nobody asked for, and the clearest single reason the
 * build stopped looking designed. The frame's intent is a measured instrument
 * reading; a table is not a quieter version of that, it is a different thing.
 *
 * Every number here is measured from public/design/b/refs/05-five-decisions.png
 * at its native 1536x864: column lefts and widths from a scanline across the
 * tinted fills, tops by walking each column's centre upward, the shared name
 * baseline from the first dark text row, the bottom scale bar from the last
 * dark run above the section edge.
 */
type Column = {
  /** Percentages of the 1536x864 frame. */
  left: number;
  width: number;
  top: number;
};

const COLUMNS: readonly Column[] = [
  { left: 32.68, width: 14.97, top: 3.59 },
  { left: 47.85, width: 12.37, top: 8.56 },
  { left: 60.42, width: 12.3, top: 14.93 },
  { left: 72.98, width: 12.04, top: 22.8 },
  { left: 85.22, width: 8.46, top: 29.05 },
] as const;

/** Where every discipline name starts, regardless of its column's height. */
const NAME_TOP = 42.71;
const COLUMN_BOTTOM = 96.88;

function ColumnField(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {COLUMNS.map((column, index) => (
        <div
          key={index}
          className="absolute overflow-hidden"
          style={{
            left: `${column.left}%`,
            width: `${column.width}%`,
            top: `${column.top}%`,
            bottom: `${100 - COLUMN_BOTTOM}%`,
          }}
        >
          {/* One texture, offset per column so no two read as the same tile. */}
          <Image
            src="/images/design/b/05-five-decisions/cloud-texture.jpg"
            alt=""
            fill
            sizes="15vw"
            className="object-cover"
            style={{ objectPosition: `${18 + index * 16}% ${10 + index * 14}%` }}
          />
          <span className="absolute inset-0 bg-atlas-tint/45" />
        </div>
      ))}
    </div>
  );
}

function Discipline({
  discipline,
  column,
}: {
  discipline: (typeof FIVE_DECISIONS.disciplines)[number];
  column: Column;
}): React.JSX.Element {
  return (
    <li
      className="absolute"
      style={{
        left: `${column.left}%`,
        width: `${column.width}%`,
        top: `${NAME_TOP}%`,
      }}
    >
      {/* The gold rule runs beside the name inside its column, not under it. */}
      <div className="relative pl-4">
        <span aria-hidden="true" className="absolute top-1 bottom-0 left-0 w-px bg-gold" />
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 h-1.5 w-1.5 -translate-x-[3px] rounded-full bg-gold"
        />
        <h3 className="pr-[22%] text-[1.406cqw] leading-[1.15] font-bold tracking-[-0.01em] text-ink">
          {discipline.name}
        </h3>
        <p className="mt-3 pr-[22%] font-body text-[0.977cqw] leading-[1.55] text-charcoal">
          {discipline.summary}
        </p>
      </div>
    </li>
  );
}

export default function FiveDecisions(): React.JSX.Element {
  return (
    <section
      data-mega-section="five-decisions"
      id="five-decisions"
      aria-labelledby="five-decisions-heading"
      className="relative overflow-hidden bg-white"
    >
      {/* Desktop: the frame's own canvas, so every measured percentage lands
          where the reference puts it at any width. */}
      {/* `@container` + cqw: the canvas keeps the frame's 1536x864 ratio at
          every width, so its type has to scale with it. Fixed rem sizes held
          their pixel size while the box shrank — at 1024 the plates grew past
          their slots and overlapped each other and the CTA. 1cqw = 15.36px of
          the frame, so every size below is the frame's own measurement. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        <ColumnField />

        <TickRail ticks={34} indexAt={13} className="absolute top-[3.4%] bottom-[8.5%] left-[1.6%]" />
        <ScaleBar className="absolute bottom-[4.2%] left-[1.6%] w-[24.6%]" />

        <CornerBracket corner="tr" className="absolute top-[1.5%] right-[2.2%] h-[5%] w-[8%]" />
        <span aria-hidden="true" className="vb-leader-v absolute top-[6.5%] right-[2.2%] h-[44%] w-px" />

        <div className="absolute top-[7.4%] left-[6.9%] w-[25%]">
          <SectionEyebrow>{FIVE_DECISIONS.orientation}</SectionEyebrow>
          <NodeRule className="mt-3 w-[85%]" />
          <h2
            id="five-decisions-heading"
            className="mt-7 max-w-[11.5ch] text-[3.02cqw] leading-[1.1] font-bold tracking-[-0.02em] text-ink"
          >
            {FIVE_DECISIONS.headline}
          </h2>
          <span aria-hidden="true" className="mt-6 block h-px w-12 bg-ink/60" />
          <p className="mt-6 font-display text-lg leading-snug italic text-ink/85">
            {PULL_LINE}
          </p>
          <div className="relative mt-14 pl-4">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-gold" />
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 h-1.5 w-1.5 -translate-x-[3px] rounded-full bg-gold"
            />
            <p className="font-body text-[0.846cqw] leading-[1.6] text-charcoal">
              {FIVE_DECISIONS.boundaryNote}
            </p>
          </div>
        </div>

        <ol>
          {FIVE_DECISIONS.disciplines.map((discipline, index) => (
            <Discipline key={discipline.name} discipline={discipline} column={COLUMNS[index]} />
          ))}
        </ol>
      </div>

      {/* Below the frame's canvas the columns cannot survive, so the content
          stacks — each discipline keeps its tinted plate and its gold rule,
          which is the part of the frame that carries the meaning. */}
      <div className="vb-shell py-16 lg:hidden">
        <SectionEyebrow>{FIVE_DECISIONS.orientation}</SectionEyebrow>
        <NodeRule className="mt-3 w-40" />
        <h2 className="mt-6 text-display-m leading-[1.1] font-bold tracking-[-0.02em] text-ink">
          {FIVE_DECISIONS.headline}
        </h2>
        <p className="mt-5 font-display text-lg leading-snug italic text-ink/85">{PULL_LINE}</p>
        <ol className="mt-10 grid gap-4">
          {FIVE_DECISIONS.disciplines.map((discipline) => (
            <li
              key={discipline.name}
              className="relative overflow-hidden bg-atlas-tint/45 py-5 pr-5 pl-6"
            >
              <span aria-hidden="true" className="absolute inset-y-4 left-3 w-px bg-gold" />
              <h3 className="text-xl leading-tight font-bold text-ink">{discipline.name}</h3>
              <p className="mt-2 font-body text-body-s leading-[1.6] text-charcoal">
                {discipline.summary}
              </p>
            </li>
          ))}
        </ol>
        <div className="relative mt-8 pl-4">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-gold" />
          <p className="font-body text-[13px] leading-[1.6] text-charcoal">
            {FIVE_DECISIONS.boundaryNote}
          </p>
        </div>
      </div>
    </section>
  );
}
