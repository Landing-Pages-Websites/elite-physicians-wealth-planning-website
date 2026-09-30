import Image from "next/image";
import { SEPARATE_ROOMS } from "@/lib/content";
import SectionEyebrow from "./section-eyebrow";
import { NodeRule, ScaleBar, TargetRosette } from "./instrument";

/**
 * The coordination gap, drawn as a survey chart.
 *
 * The approved frame is a cartographic field: contour islands with nested
 * rings and cast shadows, dashed survey routes with gold nodes where they
 * cross, water along two edges, registration crosses scattered through it. The
 * build had five plain shapes and dotted lines, which is a diagram of the same
 * idea rather than the same drawing.
 *
 * The field is a generated plate carrying no lettering at all; every label is
 * live text positioned over its island.
 *
 * Those island centres HAD been "read off a percentage grid laid over the
 * plate", and reading them by eye is what the reviewer saw as "the text is not
 * centered so it looks sloppy". Every one of the six sat 2 to 3% of the field
 * height — about 24px on a 1440 canvas — above the island it names, and
 * "Insurance professional" was also set wider than its island, so it broke out
 * of the shape on both sides.
 *
 * `x`/`y` below are now the island's measured centre, and `measure` is the
 * width actually available INSIDE the island across the height the label block
 * occupies — both taken off contour-field.jpg by filling each island's outline
 * and reading its horizontal run. A label can no longer be set wider than the
 * shape it sits on, because `measure` caps it.
 *
 * The type came down a step with it. At the old size "Insurance professional"
 * needed 11.2% of the field and its island offers 10.9%; 1.7cqw is the largest
 * size at which all five role labels clear their own shapes. It is one size for
 * all five on purpose — CPA and Attorney sit side by side at the same height,
 * and sizing each label to its own island would show as a mismatch there.
 *
 * The unit is cqw, not vw. The canvas declares `@container` and the comment
 * below already claimed cqw, but the labels were sized in vw, so their type
 * tracked the window instead of the frame they are positioned on.
 */
type Island = {
  role: (typeof SEPARATE_ROOMS.roles)[number] | "priorities";
  label: string;
  /** Measured centre of the island, as a percentage of the 16:9 field. */
  x: number;
  y: number;
  /** Width available inside the island across the label block, same units. */
  measure: number;
  /** Priorities sits on the one filled island and is set larger. */
  hub?: true;
};

const ISLANDS: readonly Island[] = [
  { role: "CPA", label: "CPA", x: 48.5, y: 23.4, measure: 9.5 },
  { role: "Attorney", label: "Attorney", x: 78.6, y: 23.9, measure: 8.6 },
  { role: "priorities", label: SEPARATE_ROOMS.centerLabel, x: 67.2, y: 47.1, measure: 13, hub: true },
  { role: "TPA", label: "TPA", x: 90.6, y: 49.9, measure: 11.2 },
  { role: "Insurance professional", label: "Insurance\nprofessional", x: 48.35, y: 71.2, measure: 11.5 },
  { role: "Financial advisor", label: "Financial\nadvisor", x: 72.45, y: 79.7, measure: 12.6 },
] as const;

/** The small crosshair the frame sets above each island's name. */
function IslandMark(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mx-auto mb-2 h-5 w-5 text-ink/55"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 0.5 V6 M12 18 V23.5 M0.5 12 H6 M18 12 H23.5" />
    </svg>
  );
}

function IslandLabel({ island }: { island: Island }): React.JSX.Element {
  return (
    <p
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center leading-[1.15] font-bold text-ink"
      style={{
        left: `${island.x}%`,
        top: `${island.y}%`,
        width: `${island.measure}%`,
        fontSize: island.hub ? "clamp(1.15rem,2.5cqw,2.3rem)" : "clamp(0.95rem,1.65cqw,1.55rem)",
      }}
    >
      {!island.hub && <IslandMark />}
      {island.label.split("\n").map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}

function BoundaryNote({ className = "" }: { className?: string }): React.JSX.Element {
  return (
    <aside className={`flex items-start gap-3 border border-ink/45 bg-white/85 px-4 py-3 ${className}`}>
      <span aria-hidden="true" className="mt-0.5 h-6 w-px shrink-0 bg-gold" />
      <p className="font-display text-[13px] leading-[1.45] text-charcoal">
        {SEPARATE_ROOMS.boundaryNote}
      </p>
    </aside>
  );
}

/* The id lives on the DESKTOP render only. This component is called twice —
   once for the canvas and once for the lg:hidden stack — so an id written
   inside it appeared twice in the document and every aria-labelledby
   pointing at it resolved to nothing. */
function CopyBlock({ headingId }: { headingId?: string }): React.JSX.Element {
  return (
    <>
      <SectionEyebrow mark="rosette">{SEPARATE_ROOMS.orientation}</SectionEyebrow>
      <NodeRule className="mt-3 w-[88%] max-w-[22rem]" />
      <h2
        id={headingId}
        className="mt-6 max-w-[14ch] text-[clamp(2rem,3.05vw,3rem)] leading-[1.1] font-bold tracking-[-0.02em] text-ink"
      >
        {SEPARATE_ROOMS.headline}
      </h2>
      <p className="mt-6 max-w-[34ch] font-body text-[0.9375rem] leading-[1.65] text-charcoal">
        {SEPARATE_ROOMS.body}
      </p>
    </>
  );
}

export default function SeparateRooms(): React.JSX.Element {
  return (
    <section
      id="separate-rooms"
      aria-labelledby="separate-rooms-heading"
      className="relative overflow-hidden bg-atlas-paper"
    >
      {/* Desktop: the frame's own canvas. */}
      {/* `@container` + cqw: the canvas keeps the frame's 1536x864 ratio at
          every width, so its type has to scale with it. Fixed rem sizes held
          their pixel size while the box shrank — at 1024 the plates grew past
          their slots and overlapped each other and the CTA. 1cqw = 15.36px of
          the frame, so every size below is the frame's own measurement. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        <Image
          src="/images/design/b/03-separate-rooms/contour-field.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority={false}
        />

        {ISLANDS.map((island) => (
          <IslandLabel key={island.role} island={island} />
        ))}

        <div className="absolute top-[13%] left-[3.5%] w-[27%]">
          <CopyBlock headingId="separate-rooms-heading" />
        </div>

        <TargetRosette className="absolute bottom-[9%] left-[2.4%] h-9 w-9" />
        <ScaleBar className="absolute bottom-[11.4%] left-[7.4%] w-[19%]" />
        <BoundaryNote className="absolute right-[1.5%] bottom-[4%] w-[21%]" />
      </div>

      {/* Below the canvas the field cannot carry labels, so the same six
          become a plain list under a cropped strip of the chart. */}
      <div className="lg:hidden">
        <div className="relative aspect-3/2 w-full">
          <Image
            src="/images/design/b/03-separate-rooms/contour-field.jpg"
            alt="A survey chart showing five separate advisor islands around a central one"
            fill
            sizes="100vw"
            className="object-cover object-right"
          />
        </div>
        <div className="vb-shell py-14">
          <CopyBlock />
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3">
            {ISLANDS.filter((island) => !island.hub).map((island) => (
              <li key={island.role} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="font-body text-body-s font-semibold text-ink">
                  {island.label.replace("\n", " ")}
                </span>
              </li>
            ))}
          </ul>
          <BoundaryNote className="mt-8" />
        </div>
      </div>
    </section>
  );
}
