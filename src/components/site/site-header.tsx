import Link from "next/link";
import { BRAND } from "@/lib/content";
import { SiteMenu } from "./site-menu";

/**
 * NEW UNAPPROVED SURFACE. The approved mockup has no navigation — its scroll
 * starts at the hero and ends at the closing section. A multi-page site needs
 * one, so this is derived from the approved design language rather than
 * imported from a generic template.
 *
 * The wordmark here is LIFTED from the hero, not duplicated: one-plan.tsx used
 * to render this exact lockup as its first child, and hoisting it while leaving
 * the original in place would stack two wordmarks. The header is `fixed` rather
 * than `sticky` on purpose — sticky occupies flow and would push the hero down,
 * breaking the composition_map fold requirement that brand, headline, actions,
 * portrait card and proof row stay visible together within 1536x864.
 *
 * Nav targets were on-page anchors while the interior pages did not exist.
 * They are now the real routes, and the grouping is the client's own
 * information architecture as published on their live site — Who We Serve,
 * Services, Our Process, Resources, About — rather than an IA invented here.
 * Never point navigation at a route that 404s.
 */
const NAV = [
  { href: "/who-we-serve", label: "Who we serve" },
  { href: "/services", label: "Services" },
  { href: "/our-process", label: "Our process" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
] as const;

function Wordmark(): React.JSX.Element {
  return (
    <Link
      href="/"
      className="flex shrink-0 flex-col gap-0.5 rounded-sm transition-opacity duration-200 hover:opacity-90"
    >
      {/* 22px here pushed the Menu button off the right edge of a 390 viewport:
          the wordmark cannot wrap or shrink, so 24px padding + 32 characters +
          the gap + a 56px button came to 448px in a 390px window. 17px is the
          largest size that leaves the button its own padding at 390.
          `align-super` floated the trademark above the cap line as a detached
          glyph; an explicit vertical-align sits it on the cap. */}
      <span className="font-display text-[17px] font-medium whitespace-nowrap text-white sm:text-[27px] lg:text-[34px]">
        {BRAND.name}
        <span className="align-[0.42em] text-[0.45em]">™</span>
      </span>
      <span className="hidden font-body text-[11px] font-semibold tracking-[0.24em] whitespace-nowrap text-gold uppercase sm:block">
        {BRAND.poweredBy}
      </span>
    </Link>
  );
}

export function SiteHeader(): React.JSX.Element {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex items-center bg-ink/95 backdrop-blur-sm"
      style={{ minHeight: "var(--header-h)" }}
    >
      <a href="#main" className="skip-link font-body text-sm">
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-6 py-2 sm:gap-6 sm:px-10 lg:px-14">
        <Wordmark />

        <nav aria-label="Primary" className="hidden items-center gap-7 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-body text-[13px] text-mist/80 underline-offset-8 transition-colors duration-200 hover:text-gold hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/schedule"
            className="hidden min-h-11 items-center rounded-sm bg-gold px-5 font-body text-[13px] font-semibold text-ink transition-colors duration-200 hover:bg-gold/90 sm:inline-flex"
          >
            Schedule a strategy call
          </Link>

          {/* Popover API, not <details>. This header lives in the persistent
              layout, so a <details open> attribute survives same-page hash
              navigation and the panel stays sitting over the destination.
              A popover light-dismisses on outside click and on Escape, and
              closes on navigation — still zero client JS. */}
          <button
            type="button"
            popoverTarget="site-menu"
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border border-mist/45 px-3 font-body text-[12px] text-mist xl:hidden"
          >
            Menu
          </button>
          <SiteMenu items={NAV} />
        </div>
      </div>
    </header>
  );
}
