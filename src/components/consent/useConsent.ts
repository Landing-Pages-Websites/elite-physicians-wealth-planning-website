"use client";

import { useSyncExternalStore } from "react";
import {
  getConsentStatus,
  isAnalyticsAllowed,
  setConsentStatus,
  subscribeToConsent,
  type ConsentStatus,
} from "@/lib/consent";
import { getPostHogClient } from "@/lib/posthog-client";
import { grantConsent, revokeConsent } from "@/lib/tracking/queue";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export interface UseConsentResult {
  /** "unset" until the visitor chooses (and always "unset" during SSR). */
  status: ConsentStatus;
  /**
   * Whether analytics loaders may run, per siteConfig.consentMode.
   * Always false during SSR/hydration so a previously-declined visitor
   * never gets a script tag in server HTML.
   */
  analyticsAllowed: boolean;
  accept: () => void;
  decline: () => void;
}

function getServerSnapshot(): ConsentStatus {
  return "unset";
}

// Hydration detector via useSyncExternalStore: false during SSR/hydration
// render, true immediately after — without an effect-driven setState.
function subscribeNever(): () => void {
  return () => {};
}
function getClientTrue(): boolean {
  return true;
}
function getServerFalse(): boolean {
  return false;
}

/**
 * Stop analytics that already loaded or are queued (us-default opt-out). The
 * tracking queue is cleared and latched shut so a PostHog import that is still
 * in flight finds consent revoked and never initialises.
 */
function optOutLoadedAnalytics(): void {
  revokeConsent();
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  getPostHogClient()?.opt_out_capturing();
}

/** A later Accept after a Decline lifts the latch and re-enables a client that was opted out. */
function optInLoadedAnalytics(): void {
  grantConsent();
  const client = getPostHogClient();
  if (client?.has_opted_out_capturing()) client.opt_in_capturing();
}

/** Reactive consent state — analytics loaders gate on analyticsAllowed. */
export function useConsent(): UseConsentResult {
  const status = useSyncExternalStore(
    subscribeToConsent,
    getConsentStatus,
    getServerSnapshot,
  );

  // Analytics stay off until after hydration: in us-default mode "unset"
  // means allowed, but the server can't know a returning visitor declined.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    getClientTrue,
    getServerFalse,
  );

  return {
    status,
    analyticsAllowed: hydrated && isAnalyticsAllowed(status),
    accept: () => {
      setConsentStatus("accepted");
      optInLoadedAnalytics();
    },
    decline: () => {
      setConsentStatus("declined");
      optOutLoadedAnalytics();
    },
  };
}
