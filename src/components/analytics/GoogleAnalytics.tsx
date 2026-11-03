"use client";

import Script from "next/script";
import { useEffect, type ReactElement } from "react";
import { useConsent } from "@/components/consent/useConsent";
import { analyticsAllowedNow } from "@/lib/consent";
import { TRACKING_ENABLED } from "@/lib/tracking/enabled";
import { applyGaConsent, configureGaOnce, ensureGaConsentDefault, ga4Id } from "@/lib/tracking/ga";
import { GA_HIT_DROPPED_EVENT, setGaDropReporter } from "@/lib/tracking/ga-transport";
import { enqueueOrCapture } from "@/lib/tracking/queue";

const GA4_ID = ga4Id();

// A GA4 hit the scrubber could not read is not sent; PostHog hears about it once per page (reason only, consent-gated).
setGaDropReporter((reason) => {
  if (TRACKING_ENABLED && analyticsAllowedNow()) enqueueOrCapture(GA_HIT_DROPPED_EVENT, { reason });
});

/**
 * GA4 gtag loader. Renders nothing until NEXT_PUBLIC_GA4_ID is set (by the
 * provisioning bot) AND consent allows analytics. The consent default is
 * queued before the Script renders. gtag.js is configured in
 * onReady, once per page, only if consent still allows it then: a decline that
 * lands while gtag.js is loading never configures GA.
 */
export function GoogleAnalytics(): ReactElement | null {
  const { analyticsAllowed } = useConsent();

  // Unmounting the Script does not stop a gtag.js that already loaded, so the
  // property is disabled whenever the consent store does not allow it now.
  // analyticsAllowed is also false during hydration, so it is not used here.
  useEffect(() => {
    if (GA4_ID && !analyticsAllowedNow()) applyGaConsent(window, GA4_ID, false);
  }, [analyticsAllowed]);

  if (!GA4_ID || !analyticsAllowed) {
    return null;
  }

  // In the app router <Script> preloads gtag.js while it renders, so the
  // consent default goes into the dataLayer here, before the Script below can
  // render, ahead of anything another script queued. Idempotent per page.
  if (typeof window !== "undefined") ensureGaConsentDefault(window, GA4_ID, analyticsAllowedNow);

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
      strategy="afterInteractive"
      onReady={() => configureGaOnce(window, GA4_ID, analyticsAllowedNow)}
    />
  );
}
