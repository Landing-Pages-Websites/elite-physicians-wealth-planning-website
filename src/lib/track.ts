import { getConsentStatus, isAnalyticsAllowed } from "@/lib/consent";
import { TRACKING_ENABLED } from "@/lib/tracking/enabled";
import { enqueueOrCapture, type QueueCaptureOptions } from "@/lib/tracking/queue";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Whether GA4 and PostHog may receive anything right now, per siteConfig.consentMode. */
function analyticsAllowedNow(): boolean {
  return isAnalyticsAllowed(getConsentStatus());
}

/**
 * The one way to write to GA4's dataLayer. A pre-consent entry would persist
 * and be processed once GA loads after a later Accept, so nothing is written
 * unless consent allows it at that moment. No-op on the server.
 */
export function pushDataLayer(entry: Record<string, unknown>): void {
  if (typeof window === "undefined" || !analyticsAllowedNow()) {
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(entry);
}

/**
 * Fires an event to GA4 (dataLayer) and PostHog. Both are skipped unless
 * analytics consent is allowed at the moment of the event. PostHog loads
 * lazily, so allowed events fired before init are held (capped) and
 * delivered after it, and only where tracking is enabled.
 */
export function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
  options?: QueueCaptureOptions,
): void {
  if (typeof window === "undefined" || !analyticsAllowedNow()) {
    return;
  }
  pushDataLayer({ event, ...properties });
  if (TRACKING_ENABLED) {
    enqueueOrCapture(event, properties, options);
  }
}
