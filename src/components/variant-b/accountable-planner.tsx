import Image from "next/image";
import { ACCOUNTABLE_PLANNER, LINKS, PORTRAIT } from "@/lib/content";
import { splitNameCredentials } from "@/components/site/portrait-caption";
import SectionEyebrow from "./section-eyebrow";
import { NodeRule, RegistrationCross, TargetRosette } from "./instrument";

const DESK_IMAGE = "/images/design/b/07-accountable-planner/medical-finance-desk-background.jpg";

/**
 * Meet the planner, as the frame builds it.
 *
 * The frame is one large cut-corner plate floating on a cream ground, with a
 * pale offset plate behind it, the desk photograph bleeding off the left edge
 * behind both, registration crosses at the plate's inner corners, and a navy
 * CREDENTIALS chip under a cut-corner portrait frame. The reviewer's note was
 * "I would shift the background image a bit right here, and copy the card
 * format via png shape" — the shape is the point, so it is a clip-path rather
 * than an image, which keeps the plate crisp at every width.
 */
function CredentialChip(): React.JSX.Element {
  const { credentials } = splitNameCredentials();
  return (
    <div className="vb-plate-sm inline-flex items-center gap-[1.1cqw] bg-ink px-[1.6cqw] py-[1cqw]">
      <span className="font-body text-[0.68cqw] font-bold tracking-[0.16em] text-white/85 uppercase">
        Credentials
      </span>
      <span aria-hidden="true" className="flex items-center">
        <span className="h-[0.5cqw] w-[0.5cqw] rounded-full bg-gold" />
        <span className="h-px w-[3.4cqw] bg-gold" />
      </span>
      <span className="text-[1.35cqw] leading-none font-bold text-white">
        {credentials.replace(/,\s*/g, " | ")}
      </span>
    </div>
  );
}

function PlannerNarrative(): React.JSX.Element {
  const { name, credentials } = splitNameCredentials();
  return (
    <>
      <span className="flex items-center gap-[1.4cqw]">
        <SectionEyebrow>{ACCOUNTABLE_PLANNER.orientation}</SectionEyebrow>
        <NodeRule className="w-[7.5cqw]" />
      </span>
      <h2
        id="accountable-planner-heading"
        // Unbounded, line 1 pulled the next sentence's article onto it and read
        // "One planning relationship. A". The frame breaks at the sentence.
        className="mt-[1.3cqw] max-w-[24ch] text-[2.5cqw] leading-[1.12] font-bold tracking-[-0.02em] text-ink"
      >
        {ACCOUNTABLE_PLANNER.headline}
      </h2>
      <span aria-hidden="true" className="vb-hairline mt-[1.6cqw] block h-px w-full" />
      <p className="mt-[1.4cqw] text-[1.85cqw] leading-none font-bold text-ink">
        {name}
        {credentials ? (
          <span className="text-[1.25cqw] font-bold">, {credentials}</span>
        ) : null}
      </p>
      <p className="mt-[1.2cqw] font-body text-[1.02cqw] leading-[1.55] text-charcoal">
        {ACCOUNTABLE_PLANNER.body}
      </p>
      <span aria-hidden="true" className="vb-hairline mt-[1.5cqw] block h-px w-full" />
    </>
  );
}

function MeetAction({ compact }: { compact?: true }): React.JSX.Element {
  return (
    <a
      href={LINKS.meetMichael}
      className={`vb-plate-sm group inline-flex items-center bg-ink font-bold text-white transition-colors duration-200 hover:bg-ink-hover ${
        compact ? "min-h-12 gap-3 px-6 text-sm" : "gap-[1.2cqw] px-[2cqw] py-[1.1cqw] text-[1.35cqw]"
      }`}
    >
      <span aria-hidden="true" className="text-gold">
        &rsaquo;
      </span>
      {ACCOUNTABLE_PLANNER.cta}
      {compact ? null : (
        <>
          <span aria-hidden="true" className="h-px w-[3.5cqw] bg-gold" />
          <TargetRosette className="h-[1.5cqw] w-[1.5cqw] text-white" />
        </>
      )}
    </a>
  );
}

