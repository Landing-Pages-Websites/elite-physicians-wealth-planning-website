"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { BRAND } from "@/lib/content";
import { siteConfig } from "@/lib/consent";
import { consentHiddenInPreview } from "@/components/consent/previewHidden";
import { useConsent } from "@/components/consent/useConsent";

/**
 * Lightweight self-built cookie banner (no vendor script), the site-starter
 * template bar in this site's colour and type tokens. Renders nothing once the
 * visitor has made a real choice (an unrecognised stored value asks again while
 * analytics stay off); analytics loaders react via the consent store. In
 * "us-default" mode the banner is informational (analytics already loading)
 * and the primary button reads "Got it"; in "strict" mode it's a true opt-in
 * gate and reads "Accept".
 */
export function ConsentBanner(): ReactElement | null {
  const { choiceNeeded, accept, decline } = useConsent();
  const strict = siteConfig.consentMode === "strict";

  if (!choiceNeeded || consentHiddenInPreview()) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      data-mega-preview-hide=""
      data-mega-ignore=""
      className="ph-no-capture fixed inset-x-0 bottom-0 z-[110] border-t border-ink/10 bg-ivory p-4 font-body shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-charcoal">
          {BRAND.name} uses cookies for analytics to improve this site. See our{" "}
          <Link href="/privacy-disclosures" className="underline underline-offset-4">
            privacy disclosures
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={accept}
            aria-label="Accept analytics cookies"
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            {strict ? "Accept" : "Got it"}
          </button>
          <button
            type="button"
            onClick={decline}
            aria-label="Decline analytics cookies"
            className="rounded-sm border border-ink/25 px-4 py-2 text-sm font-medium text-ink hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
