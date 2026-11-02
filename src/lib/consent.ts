/**
 * Consent state shared by the banner and the analytics loaders.
 *
 * Invariant: every consent gate reads the latest choice the visitor made in
 * this browser in any tab, and a decline is never lost or downgraded because
 * storage failed.
 *
 * - A choice lives in session memory first and localStorage second. Memory is
 *   set by a local choice (even when the write throws), by another tab's
 *   storage event, or by the first recognised value read from storage. Once
 *   set it wins over storage for the rest of the page life.
 * - Another tab's choice arrives as a `storage` event and goes through the
 *   same commit (and the same opt-out/opt-in) as a local one.
 * - Storage removed or cleared by another tab is not a choice: a known choice
 *   is kept.
 * - An unrecognised stored value fails closed and reads as "declined" at every
 *   gate, but the banner asks again (isConsentChoiceNeeded): fail closed on
 *   tracking, never on the visitor's ability to choose. A real choice then
 *   overwrites the bad value.
 * - Unreadable storage (getItem throws) with no choice in memory reads as
 *   "unset": nothing was ever persisted, and a decline made now is kept in
 *   memory.
 */

import { applyConsentEffects } from "@/lib/consent-effects";
import { consentGate, type ConsentMode } from "@/lib/tracking/consent-gate";
import { isConsentRevoked } from "@/lib/tracking/queue";

/**
 * This site has no src/site.config.ts; consentMode lives here. Exported so the
 * tracking tests can exercise both modes against the real gate.
 */
export const siteConfig: { consentMode: ConsentMode } = { consentMode: "us-default" };

export type ConsentStatus = "unset" | "accepted" | "declined";
type ConsentChoice = Exclude<ConsentStatus, "unset">;

export const CONSENT_STORAGE_KEY = "site-consent";
const CONSENT_CHANGE_EVENT = "site-consent-change";

interface PageConsent {
  choice: ConsentChoice | null;
  /** The choice came from a stored value that is not a real choice. */
  unrecognised: boolean;
}

interface StoredChoice {
  choice: ConsentChoice;
  unrecognised: boolean;
}

// Keyed by the window so the memory lives exactly as long as the page does.
const pages = new WeakMap<Window, PageConsent>();

/** This page's consent memory; the first call also starts listening to other tabs. */
function pageConsent(): PageConsent {
  const existing = pages.get(window);
  if (existing) return existing;
  const page: PageConsent = { choice: null, unrecognised: false };
  pages.set(window, page);
  // Test doubles of window may lack addEventListener; a browser always has it.
  if (typeof window.addEventListener === "function") window.addEventListener("storage", onStorage);
  return page;
}

/** A stored value as a choice; anything that is present but unrecognised is a decline. */
function choiceFromStored(value: string | null): StoredChoice | null {
  if (value === null) return null;
  if (value === "accepted" || value === "declined") return { choice: value, unrecognised: false };
  return { choice: "declined", unrecognised: true };
}

function readStoredChoice(): StoredChoice | null {
  try {
    return choiceFromStored(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    // Storage unavailable (blocked, private mode): no choice can have been persisted.
    return null;
  }
}

function isLocalStorageArea(area: Storage | null): boolean {
  try {
    return area === window.localStorage;
  } catch {
    return false;
  }
}

/** Records a choice, applies it to loaded analytics, then tells subscribers. */
function commitChoice({ choice, unrecognised }: StoredChoice): void {
  const page = pageConsent();
  page.choice = choice;
  page.unrecognised = unrecognised;
  applyConsentEffects(choice);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

function onStorage(event: StorageEvent): void {
  if (event.key !== CONSENT_STORAGE_KEY || !isLocalStorageArea(event.storageArea)) return;
  const stored = choiceFromStored(event.newValue);
  if (stored === null) return;
  const page = pageConsent();
  if (stored.choice === page.choice && stored.unrecognised === page.unrecognised) return;
  commitChoice(stored);
}

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") {
    return "unset";
  }
  const page = pageConsent();
  if (page.choice === null) {
    const stored = readStoredChoice();
    if (stored) Object.assign(page, stored);
  }
  return page.choice ?? "unset";
}

/**
 * Whether the visitor should be asked: no real choice is known. True for
 * "unset" and for an unrecognised stored value, which still reads as declined
 * at every gate.
 */
export function isConsentChoiceNeeded(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return getConsentStatus() === "unset" || pageConsent().unrecognised;
}

export function setConsentStatus(status: ConsentChoice): void {
  pageConsent();
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Persisting failed; session memory still carries the choice for every gate.
  }
  commitChoice({ choice: status, unrecognised: false });
}

/** Subscribe to consent changes from this tab or another. Returns an unsubscribe function. */
export function subscribeToConsent(callback: () => void): () => void {
  pageConsent();
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

/**
 * Whether analytics (GA4/PostHog) may load for the given consent status,
 * per siteConfig.consentMode:
 * - "us-default": allowed unless the visitor explicitly declined (opt-out).
 * - "strict": allowed only after an explicit accept (opt-in).
 */
export function isAnalyticsAllowed(status: ConsentStatus): boolean {
  return consentGate(siteConfig.consentMode, status);
}

/** The gate every analytics write and the PostHog init re-check read at the moment they run. */
export function analyticsAllowedNow(): boolean {
  return !isConsentRevoked() && isAnalyticsAllowed(getConsentStatus());
}
