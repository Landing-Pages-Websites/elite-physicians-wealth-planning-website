import Image from "next/image";
import type { PageContent } from "@/lib/pages";
import { Breadcrumbs } from "./breadcrumbs";

export type HeroImage = { readonly src: string; readonly alt: string };

/**
 * NEW UNAPPROVED SURFACE — interior pages have no approved frame.
 *
 * Built from Direction A's own language rather than a generic page header: the
 * navy ground the homepage hero uses, Cormorant at display scale, the gold
 * coordination line, and — where one honestly exists — a photograph bleeding to
 * the frame's right and bottom edges.
 *
 * TWO THINGS THIS LAYOUT GETS RIGHT THE HARD WAY.
 *
 * The figure is a sibling of `.va-shell`, not a child of it. `.va-shell` is
 * unlayered CSS and Tailwind utilities live in `@layer utilities`, so an
 * unlayered `width` beats `lg:w-[52%]` no matter what the class list says. With
 * the figure inside the shell it positioned against a full-width parent and sat
 * on top of the copy — the contrast gate caught the eyebrow at 1.1:1 on three
 * routes, reading gold type against a bright operatory. The copy column carries
 * its own width on an inner div where nothing competes for it.
 *
 * The motif is drawn in CSS pixels rather than an SVG viewBox. With
 * preserveAspectRatio="none" the crossbar at y=40 of a 460-unit box landed at
 * 49px on a short band and 67px on a tall one — both under the 86px fixed
 * header, so the horizontal arm was invisible on all 28 routes — and the node
 * scaled with it, rendering as an ellipse of a different aspect per page.
 */
export function PageHero({
  page,
  trail,
  image,
}: {
  page: PageContent;
  trail?: readonly { href: string; label: string }[];
  /**
   * Assigned only where the subject IS the page's own subject. Nothing is
   * reused across an unrelated role and nothing is assigned to make a page look
   * fuller: a photograph of the wrong thing is worse than air.
   */
  image?: HeroImage;
}): React.JSX.Element {
  return (
    <section
      data-dark-band
      className="relative overflow-hidden bg-ink pt-[calc(var(--header-h)+1px)]"
    >
      {image ? (
        <figure className="va-reveal relative aspect-4/3 w-full overflow-hidden bg-ink-deep sm:aspect-21/9 lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:h-full lg:w-[46%]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="object-cover"
            priority
          />
          {/* One stop, on the seam only. The photograph carries no type, so it
              gets no scrim over its subject — it only has to hand off to the
              navy on its leading edge. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent lg:inset-y-0 lg:right-auto lg:h-full lg:w-32 lg:bg-gradient-to-r"
          />
        </figure>
      ) : null}

      <div
        aria-hidden="true"
        className={`va-motif pointer-events-none absolute inset-0 hidden sm:block ${
          image ? "va-motif-seam" : ""
        }`}
      >
        <span className="va-motif-h absolute left-0 h-px bg-gold/45" />
        <span className="va-motif-v absolute w-px bg-gold/45" />
        <span className="va-motif-node absolute h-[9px] w-[9px] rounded-full border border-gold bg-ink" />
      </div>

      <div className="va-shell relative z-10 pt-7 pb-12 lg:py-20">
        <div className={image ? "lg:max-w-[52%] lg:pr-10" : ""}>
          {trail ? <Breadcrumbs trail={trail} /> : null}

          {page.eyebrow ? (
            <p className="mt-7 font-body text-[11px] font-semibold tracking-[0.26em] text-gold uppercase">
              {page.eyebrow}
            </p>
          ) : null}

          <h1 className="va-reveal mt-5 max-w-[19ch] font-display text-display-l leading-[1.04] font-medium tracking-[-0.015em] text-ivory-bright text-balance lg:max-w-[26ch]">
            {page.headline}
          </h1>

          {page.lede ? (
            <p className="va-reveal mt-7 max-w-[58ch] font-body text-body-l leading-[1.62] text-mist/80">
              {page.lede}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
