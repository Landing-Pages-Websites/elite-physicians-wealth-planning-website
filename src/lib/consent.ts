/**
 * Consent state shared by the banner and the analytics loaders.
 *
 * Invariant: every consent gate reads the latest choice the visitor made in
 * this browser in any tab, and a decline is never later read as allowed, in
 * either mode, by any sequence: not on this page, not after a full page load,
 * not after a back/forward-cache restore.
 *
 * - A choice lives in session memory first and the stores second. How the
 *   two stores combine is one exhaustive table, `CONSENT_DECISION_TABLE`
 *   (`consent-decision-table.ts`), which also states the rules below that
 *   apply on top of it. Memory is set by
 *   a local choice (even when every write throws), by a change another tab
 *   made to the stores, or by the first read of the stores.
 * - Memory wins over stores that have not changed since this page last read
 *   them, so a stale stored accept never overwrites a decline whose writes
 *   failed. When the stores have changed (a storage event, focus, visibility,
 *   pageshow, CookieStore change), the choice is re-derived from a fresh read
 *   of both and committed through the same opt-out/opt-in as a local one.
 * - The first read and every re-check derive the choice the same way
 *   (deriveChoice). A store emptied by another tab is not a choice, so a
 *   decline is kept; but an accept is no longer known (that tab's decline may
 *   only have been able to delete it), so it reads as "declined" and asks.
 * - An unrecognised, conflicting or unreadable stored state fails closed and
 *   reads as "declined" at every gate, but the banner asks again
 *   (isConsentChoiceNeeded): fail closed on tracking, never on the visitor's
 *   ability to choose.
 * - No choice known and no store this page could write a decline to: an
 *   earlier decline may have been lost, so it reads as "declined" in every
 *   mode and the banner asks. An accept made now holds for this page only.
 * - A stored accept that no store here could replace with a decline would
 *   outlive any decline: it reads as "declined" and the banner asks.
 */

import { applyConsentEffects } from "@/lib/consent-effects";
import {
  CONSENT_STORAGE_KEY,
  choiceFromSnapshot,
  consentCookieName,
  persistChoice,
  probeCanWrite,
  readStores,
  sameSnapshot,
  snapshotHoldsDecline,
  UNCERTAIN,
  type ConsentChoice,
  type StoreSnapshot,
  type StoredChoice,
} from "@/lib/consent-stores";
import { consentGate, gaConsentLevel, type GaConsentLevel } from "@/lib/tracking/consent-gate";
import { isConsentRevoked } from "@/lib/tracking/queue";
import { siteConfig } from "@/site.config";

export { CONSENT_STORAGE_KEY, consentCookieName };
export type ConsentStatus = "unset" | ConsentChoice;

const CONSENT_CHANGE_EVENT = "site-consent-change";
// Moments another tab's change may have landed while this page was not told:
// a cookie change fires no storage event, and a page in the back/forward cache
// gets no storage events at all.
const RECHECK_EVENTS = ["focus", "visibilitychange", "pageshow"] as const;

interface PageConsent {
  choice: ConsentChoice | null;
  askAgain: boolean;
  /** Whether a value written here would reach the next page; probed once, on first need. */
  canWrite?: boolean;
  /** The stores as this page last read them: at its first read and at every commit. */
  seen: StoreSnapshot;
}

// Keyed by the window so the memory lives exactly as long as the page does.
const pages = new WeakMap<Window, PageConsent>();

/** This page's consent memory; the first call also starts listening for other tabs. */
function pageConsent(): PageConsent {
  const existing = pages.get(window);
  if (existing) return existing;
  const page: PageConsent = { choice: null, askAgain: false, seen: readStores() };
  pages.set(window, page);
  listenForOtherTabs();
  return page;
}

function listenForOtherTabs(): void {
  // Test doubles of window may lack addEventListener; a browser always has it.
  if (typeof window.addEventListener !== "function") return;
  window.addEventListener("storage", onStorage);
  for (const type of RECHECK_EVENTS) window.addEventListener(type, recheckStores);
  const cookieStore = (window as { cookieStore?: EventTarget }).cookieStore;
  cookieStore?.addEventListener?.("change", recheckStores);
}

