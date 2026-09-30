import type { HeroImage } from "@/components/pages/page-hero";

/**
 * Photography for the interior heroes.
 *
 * The interior shipped with zero images on all 28 routes while the approved
 * homepage carries ten, so a visitor went from a photographic homepage to
 * twenty-eight pages of well-set text. That is the gap this closes.
 *
 * It closes it by assignment, not by filling. A route appears below ONLY where
 * the photograph's subject is that page's own subject — the five audience
 * plates were generated for these five audiences and are used nowhere else.
 * Two grounds (a desk still life, a defocused office corner) carry pages whose
 * subject is a process or a person rather than a scene; both are subjects the
 * manifest already approved, both are people-free, and neither is reused.
 *
 * Routes absent from this map get NO image and a shorter hero band instead.
 * Reusing one photograph across unrelated roles is an explicit design-review
 * failure in this repo, and a photograph of the wrong thing is worse than air.
 *
 * Still unassigned and worth generating rather than faking: /who-we-serve/crnas-nps-pas
 * (the approved frame groups CRNAs/NPs/PAs with executives under one plate, so
 * there is no distinct asset), the five /services/* pages, and the remaining
 * /physicians/* career stages.
 */
const HERO_IMAGES: Readonly<Record<string, HeroImage>> = {
  "/who-we-serve/physicians-specialists": {
    src: "/images/design/a/06-white-coat-paths/physicians-specialists-consultation.jpg",
    alt: "A physician talking a patient through a plan across a consulting-room desk",
  },
  "/who-we-serve/surgeons": {
    src: "/images/design/a/06-white-coat-paths/surgeons-operating-room.jpg",
    alt: "A surgeon tying a surgical cap before a case, operating lights behind",
  },
  "/who-we-serve/dentists-dental-specialists": {
    src: "/images/design/a/06-white-coat-paths/dental-office-planning.jpg",
    alt: "A dental operatory with the chair, delivery unit and a panoramic x-ray on screen",
  },
  "/who-we-serve/healthcare-executives": {
    src: "/images/design/a/06-white-coat-paths/healthcare-executive-hallway.jpg",
    alt: "A clinician walking a glazed hospital corridor",
  },
  "/physicians/practice-owners": {
    src: "/images/design/a/06-white-coat-paths/practice-owner-meeting.jpg",
    alt: "Two practice partners working through paperwork at a desk",
  },
  "/our-process": {
    src: "/images/design/a/04-blueprint-rounds/desk-still-life.jpg",
    alt: "A physician's desk still life: stethoscope, pen and a closed notebook",
  },
  "/meet-michael-epps": {
    src: "/images/design/a/07-accountable-planner/office-desk-ground.jpg",
    alt: "A quiet office corner with a walnut desk edge in warm afternoon light",
  },
};

export function heroImageFor(route: string): HeroImage | undefined {
  return HERO_IMAGES[route];
}
