"use client";

import { useEffect } from "react";
import { subscribeAnalyticsReady } from "@/lib/analytics-readiness";
import { analyticsAllowedNow, getConsentStatus, isAnalyticsAllowed, subscribeToConsent } from "@/lib/consent";
import { readStoredVisitorId } from "@/lib/megaLeadContext";
import { getPostHogClient, setPostHogClient } from "@/lib/posthog-client";
import { pageTypeFor, superProperties } from "@/lib/tracking/contract";
import { POSTHOG_KEY } from "@/lib/tracking/destination";
import { TRACKING_ENABLED } from "@/lib/tracking/enabled";
import { buildPostHogOptions, expireStaleCookies, probePersistence } from "@/lib/tracking/posthog-options";
import { flushQueue, grantConsent, revokeConsent } from "@/lib/tracking/queue";

type PostHogModule = Pick<typeof import("posthog-js"), "default">;
type LoadPostHog = () => Promise<PostHogModule>;
type PostHogInstance = PostHogModule["default"];

/**
 * A Decline drops queued events and latches the queue shut; allowed consent lifts it.
 * Reads the status, not analyticsAllowedNow, because that gate includes this latch.
 */
function syncConsentLatch(): void {
  if (isAnalyticsAllowed(getConsentStatus())) grantConsent();
  else revokeConsent();
}

function reenableOptedOut(client: PostHogInstance): void {
  if (client.has_opted_out_capturing()) client.opt_in_capturing({ captureEventName: false });
}

/** Configure the shared MEGA Websites client and deliver what was queued before init. */
function configurePostHog(posthog: PostHogInstance): void {
  // Returning visitors from the cookie-based setup still hold the old cookie.
  expireStaleCookies((cookie) => {
    document.cookie = cookie;
  }, POSTHOG_KEY, window.location.hostname);
  posthog.init(POSTHOG_KEY, buildPostHogOptions(probePersistence(() => window.localStorage)));
  posthog.register(
    superProperties({
      siteId: process.env.NEXT_PUBLIC_MEGA_SITE_ID,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      pageType: pageTypeFor(window.location.pathname),
    }),
  );
  const visitorId = readStoredVisitorId();
  if (visitorId) posthog.register({ mega_visitor_id: visitorId });
  setPostHogClient(posthog);
  reenableOptedOut(posthog);
  // Queued items carry their own time as an option; live ones pass nothing.
  flushQueue((event, properties, options) => posthog.capture(event, properties, options));
}

async function initializePostHog(isCurrent: () => boolean, load: LoadPostHog): Promise<void> {
  try {
    const { default: posthog } = await load();
    // Consent can flip while the import is in flight, here or in another tab.
    // Re-check before anything is initialised.
    if (!isCurrent() || !analyticsAllowedNow()) return;
    const existing = getPostHogClient();
    if (existing) {
      reenableOptedOut(existing);
      return;
    }
    configurePostHog(posthog);
  } catch (error: unknown) {
    console.error("PostHog analytics could not initialize", error);
  }
}

/** No sticky started flag: a cancelled import can never prevent reacceptance. */
export function startPostHogAnalytics(load: LoadPostHog = () => import("posthog-js")): () => void {
  const stopLatch = subscribeToConsent(syncConsentLatch);
  syncConsentLatch();
  const stopReady = subscribeAnalyticsReady(
    (isCurrent) => { void initializePostHog(isCurrent, load); },
    () => {
      revokeConsent();
      getPostHogClient()?.opt_out_capturing();
    },
  );
  return () => {
    stopReady();
    stopLatch();
  };
}

/**
 * Lazy loader for the shared MEGA Websites project. Requires tracking enabled
 * for this deploy (src/lib/tracking/enabled.ts) AND allowed consent (per
 * consentMode in src/lib/consent.ts); then initializes after paint and idle,
 * or on first interaction, and flushes events queued before init.
 */
export function PostHogProvider(): null {
  useEffect(() => {
    if (TRACKING_ENABLED) return startPostHogAnalytics();
  }, []);
  return null;
}
