"use client";

import Script from "next/script";
import { useEffect, useState, type ReactElement } from "react";
import { subscribeAnalyticsReady } from "@/lib/analytics-readiness";
import { analyticsAllowedNow } from "@/lib/consent";
import { applyGaConsent, configureGaOnce, ga4Id } from "@/lib/tracking/ga";

const GA4_ID = ga4Id();

/**
 * Readiness only decides when gtag.js may load. Nothing is configured here:
 * configuration waits for gtag.js itself (onGtagReady), so a decline that
 * lands while it is loading never configures GA. Every time the consent store
 * does not allow analytics, the property is disabled, because unmounting the
 * Script does not stop a gtag.js that already loaded.
 */
export function startGoogleAnalytics(id: string, setReady: (ready: boolean) => void): () => void {
  return subscribeAnalyticsReady(() => setReady(true), () => {
    applyGaConsent(window, id, false);
    setReady(false);
  });
}

/** next/script onReady: once per page, and only if consent still allows it then. */
export function onGtagReady(id: string): void {
  configureGaOnce(window, id, analyticsAllowedNow);
}

/** Keep the standard gtag URL/ID; defer only SDK execution. */
export function GoogleAnalytics(): ReactElement | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (GA4_ID) return startGoogleAnalytics(GA4_ID, setReady);
  }, []);
  if (!GA4_ID || !ready) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
      strategy="afterInteractive"
      onReady={() => onGtagReady(GA4_ID)}
    />
  );
}
