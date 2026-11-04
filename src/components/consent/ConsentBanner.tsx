"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "@/lib/content";
import { consentHiddenInPreview } from "@/components/consent/previewHidden";
import { raiseToTopLayer, shouldReraiseAfter } from "@/components/consent/topLayer";
import { useConsent } from "@/components/consent/useConsent";
import { useOpenModalDialog } from "@/components/consent/useOpenModalDialog";

/**
 * Lightweight self-built cookie banner (no vendor script), the site-starter
 * template bar in this site's colour and type tokens. Renders nothing once the
 * visitor has made a real choice (an unrecognised stored value asks again while
 * analytics stay off); analytics loaders react via the consent store. In
 * "us-default" mode analytics already load before a choice; in "strict" mode
 * nothing loads until Accept. In both modes the copy names analytics AND
 * advertising, because an explicit Accept also grants Google ad consent;
 * Decline turns both off.
 *
 * A visitor can always reach it, whatever overlay is open (see topLayer.ts):
 * it is a top-layer popover above every z-index (the Menu popover and its
 * backdrop included), and while a modal dialog is open it renders inside that
 * dialog so it is not inert. The z-index is only the fallback where popovers
 * are unsupported.
 */
export function ConsentBanner(): ReactElement | null {
  const { choiceNeeded, accept, decline } = useConsent();
  const modal = useOpenModalDialog();
  const barRef = useRef<HTMLDivElement>(null);
  const visible = choiceNeeded && !consentHiddenInPreview();

  // Runs after every move into or out of a modal (the portal remounts the bar),
  // so the bar is re-shown above whatever entered the top layer last.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!visible || !bar) return;
    // A popover stays hidden until shown: if showing fails, fall back to a plain fixed bar.
    if (!raiseToTopLayer(bar)) bar.removeAttribute("popover");
  }, [visible, modal]);

  // toggle does not bubble: listen in the capture phase for any popover or
  // dialog that opens after the bar, and raise the bar back above it.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!visible || !bar) return;
    const onToggle = (event: Event): void => {
      if (shouldReraiseAfter(event as ToggleEvent, bar)) raiseToTopLayer(bar);
    };
    document.addEventListener("toggle", onToggle, true);
    return () => document.removeEventListener("toggle", onToggle, true);
  }, [visible, modal]);

  if (!visible) {
    return null;
  }

  const bar = (
    <div
      ref={barRef}
      popover="manual"
      role="region"
      aria-label="Cookie consent"
      data-mega-preview-hide=""
      data-mega-ignore=""
      className="ph-no-capture visible fixed inset-x-0 top-auto bottom-0 z-[2147483000] m-0 h-auto w-full max-w-none overflow-visible border-0 border-t border-ink/10 bg-ivory p-4 font-body text-inherit shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-charcoal">
          {BRAND.name} uses cookies for analytics and advertising, to improve this site and measure our ads. See our{" "}
          <Link href="/privacy-disclosures" className="underline underline-offset-4">
            privacy disclosures
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={accept}
            aria-label="Accept analytics and advertising cookies"
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            Accept cookies
          </button>
          <button
            type="button"
            onClick={decline}
            aria-label="Decline analytics and advertising cookies"
            className="rounded-sm border border-ink/25 px-4 py-2 text-sm font-medium text-ink hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
  return modal ? createPortal(bar, modal) : bar;
}
