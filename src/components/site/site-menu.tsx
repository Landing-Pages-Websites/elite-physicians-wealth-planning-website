"use client";

import Link from "next/link";

/**
 * The below-xl navigation panel.
 *
 * Two things the server-rendered version got wrong, both invisible until you
 * actually tap through it:
 *
 * 1. A popover light-dismisses on outside click and on Escape, but a Next
 *    <Link> is a SOFT navigation — the document never unloads, so the panel
 *    stayed open across it and the visitor landed on the destination with the
 *    menu still covering the top-right corner. Each link now closes its own
 *    popover on the way out, which is why this is a client component.
 * 2. Below xl the desktop <nav aria-label="Primary"> is display:none, so the
 *    site had NO navigation landmark at all on mobile and the panel was an
 *    unlabelled <div>. The panel carries the landmark itself now.
 *
 * `flex` must NOT be unconditional: display:flex overrides the UA rule
 * [popover]:not(:popover-open){display:none}, which left the panel permanently
 * open at every viewport. Hidden by default; flex only while genuinely open.
 */
function closeEnclosingPopover(event: React.MouseEvent<HTMLAnchorElement>): void {
  const popover = event.currentTarget.closest<HTMLElement>("[popover]");
  if (popover && popover.matches(":popover-open")) popover.hidePopover();
}

export function SiteMenu({
  items,
}: {
  items: readonly { href: string; label: string }[];
}): React.JSX.Element {
  return (
    <div
      id="site-menu"
      popover="auto"
      className="hidden w-64 flex-col gap-1 rounded-sm border border-mist/15 bg-ink p-3 text-mist shadow-xl backdrop:bg-ink/40 [inset-block-start:var(--header-h)] [inset-inline-end:1rem] [inset-inline-start:auto] [margin:0] [position:fixed] [&:popover-open]:flex"
    >
      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeEnclosingPopover}
            className="rounded-sm px-3 py-3 font-body text-sm text-mist/85 transition-colors duration-200 hover:bg-white/5 hover:text-gold"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/schedule"
          onClick={closeEnclosingPopover}
          className="mt-1 rounded-sm bg-gold px-3 py-3 text-center font-body text-sm font-semibold text-ink"
        >
          Schedule a strategy call
        </Link>
      </nav>
    </div>
  );
}