export default function AccountablePlanner(): React.JSX.Element {
  return (
    <section
      data-mega-section="accountable-planner"
      id="accountable-planner"
      aria-labelledby="accountable-planner-heading"
      className="relative overflow-hidden bg-atlas-paper"
    >
      {/* Desktop: the frame's own canvas. */}
      <div className="@container relative hidden aspect-1536/864 w-full lg:block">
        {/* The desk photograph bleeds off the left edge behind the plate. */}
        <div className="absolute inset-y-0 left-0 w-[24%] overflow-hidden">
          <Image
            src={DESK_IMAGE}
            alt=""
            fill
            sizes="26vw"
            className="object-cover"
            style={{ objectPosition: "6% 42%" }}
          />
        </div>

        {/* The offset plate behind, then the plate itself. */}
        <div
          aria-hidden="true"
          className="vb-plate absolute top-[8.5%] left-[20.5%] h-[86%] w-[75%] bg-atlas-tint/70"
        />
        <div className="vb-plate absolute top-[6.4%] left-[18.9%] h-[86%] w-[75%] bg-white">
          <div className="relative h-full w-full px-[3cqw] py-[2.6cqw]">
            <RegistrationCross className="absolute top-[1.6cqw] left-[1.6cqw] h-[1cqw] w-[1cqw] text-ink/45" />
            <RegistrationCross className="absolute top-[1.6cqw] right-[1.6cqw] h-[1cqw] w-[1cqw] text-ink/45" />
            <RegistrationCross className="absolute bottom-[1.6cqw] left-[1.6cqw] h-[1cqw] w-[1cqw] text-ink/45" />
            <RegistrationCross className="absolute right-[1.6cqw] bottom-[1.6cqw] h-[1cqw] w-[1cqw] text-ink/45" />

            <div className="grid h-full grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)] items-start gap-[3cqw]">
              <div className="flex flex-col">
                <div className="vb-plate-sm relative aspect-[333/450] w-full overflow-hidden bg-mist/50">
                  <Image
                    src={PORTRAIT.src}
                    alt={PORTRAIT.alt}
                    fill
                    sizes="24vw"
                    className="object-cover object-top"
                  />
                </div>
                <div className="mt-[1.4cqw]">
                  <CredentialChip />
                </div>
              </div>

              <div className="flex h-full flex-col">
                <PlannerNarrative />
                {/* The frame closes this column on a note reading "Use only
                    ChFC® and RICP®. Do not add badges, awards, fiduciary
                    claims, licenses, or other credentials." That is an
                    instruction to whoever builds the page, not copy for a
                    visitor — it stays in content.ts as a constraint and in
                    build/CLIENT-GAPS.md, and the action takes the space rather
                    than leaving the plate with a hole in it. */}
                {/* `mt-auto` pinned this to the bottom of the plate and left
                    227px of empty column above it — the hole the note above
                    says it exists to avoid. It follows the paragraph instead. */}
                <div className="pt-[1.6cqw]">
                  <MeetAction />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The seam marks the frame sets outside the plate. */}
        <TargetRosette className="absolute top-[6.4%] right-[4.5%] h-[1.7cqw] w-[1.7cqw] text-ink/70" />
        <span aria-hidden="true" className="absolute right-0 bottom-[3.4%] left-0 h-px bg-ink/50" />
        <TargetRosette className="absolute bottom-[3.4%] left-1/2 h-[1.7cqw] w-[1.7cqw] -translate-x-1/2 translate-y-1/2 text-ink/70" />
      </div>

      {/* Below the canvas the plate stands down to a single column. */}
      <div className="vb-shell py-14 lg:hidden">
        <div className="vb-plate-sm relative mx-auto aspect-[333/430] w-full max-w-[20rem] overflow-hidden bg-mist/50">
          <Image src={PORTRAIT.src} alt={PORTRAIT.alt} fill sizes="320px" className="object-cover object-top" />
        </div>
        <div className="mt-8">
          <SectionEyebrow>{ACCOUNTABLE_PLANNER.orientation}</SectionEyebrow>
          <h2 className="mt-5 text-display-m leading-[1.12] font-bold tracking-[-0.02em] text-ink">
            {ACCOUNTABLE_PLANNER.headline}
          </h2>
          <p className="mt-6 text-2xl leading-none font-bold text-ink">
            {ACCOUNTABLE_PLANNER.name}
          </p>
          <p className="mt-4 font-body text-body-m leading-[1.55] text-charcoal">
            {ACCOUNTABLE_PLANNER.body}
          </p>
          <div className="mt-8">
            <MeetAction compact />
          </div>
        </div>
      </div>
    </section>
  );
}
