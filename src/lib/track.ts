import { analyticsAllowedNow, gaConsentLevelNow } from "@/lib/consent";
import { TRACKING_ENABLED } from "@/lib/tracking/enabled";
import { ensureGaConsentDefault, ga4Id } from "@/lib/tracking/ga";
import { reassertGaHitScrubber } from "@/lib/tracking/ga-transport";
import { enqueueOrCapture, type QueueCaptureOptions } from "@/lib/tracking/queue";
import { scrubProps } from "@/lib/tracking/scrub";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * The one way to write to GA4's dataLayer. A pre-consent entry would persist
 * and be processed once GA loads after a later Accept, so nothing is written
 * unless consent allows it at that moment. URL-shaped values go through the
 * same scrubber as PostHog captures. No-op on the server.
 */
export function pushDataLayer(entry: Record<string, unknown>): void {
  if (typeof window === "undefined" || !analyticsAllowedNow()) {
    return;
  }
  // GA4 Consent Mode: the consent default must precede anything gtag.js reads.
  ensureGaConsentDefault(window, ga4Id(), gaConsentLevelNow);
  reassertGaHitScrubber(window);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(scrubProps(entry));
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
