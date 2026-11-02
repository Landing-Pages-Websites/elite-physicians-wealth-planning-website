"use client";

import { useSyncExternalStore } from "react";
import {
  getConsentStatus,
  isAnalyticsAllowed,
  isConsentChoiceNeeded,
  setConsentStatus,
  subscribeToConsent,
  type ConsentStatus,
} from "@/lib/consent";
export interface UseConsentResult {
  /** "unset" until the visitor chooses (and always "unset" during SSR). */
  status: ConsentStatus;
  /**
   * Whether the banner should ask: no real choice is known ("unset", or an
   * unrecognised stored value that still reads as declined). Always true
   * during SSR, matching status "unset".
   */
  choiceNeeded: boolean;
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

function getServerChoiceNeeded(): boolean {
  return true;
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

/** Reactive consent state — analytics loaders gate on analyticsAllowed. */
export function useConsent(): UseConsentResult {
  const status = useSyncExternalStore(
    subscribeToConsent,
    getConsentStatus,
    getServerSnapshot,
  );
  const choiceNeeded = useSyncExternalStore(
    subscribeToConsent,
    isConsentChoiceNeeded,
    getServerChoiceNeeded,
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
    choiceNeeded,
    analyticsAllowed: hydrated && isAnalyticsAllowed(status),
    // setConsentStatus applies the opt-in/opt-out, the same path a choice made
    // in another tab takes.
    accept: () => setConsentStatus("accepted"),
    decline: () => setConsentStatus("declined"),
  };
}
