import { getPostHogClient } from "@/lib/posthog-client";
import { gaConsentLevel } from "@/lib/tracking/consent-gate";
import { applyGaConsent, ga4Id } from "@/lib/tracking/ga";
import { grantConsent, revokeConsent } from "@/lib/tracking/queue";
import { siteConfig } from "@/site.config";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Stop analytics that already loaded or are queued. The tracking queue is
 * cleared and latched shut so a PostHog import that is still in flight finds
 * consent revoked and never initialises.
 */
function optOutLoadedAnalytics(): void {
  revokeConsent();
  applyGaConsent(window, ga4Id(), gaConsentLevel(siteConfig.consentMode, "declined"));
  const client = getPostHogClient();
  client?.opt_out_capturing();
  client?.stopSessionRecording();
}

/**
 * An explicit Accept: grants Google every consent type, ads included, and a
 * later Accept after a Decline lifts the latch and re-enables a client that
 * was opted out.
 */
function optInLoadedAnalytics(): void {
  grantConsent();
  applyGaConsent(window, ga4Id(), gaConsentLevel(siteConfig.consentMode, "accepted"));
  const client = getPostHogClient();
  if (!client?.has_opted_out_capturing()) return;
  client.opt_in_capturing();
  client.startSessionRecording();
}

/**
 * The one place a consent choice reaches the loaded analytics. A choice made
 * in this tab and one read from another tab's storage event both land here,
 * so a remote decline revokes exactly what a local decline does.
 */
export function applyConsentEffects(status: "accepted" | "declined"): void {
  if (status === "declined") optOutLoadedAnalytics();
  else optInLoadedAnalytics();
}
