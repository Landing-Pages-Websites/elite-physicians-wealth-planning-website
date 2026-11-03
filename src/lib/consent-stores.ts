/**
 * The durable stores behind the consent memory in `consent.ts`: localStorage,
 * and a first-party, strictly necessary consent cookie used only when
 * localStorage cannot keep a choice. Every answer here comes from a fresh
 * read; nothing is remembered between calls.
 *
 * How the two stores combine is `CONSENT_DECISION_TABLE`
 * (`consent-decision-table.ts`), one cell per state of each store; this file
 * only classifies each store and looks the cell up.
 *
 * The cookie is `__Host-site-consent` on https (Secure, Path=/, no Domain, so
 * no parent domain or deeper path can shadow it) and plain `site-consent` on
 * http, where a `__Host-` cookie cannot be set. Only that one name is read, so
 * a foreign plain `site-consent` cookie on an https site is ignored.
 */

import {
  CONSENT_DECISION_TABLE,
  type CookieState,
  type DecisionCell,
  type StoreState,
} from "@/lib/consent-decision-table";

export const CONSENT_STORAGE_KEY = "site-consent";
const PROBE_SUFFIX = "-probe";
// Browsers may shorten it: Safari caps script-set cookies at 7 days, and at 24
// hours after a link-decorated ad click.
const CONSENT_COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;
// Removed straight away; the short life only bounds a removal that failed.
const PROBE_COOKIE_MAX_AGE_S = 60;

export type ConsentChoice = "accepted" | "declined";

export interface StoredChoice {
  choice: ConsentChoice;
  /** Not a real choice (unrecognised, conflicting, unknown or undurable): gates read it, the banner asks again. */
  askAgain: boolean;
}

/** Declined at every gate, and the banner asks: the stores cannot tell what the visitor chose. */
export const UNCERTAIN: StoredChoice = { choice: "declined", askAgain: true };

/** A store read that threw: it may still hold a choice a later page load can read. */
const UNREADABLE = Symbol("unreadable");
type LocalRead = string | null | typeof UNREADABLE;
type CookieRead = string[] | typeof UNREADABLE;

/** Both stores as read at one moment. */
export interface StoreSnapshot {
  local: LocalRead;
  /** Every value of the consent cookie name visible to this page, in order. */
  cookies: CookieRead;
}

function isHttps(): boolean {
  return (window as { location?: { protocol?: string } }).location?.protocol === "https:";
}

export function consentCookieName(): string {
  return isHttps() ? `__Host-${CONSENT_STORAGE_KEY}` : CONSENT_STORAGE_KEY;
}

function cookieDocument(): Pick<Document, "cookie"> | null {
  return (window as { document?: Pick<Document, "cookie"> }).document ?? null;
}

/** An undecodable value is still present: kept raw, so it reads as unrecognised, never as absent. */
function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function readCookieValues(name: string): CookieRead {
  try {
    const doc = cookieDocument();
    if (!doc) return [];
    const prefix = `${name}=`;
    return doc.cookie
      .split(";")
      .map((part) => part.trim())
      .filter((pair) => pair.startsWith(prefix))
      .map((pair) => decodeCookieValue(pair.slice(prefix.length)));
  } catch {
    return UNREADABLE;
  }
}

function readLocal(key: string): LocalRead {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return UNREADABLE;
  }
}

export function readStores(): StoreSnapshot {
  return { local: readLocal(CONSENT_STORAGE_KEY), cookies: readCookieValues(consentCookieName()) };
}

function cookieKey(cookies: CookieRead): string | typeof UNREADABLE {
  return cookies === UNREADABLE ? UNREADABLE : JSON.stringify(cookies);
}

export function sameSnapshot(a: StoreSnapshot, b: StoreSnapshot): boolean {
  return a.local === b.local && cookieKey(a.cookies) === cookieKey(b.cookies);
}

function valueState(value: string | null): StoreState {
  if (value === null) return "absent";
  return value === "accepted" || value === "declined" ? value : "unrecognised";
}

function localState(local: LocalRead): StoreState {
  return local === UNREADABLE ? "unreadable" : valueState(local);
}

function cookieState(cookies: CookieRead): CookieState {
  if (cookies === UNREADABLE) return "unreadable";
  if (cookies.length > 1) return "multiple";
  return valueState(cookies[0] ?? null);
}

/** The decision-table cell for a snapshot. */
export function decisionFor({ local, cookies }: StoreSnapshot): DecisionCell {
  return CONSENT_DECISION_TABLE[localState(local)][cookieState(cookies)];
}

/** The choice the stores hold right now, by the decision table; null for an unset cell. */
export function choiceFromSnapshot(snapshot: StoreSnapshot): StoredChoice | null {
  const { result, ask } = decisionFor(snapshot);
  if (result === "unset") return null;
  return { choice: result, askAgain: ask };
}

/** Whether a full page load would read a decline, whatever readability does next (the table's `durable`). */
export function snapshotHoldsDecline(snapshot: StoreSnapshot): boolean {
  return decisionFor(snapshot).durable;
}

/** Throws where the browser refuses cookies outright; a blocked jar drops the write silently. */
function writeCookie(name: string, value: string, maxAgeS: number): void {
  const doc = cookieDocument();
  if (!doc) return;
  const secure = isHttps() ? "; Secure" : "";
  doc.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeS}; SameSite=Lax${secure}`;
}

function localKeeps(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return window.localStorage.getItem(key) === value;
  } catch {
    return false;
  }
}

function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Unremovable: a value left here disagrees with the cookie, and the next page reads declined.
  }
}

function cookieKeeps(name: string, value: string, maxAgeS: number): boolean {
  try {
    writeCookie(name, value, maxAgeS);
    const values = readCookieValues(name);
    return values !== UNREADABLE && values.length === 1 && values[0] === value;
  } catch {
    return false;
  }
}

/** Whether a value written now would be read by the next page load. */
export function probeCanWrite(): boolean {
  const probe = `${CONSENT_STORAGE_KEY}${PROBE_SUFFIX}`;
  const local = localKeeps(probe, "1");
  removeLocal(probe);
  if (local) return true;
  const cookieProbe = `${consentCookieName()}${PROBE_SUFFIX}`;
  const kept = cookieKeeps(cookieProbe, "1", PROBE_COOKIE_MAX_AGE_S);
  try {
    writeCookie(cookieProbe, "", 0);
  } catch {
    // The probe cookie expires on its own in a minute.
  }
  return kept;
}

function clearConsentCookie(): void {
  const values = readCookieValues(consentCookieName());
  if (values !== UNREADABLE && values.length === 0) return;
  try {
    writeCookie(consentCookieName(), "", 0);
  } catch {
    // A cookie left behind disagrees with storage and reads as declined: fail closed.
  }
}

/**
 * Writes the choice where the next page load will read it, best effort:
 * localStorage; else remove the old value (which frees a full quota) and try
 * again; else the consent cookie. If nothing can be written, the old stored
 * value is still removed: a leftover accept would be read back as a silent
 * accept once storage works, while an empty store at least shows the banner.
 */
export function persistChoice(status: ConsentChoice): void {
  if (!localKeeps(CONSENT_STORAGE_KEY, status)) {
    removeLocal(CONSENT_STORAGE_KEY);
    if (!localKeeps(CONSENT_STORAGE_KEY, status)) {
      try {
        writeCookie(consentCookieName(), status, CONSENT_COOKIE_MAX_AGE_S);
      } catch {
        // No store at all: session memory carries the choice; the next page reads the sentinel.
      }
      return;
    }
  }
  clearConsentCookie();
}