function canWrite(page: PageConsent): boolean {
  page.canWrite ??= probeCanWrite();
  return page.canWrite;
}

/** Records a choice and what the stores now hold, applies it to loaded analytics, then tells subscribers. */
function commitChoice({ choice, askAgain }: StoredChoice): void {
  const page = pageConsent();
  page.choice = choice;
  page.askAgain = askAgain;
  page.seen = readStores();
  applyConsentEffects(choice);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/**
 * The one derivation from a store snapshot, for the first read and for every
 * re-check, so the two cannot disagree. Null means the stores hold no choice
 * and the page keeps what it has.
 * - An accept no decline here could replace would come back after every
 *   decline: not trusted.
 * - Stores emptied while this page holds an accept: another tab's decline may
 *   only have been able to delete the accept (full storage, cookies blocked),
 *   so the accept is no longer known.
 */
function deriveChoice(page: PageConsent, snapshot: StoreSnapshot): StoredChoice | null {
  const stored = choiceFromSnapshot(snapshot);
  if (stored === null) return page.choice === "accepted" ? UNCERTAIN : null;
  return stored.choice === "accepted" && !canWrite(page) ? UNCERTAIN : stored;
}

/** Re-derives the choice from a fresh read, if the stores changed since this page last read them. */
function recheckStores(): void {
  const page = pageConsent();
  const now = readStores();
  if (sameSnapshot(now, page.seen)) return;
  page.seen = now;
  const derived = deriveChoice(page, now);
  if (derived === null) return;
  // A decline is already closed; a doubtful store does not turn it into a question again.
  if (derived.askAgain && page.choice === "declined") return;
  if (derived.choice === page.choice && derived.askAgain === page.askAgain) return;
  commitChoice(derived);
}

function isLocalStorageArea(area: Storage | null): boolean {
  try {
    return area === window.localStorage;
  } catch {
    return false;
  }
}

function onStorage(event: StorageEvent): void {
  const ours = event.key === null || event.key === CONSENT_STORAGE_KEY;
  if (ours && isLocalStorageArea(event.storageArea)) recheckStores();
}

/** The choice every gate reads: memory, then the stores, then fail closed if nothing could be durable. */
function currentConsent(): StoredChoice | null {
  const page = pageConsent();
  if (page.choice === null) {
    page.seen = readStores();
    const stored = deriveChoice(page, page.seen);
    if (stored) Object.assign(page, stored);
  }
  if (page.choice !== null) return { choice: page.choice, askAgain: page.askAgain };
  return canWrite(page) ? null : UNCERTAIN;
}

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") {
    return "unset";
  }
  return currentConsent()?.choice ?? "unset";
}

/**
 * Whether the visitor should be asked: no real choice is known. True for
 * "unset" and for a choice that still reads as declined at every gate but is
 * not one the visitor made durably here (an unrecognised or conflicting stored
 * value, or no store this page can write to).
 */
export function isConsentChoiceNeeded(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const consent = currentConsent();
  return consent === null || consent.askAgain;
}

export function setConsentStatus(status: ConsentChoice): void {
  pageConsent();
  persistChoice(status);
  commitChoice({ choice: status, askAgain: false });
}

/**
 * Whether the visitor's decline will still be the choice after a full page
 * load, answered by reading every store back now, not by which writes
 * succeeded. True only when this page reads "declined", every store that could
 * hold an earlier choice can be read, at least one holds "declined" and none
 * holds anything else. A store that throws on read may still hold an old
 * accept that a later page reads once storage works again, so it is false.
 *
 * A site that reloads after a decline (to unload third-party code loaded on
 * Accept, such as GTM) must reload only when this is true. Otherwise keep the
 * in-page revocation: the gates are already closed for this page.
 */
export function declineIsDurable(): boolean {
  if (typeof window === "undefined" || getConsentStatus() !== "declined") return false;
  return snapshotHoldsDecline(readStores());
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

/**
 * The Google consent level every Consent Mode default reads at the moment it
 * is sent: "all" only for an explicit Accept this page can trust (the
 * store's "accepted"), never while the decline latch is shut.
 */
export function gaConsentLevelNow(): GaConsentLevel {
  return isConsentRevoked() ? "none" : gaConsentLevel(siteConfig.consentMode, getConsentStatus());
}
