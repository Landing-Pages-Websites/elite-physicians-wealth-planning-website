"use client";

import { useEffect, useState, type ReactElement } from "react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { subscribeAnalyticsReady } from "@/lib/analytics-readiness";
import { applyGaConsent, ga4Id } from "@/lib/tracking/ga";

const GA4_ID = ga4Id();

/**
 * Readiness (fonts, paint, idle, or first interaction) decides when the
 * template GoogleAnalytics may mount. Loading, the consent default before
 * gtag.js renders, the hit scrubber and configuration are all the template's.
 * Every time the consent store does not allow analytics, the property is
 * disabled, because unmounting the Script does not stop a gtag.js that
 * already loaded.
 */
export function startGoogleAnalytics(id: string, setReady: (ready: boolean) => void): () => void {
  return subscribeAnalyticsReady(() => setReady(true), () => {
    applyGaConsent(window, id, false);
    setReady(false);
  });
}

/** Keep the standard gtag URL/ID; defer only when the template loader mounts. */
export function DeferredGoogleAnalytics(): ReactElement | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (GA4_ID) return startGoogleAnalytics(GA4_ID, setReady);
  }, []);
  return ready ? <GoogleAnalytics /> : null;
}
