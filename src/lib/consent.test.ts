import assert from "node:assert/strict";
import test from "node:test";
import type { PostHog } from "posthog-js";
import {
  COOKIE_STATES,
  CONSENT_DECISION_TABLE,
  LOCAL_STATES,
  type CookieState,
  type StoreState,
} from "@/lib/consent-decision-table";
import {
  analyticsAllowedNow,
  CONSENT_STORAGE_KEY,
  declineIsDurable,
  gaConsentLevelNow,
  getConsentStatus,
  isConsentChoiceNeeded,
  setConsentStatus,
  subscribeToConsent,
  type ConsentStatus,
} from "@/lib/consent";
import { setPostHogClient } from "@/lib/posthog-client";
import { configureGaOnce, GA_DENIED, gaConsentFor, type GaConsentLevel } from "@/lib/tracking/ga";
import { buildPostHogOptions } from "@/lib/tracking/posthog-options";
import { pushDataLayer } from "@/lib/track";
import { enqueueOrCapture, flushQueue, isConsentRevoked, resetQueueForTests } from "@/lib/tracking/queue";
import { siteConfig } from "@/site.config";

/**
 * Invariant: every consent gate reads the latest choice the visitor made in
 * this browser in any tab, and a decline is never lost or downgraded because
 * storage failed.
 */

type Mode = "us-default" | "strict";
type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; clear(): void };

interface Harness {
  store: Map<string, string>;
  local: Storage;
  session: Storage;
  calls: string[];
  cookies: CookieJar;
  /** Another tab writes the key: the store changes and this tab gets a storage event. */
  remote(key: string | null, newValue: string | null, area?: Storage): void;
  breakGet(): void;
  breakSet(): void;
  /** removeItem throws too: storage that can be read but never changed. */
  breakRemove(): void;
  /** setItem throws for a key that already holds a value (a full quota that a removal frees). */
  breakOverwrite(): void;
  /** getItem works again; the other faults stay. */
  healGet(): void;
  /** Storage works again (a later page load in a browser that recovered). */
  healStorage(): void;
  /** A full page load in the same browser: fresh page memory, same stores and faults. */
  reload(): void;
  /** Another tab of the same browser, sharing the stores. Returns a switcher back to it. */
  openTab(): () => void;
  /** Fire a window event (focus, visibilitychange) on the current page. */
  fire(type: string): void;
}

/** blocked: reads empty and drops writes. readonly: reads the jar but drops writes (a stale cookie that cannot be cleared). */
type CookieFault = "ok" | "blocked" | "readonly" | "throws";

/** document.cookie for one browser: a jar shared by its pages, with the raw writes kept. */
interface CookieJar {
  jar: Map<string, string>;
  shadow?: string;
  writes: string[];
  fault: CookieFault;
}

interface HarnessOptions {
  cookies?: CookieFault;
  /** A cookie already in the browser, as "name=value". */
  initialCookie?: string;
  protocol?: "https:" | "http:";
  /** Cookie text the page sees ahead of the jar: a same-name cookie from a parent domain or deeper path. */
  shadow?: string;
}

/** The consent cookie name the harness's default https page reads and writes. */
const COOKIE = "__Host-site-consent";

function makeStorage(store: Map<string, string>, faults: { get: boolean; set: boolean; remove?: boolean; overwrite?: boolean }): Storage {
  return {
    getItem(k) {
      if (faults.get) throw new Error("SecurityError");
      return store.get(k) ?? null;
    },
    setItem(k, v) {
      if (faults.set || (faults.overwrite && store.has(k))) throw new Error("QuotaExceededError");
      store.set(k, v);
    },
    removeItem(k) {
      if (faults.remove) throw new Error("SecurityError");
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  };
}

function makeDocument(cookies: CookieJar): { cookie: string } {
  return {
    get cookie() {
      if (cookies.fault === "throws") throw new Error("SecurityError");
      if (cookies.fault === "blocked") return "";
      return [cookies.shadow, ...[...cookies.jar].map(([k, v]) => `${k}=${v}`)].filter(Boolean).join("; ");
    },
    set cookie(raw: string) {
      if (cookies.fault === "throws") throw new Error("SecurityError");
      cookies.writes.push(raw);
      if (cookies.fault === "blocked" || cookies.fault === "readonly") return;
      const [pair, ...attrs] = raw.split(";").map((part) => part.trim());
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const expired = attrs.some((a) => /^max-age=(0|-)/i.test(a));
      if (expired) cookies.jar.delete(name);
      else cookies.jar.set(name, pair.slice(eq + 1));
    },
  };
}

function installHarness(mode: Mode, initial?: string, options: HarnessOptions = {}): Harness {
  (siteConfig as { consentMode: Mode }).consentMode = mode;
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(CONSENT_STORAGE_KEY, initial);
  const faults = { get: false, set: false, remove: false, overwrite: false };
  const local = makeStorage(store, faults);
  const session = makeStorage(new Map(), { get: false, set: false });
  const cookies: CookieJar = { jar: new Map(), writes: [], fault: options.cookies ?? "ok", shadow: options.shadow };
  if (options.initialCookie) {
    const [name, value] = options.initialCookie.split("=");
    cookies.jar.set(name, value);
  }
  const calls: string[] = [];
  let optedOut = false;
  const client = {
    opt_out_capturing: () => { optedOut = true; calls.push("opt_out"); },
    opt_in_capturing: () => { optedOut = false; calls.push("opt_in"); },
    has_opted_out_capturing: () => optedOut,
    stopSessionRecording: () => calls.push("stop_recording"),
    startSessionRecording: () => calls.push("start_recording"),
  };
  const windows: { dispatchEvent(e: Event): boolean }[] = [];
  function newWindow(): { dispatchEvent(e: Event): boolean } {
    const target = new EventTarget();
    const win = {
      localStorage: local,
      sessionStorage: session,
      document: makeDocument(cookies),
      location: { protocol: options.protocol ?? "https:" },
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
      gtag: (...args: unknown[]) => calls.push(`gtag:${JSON.stringify(args.slice(0, 3))}`),
      dataLayer: undefined as unknown[] | undefined,
    };
    windows.push(win);
    return win;
  }
  function loadPage(): void {
    (globalThis as { window?: unknown }).window = newWindow();
    optedOut = false;
    setPostHogClient(client as unknown as PostHog);
    resetQueueForTests();
  }
  loadPage();
  const current = () => (globalThis as { window: { dispatchEvent(e: Event): boolean } }).window;
  return {
    store,
    local,
    session,
    calls,
    cookies,
    remote(key, newValue, area = local) {
      if (area === local && key !== null) {
        if (newValue === null) store.delete(key);
        else store.set(key, newValue);
      }
      if (area === local && key === null) store.clear();
      const event = Object.assign(new Event("storage"), { key, newValue, storageArea: area });
      current().dispatchEvent(event);
    },
    breakGet: () => { faults.get = true; },
    breakSet: () => { faults.set = true; },
    breakRemove: () => { faults.remove = true; },
    breakOverwrite: () => { faults.overwrite = true; },
    healGet: () => { faults.get = false; },
    healStorage: () => { faults.get = false; faults.set = false; faults.remove = false; faults.overwrite = false; },
    reload: loadPage,
    openTab() {
      const previous = current();
      (globalThis as { window?: unknown }).window = newWindow();
      return () => { (globalThis as { window?: unknown }).window = previous; };
    },
    fire(type) {
      current().dispatchEvent(new Event(type));
    },
  };
}

function dataLayerLength(): number {
  return ((globalThis as { window: { dataLayer?: unknown[] } }).window.dataLayer ?? []).length;
}

/** Every gate must agree: the status, the shared allow check, and the dataLayer writer. */
function assertGates(expected: ConsentStatus, allowed: boolean, label: string): void {
  assert.equal(getConsentStatus(), expected, `${label}: status`);
  assert.equal(analyticsAllowedNow(), allowed, `${label}: analyticsAllowedNow`);
  const before = dataLayerLength();
  pushDataLayer({ event: "probe" });
  assert.equal(dataLayerLength() - before, allowed ? 1 : 0, `${label}: dataLayer push`);
}

const MODES: Mode[] = ["us-default", "strict"];

test("a decline whose setItem throws still reads as declined at every gate, in both modes", () => {
  for (const mode of MODES) {
    const h = installHarness(mode);
    h.breakSet();
    setConsentStatus("declined");
    assert.equal(h.store.has(CONSENT_STORAGE_KEY), false, `${mode}: nothing persisted`);
    assertGates("declined", false, mode);
    assert.equal(isConsentRevoked(), true, `${mode}: queue latched`);
    assert.ok(h.calls.includes("opt_out"), `${mode}: PostHog opted out`);
  }
});

test("a decline over a stale stored accept wins when the write fails (memory beats a stale read)", () => {
  for (const mode of MODES) {
    installHarness(mode, "accepted").breakSet();
    assertGates("accepted", true, `${mode} before`);
    setConsentStatus("declined");
    assertGates("declined", false, `${mode} after`);
  }
});

test("an accept whose setItem throws still reads as accepted for the page life", () => {
  const h = installHarness("strict");
  h.breakSet();
  setConsentStatus("accepted");
  assertGates("accepted", true, "strict accept");
});

test("a decline survives getItem starting to throw afterwards", () => {
  for (const mode of MODES) {
    const h = installHarness(mode);
    setConsentStatus("declined");
    h.breakGet();
    assertGates("declined", false, mode);
  }
});

test("unreadable storage and no cookie store: no choice can be durable, so it reads as declined and asks, in both modes", () => {
  for (const mode of MODES) {
    for (const cookies of ["blocked", "throws"] as const) {
      installHarness(mode, "accepted", { cookies }).breakGet();
      assertGates("declined", false, `${mode}/${cookies}`);
      assert.equal(isConsentChoiceNeeded(), true, `${mode}/${cookies}: banner asks`);
    }
  }
});

test("unreadable storage is unknown, not empty: only a decline in the cookie is trusted beside it, in both modes", () => {
  for (const mode of MODES) {
    for (const [label, initialCookie, expected, asks] of [
      ["cookie empty", undefined, "declined", true],
      ["cookie declined", `${COOKIE}=declined`, "declined", false],
      // The unreadable store may hold a later decline (review 5746672854): an accept is not trusted.
      ["cookie accepted", `${COOKIE}=accepted`, "declined", true],
    ] as const) {
      installHarness(mode, "declined", { initialCookie }).breakGet();
      assertGates(expected, expected === "accepted", `${mode}/${label}`);
      assert.equal(isConsentChoiceNeeded(), asks, `${mode}/${label}: banner`);
    }
  }
});

const UNRECOGNISED = ["denied", "", "Declined", " declined", "accepted ", "ACCEPTED", "true", "null"];

test("an unrecognised stored value keeps every gate closed but asks the visitor again, in both modes", () => {
  for (const mode of MODES) {
    for (const value of UNRECOGNISED) {
      installHarness(mode, value);
      const label = `${mode}/${JSON.stringify(value)}`;
      assertGates("declined", false, label);
      assert.equal(isConsentChoiceNeeded(), true, `${label}: banner shows`);
    }
  }
});

test("the banner asks exactly when no real choice is known", () => {
  const cases: [string, Mode, string | undefined, (h: Harness) => void, boolean][] = [
    ["nothing stored", "us-default", undefined, () => {}, true],
    ["nothing stored, strict", "strict", undefined, () => {}, true],
    ["stored accept", "us-default", "accepted", () => {}, false],
    ["stored decline", "strict", "declined", () => {}, false],
    ["unreadable storage", "us-default", "declined", (h) => h.breakGet(), true],
    ["failed-write decline", "us-default", undefined, (h) => { h.breakSet(); setConsentStatus("declined"); }, false],
  ];
  for (const [label, mode, initial, setup, needed] of cases) {
    const h = installHarness(mode, initial);
    setup(h);
    assert.equal(isConsentChoiceNeeded(), needed, label);
  }
});

test("unrecognised then accept: the real choice overwrites the bad value and opens the gate", () => {
  for (const mode of MODES) {
    for (const value of UNRECOGNISED) {
      const h = installHarness(mode, value);
      getConsentStatus();
      setConsentStatus("accepted");
      const label = `${mode}/${JSON.stringify(value)}`;
      assert.equal(h.store.get(CONSENT_STORAGE_KEY), "accepted", `${label}: overwritten`);
      assertGates("accepted", true, label);
      assert.equal(isConsentChoiceNeeded(), false, `${label}: banner hides`);
      assert.equal(isConsentRevoked(), false, `${label}: latch lifted`);
    }
  }
});

test("unrecognised then decline: the real choice overwrites the bad value and the gate stays closed", () => {
  for (const mode of MODES) {
    const h = installHarness(mode, "denied");
    getConsentStatus();
    setConsentStatus("declined");
    assert.equal(h.store.get(CONSENT_STORAGE_KEY), "declined", mode);
    assertGates("declined", false, mode);
    assert.equal(isConsentChoiceNeeded(), false, `${mode}: banner hides`);
  }
});

test("unrecognised then accept whose write fails: memory wins, the bad value is removed and the cookie keeps the accept", () => {
  const h = installHarness("strict", "denied");
  getConsentStatus();
  h.breakSet();
  setConsentStatus("accepted");
  assert.equal(h.store.has(CONSENT_STORAGE_KEY), false, "bad value removed");
  assert.equal(h.cookies.jar.get(COOKIE), "accepted", "cookie keeps the accept");
  assertGates("accepted", true, "memory");
  assert.equal(isConsentChoiceNeeded(), false);
});

test("a decline in another tab runs the same opt-out as a local decline", () => {
  for (const mode of MODES) {
    const h = installHarness(mode);
    setConsentStatus("accepted");
    let notified = 0;
    const unsubscribe = subscribeToConsent(() => { notified += 1; });
    h.calls.length = 0;
    h.remote(CONSENT_STORAGE_KEY, "declined");
    unsubscribe();
    assertGates("declined", false, mode);
    assert.equal(isConsentRevoked(), true, `${mode}: queue latched`);
    assert.deepEqual(
      h.calls.filter((c) => !c.startsWith("gtag")),
      ["opt_out", "stop_recording"],
      `${mode}: PostHog opted out and recording stopped`,
    );
    assert.ok(h.calls.some((c) => c.startsWith("gtag") && c.includes("denied")), `${mode}: gtag denied`);
    assert.equal(notified, 1, `${mode}: subscribers told once`);
  }
});

test("a remote decline is applied when no React subscriber is mounted", () => {
  const h = installHarness("us-default");
  assertGates("unset", true, "first read installs the listener");
  h.remote(CONSENT_STORAGE_KEY, "declined");
  assert.equal(isConsentRevoked(), true);
  assert.ok(h.calls.includes("opt_out"));
});

test("an accept in another tab runs the same opt-in as a local accept", () => {
  const h = installHarness("strict");
  setConsentStatus("declined");
  h.calls.length = 0;
  h.remote(CONSENT_STORAGE_KEY, "accepted");
  assertGates("accepted", true, "remote accept");
  assert.equal(isConsentRevoked(), false);
  assert.deepEqual(h.calls.filter((c) => !c.startsWith("gtag")), ["opt_in", "start_recording"]);
  assert.ok(h.calls.some((c) => c.startsWith("gtag") && c.includes("granted")), "gtag analytics storage granted again");
});

test("an unrecognised value written by another tab is a decline that asks the visitor again", () => {
  for (const value of ["denied", "", "granted"]) {
    const h = installHarness("us-default");
    setConsentStatus("accepted");
    h.remote(CONSENT_STORAGE_KEY, value);
    assertGates("declined", false, JSON.stringify(value));
    assert.ok(h.calls.includes("opt_out"));
    assert.equal(isConsentChoiceNeeded(), true, `${JSON.stringify(value)}: banner asks again`);
  }
});

test("removal or clear() by another tab never downgrades a known choice", () => {
  const cases: [string, Mode, string | undefined, (h: Harness) => void, ConsentStatus, boolean][] = [
    ["local decline, remote removeItem", "us-default", undefined, () => setConsentStatus("declined"), "declined", false],
    ["local decline, remote clear", "us-default", undefined, () => setConsentStatus("declined"), "declined", false],
    ["stored decline read at load, remote removeItem", "us-default", "declined", () => getConsentStatus(), "declined", false],
    ["stored decline read at load, remote clear", "us-default", "declined", () => getConsentStatus(), "declined", false],
    ["failed-write decline, remote clear", "us-default", undefined, (h) => { h.breakSet(); setConsentStatus("declined"); }, "declined", false],
  ];
  for (const [label, mode, initial, setup, expected, allowed] of cases) {
    const h = installHarness(mode, initial);
    setup(h);
    h.calls.length = 0;
    if (label.endsWith("clear")) h.remote(null, null);
    else h.remote(CONSENT_STORAGE_KEY, null);
    assertGates(expected, allowed, label);
    assert.deepEqual(h.calls, [], `${label}: no effects`);
  }
});

test("another tab emptying the store while this page holds an accept: the accept is no longer known, so declined and ask", () => {
  for (const mode of MODES) {
    for (const clear of [true, false]) {
      const label = `${mode}, remote ${clear ? "clear" : "removeItem"}`;
      const h = installHarness(mode);
      setConsentStatus("accepted");
      h.calls.length = 0;
      if (clear) h.remote(null, null);
      else h.remote(CONSENT_STORAGE_KEY, null);
      assertGates("declined", false, label);
      assert.equal(isConsentChoiceNeeded(), true, `${label}: asks`);
      assert.ok(h.calls.includes("opt_out"), `${label}: opted out`);
    }
  }
});

test("storage events for other keys or for sessionStorage are ignored", () => {
  const h = installHarness("us-default");
  setConsentStatus("accepted");
  h.calls.length = 0;
  h.remote("some-other-key", "declined");
  h.remote(CONSENT_STORAGE_KEY, "declined", h.session);
  assertGates("accepted", true, "ignored events");
  assert.deepEqual(h.calls, []);
});

test("a remote decline while PostHog init is in flight wins the init-race latch", () => {
  const h = installHarness("us-default");
  assert.equal(analyticsAllowedNow(), true, "init starts");
  enqueueOrCapture("cta_click", {}, undefined, { url: "https://x.test/", pathname: "/" });
  // posthog-js import is in flight here; the decline lands before it resolves.
  h.remote(CONSENT_STORAGE_KEY, "declined");
  assert.equal(analyticsAllowedNow(), false, "re-check after import refuses init");
  assert.equal(flushQueue(() => assert.fail("captured after decline")), 0);
});

test("the latest choice across tabs wins in either order", () => {
  const h = installHarness("strict");
  setConsentStatus("declined");
  h.remote(CONSENT_STORAGE_KEY, "accepted");
  setConsentStatus("declined");
  assertGates("declined", false, "local after remote");
  h.remote(CONSENT_STORAGE_KEY, "accepted");
  h.remote(CONSENT_STORAGE_KEY, "declined");
  assertGates("declined", false, "remote after remote");
});

// posthog-js's own opt-out flag lives in localStorage and silently fails to
// persist when every write throws, so its capture keeps running. Our
// before_send must refuse on our in-memory-first store alone.
const POSTHOG_EVENTS = ["$autocapture", "$pageview", "$rageclick", "$$heatmap", "$web_vitals", "$snapshot"];

function posthogSends(event: string): boolean {
  const beforeSend = buildPostHogOptions("memory").before_send as (c: unknown) => unknown;
  return beforeSend({ uuid: "u", event, properties: { $current_url: "https://x.test/" } }) !== null;
}

test("storage throwing for every key, then decline: posthog-js sends nothing, of any type", () => {
  for (const mode of MODES) {
    const h = installHarness(mode);
    h.breakGet();
    h.breakSet();
    setConsentStatus("accepted");
    for (const event of POSTHOG_EVENTS) assert.equal(posthogSends(event), true, `${mode}/${event}: control, sent after accept`);
    setConsentStatus("declined");
    for (const event of POSTHOG_EVENTS) assert.equal(posthogSends(event), false, `${mode}/${event}: dropped after decline`);
    assert.ok(h.calls.includes("opt_out") && h.calls.includes("stop_recording"), `${mode}: opt-out and recording stop still run`);
  }
});

test("posthog-js sends nothing for a stored decline, an unrecognised value, or strict before accept", () => {
  const cases: [string, Mode, string | undefined, (h: Harness) => void][] = [
    ["stored decline", "us-default", "declined", () => {}],
    ["unrecognised stored value", "us-default", "denied", () => {}],
    ["strict, unset", "strict", undefined, () => {}],
    ["remote decline", "us-default", "accepted", (h) => h.remote(CONSENT_STORAGE_KEY, "declined")],
    ["decline whose write failed", "us-default", undefined, (h) => { h.breakSet(); setConsentStatus("declined"); }],
  ];
  for (const [label, mode, initial, setup] of cases) {
    const h = installHarness(mode, initial);
    setup(h);
    for (const event of POSTHOG_EVENTS) assert.equal(posthogSends(event), false, `${label}/${event}`);
  }
});

test("a later accept lets posthog-js send again, with storage throwing for every key", () => {
  const h = installHarness("us-default");
  h.breakGet();
  h.breakSet();
  setConsentStatus("declined");
  setConsentStatus("accepted");
  for (const event of POSTHOG_EVENTS) assert.equal(posthogSends(event), true, event);
});

test("every decline path disables GA4 in this tab, even with storage throwing", () => {
  process.env.NEXT_PUBLIC_GA4_ID = "G-TEST1";
  const paths: [string, (h: Harness) => void][] = [
    ["local decline", () => setConsentStatus("declined")],
    ["decline in another tab", (h) => h.remote(CONSENT_STORAGE_KEY, "declined")],
    ["decline with every write throwing", (h) => { h.breakGet(); h.breakSet(); setConsentStatus("declined"); }],
    ["unrecognised value from another tab", (h) => h.remote(CONSENT_STORAGE_KEY, "denied")],
  ];
  for (const [label, decline] of paths) {
    const h = installHarness("us-default");
    setConsentStatus("accepted");
    const win = (globalThis as { window: Record<string, unknown> }).window;
    assert.equal(win["ga-disable-G-TEST1"], false, `${label}: enabled after accept`);
    decline(h);
    assert.equal(win["ga-disable-G-TEST1"], true, `${label}: disabled`);
    assert.ok(h.calls.some((c) => c.startsWith("gtag") && c.includes("ad_storage") && c.includes("denied")), `${label}: all consent types denied`);
  }
  delete process.env.NEXT_PUBLIC_GA4_ID;
});

/** The page's dataLayer as an ordered list of gtag commands; plain objects are "object". */
function gtagOrder(): { order: string[]; firstDefault?: Record<string, string> } {
  const dl = ((globalThis as { window: { dataLayer?: unknown[] } }).window.dataLayer ?? []);
  let firstDefault: Record<string, string> | undefined;
  const order = dl.map((entry) => {
    if (Object.prototype.toString.call(entry) !== "[object Arguments]") return "object";
    const [command, kind, value] = Array.from(entry as ArrayLike<unknown>);
    if (command === "consent" && kind === "default" && !firstDefault) firstDefault = value as Record<string, string>;
    return command === "consent" ? `consent ${String(kind)}` : String(command);
  });
  return { order, firstDefault };
}

test("GA consent default is sent before anything else, for every mode and consent state", () => {
  process.env.NEXT_PUBLIC_GA4_ID = "G-TEST1";
  const cases: [string, Mode, string | undefined, (h: Harness) => void, GaConsentLevel][] = [
    ["us-default unset", "us-default", undefined, () => {}, "analytics"],
    ["us-default accepted", "us-default", "accepted", () => {}, "all"],
    ["us-default declined", "us-default", "declined", () => {}, "none"],
    ["us-default unrecognised", "us-default", "denied", () => {}, "none"],
    ["us-default storage failing, cookie works", "us-default", "declined", (h) => { h.breakGet(); h.breakSet(); }, "none"],
    ["us-default storage and cookies failing", "us-default", "declined", (h) => { h.breakGet(); h.breakSet(); h.cookies.fault = "blocked"; }, "none"],
    ["us-default stored accept, storage failing", "us-default", "accepted", (h) => { h.breakGet(); h.breakSet(); }, "none"],
    ["strict unset", "strict", undefined, () => {}, "none"],
    ["strict accepted", "strict", "accepted", () => {}, "all"],
    ["strict declined", "strict", "declined", () => {}, "none"],
    ["strict unrecognised", "strict", "denied", () => {}, "none"],
    ["strict storage failing", "strict", "accepted", (h) => { h.breakGet(); h.breakSet(); }, "none"],
  ];
  for (const [label, mode, initial, setup, level] of cases) {
    const analytics = level === "none" ? "denied" : "granted";
    const h = installHarness(mode, initial);
    setup(h);
    const win = (globalThis as { window: Record<string, unknown> }).window;
    delete win.gtag; // the real gtag, defined by ga.ts, pushing Arguments onto the dataLayer
    pushDataLayer({ event: "section_viewed" });
    configureGaOnce(win, "G-TEST1", gaConsentLevelNow);
    const { order, firstDefault } = gtagOrder();
    assert.equal(order[0], "consent default", `${label}: default first (${order.join(", ")})`);
    assert.deepEqual(firstDefault, gaConsentFor(level), `${label}: default values`);
    assert.equal(order.includes("config"), analytics === "granted", `${label}: config only when allowed`);
    assert.equal(order.includes("object"), analytics === "granted", `${label}: dataLayer event only when allowed, after the default`);
    // A later choice is an update, after the default.
    setConsentStatus(analytics === "granted" ? "declined" : "accepted");
    const after = gtagOrder().order;
    assert.ok(after.lastIndexOf("consent update") > 0, `${label}: update after default`);
    assert.equal(after.filter((c) => c === "consent default").length, 1, `${label}: one default`);
  }
  delete process.env.NEXT_PUBLIC_GA4_ID;
});

// A decline must win for the visitor, not just the page. Each row: the browser's
// stores, what the visitor does on page 1, then a full page load.
type StoreSetup = (h: Harness) => void;
interface NavCase {
  label: string;
  initial?: string;
  options?: HarnessOptions;
  /** Store faults that hold on every page load. */
  faults: StoreSetup;
  choices: ("accepted" | "declined")[];
  expected: ConsentStatus;
  /** Whether the banner asks again on page 2. */
  asks: boolean;
}

const breakAll: StoreSetup = (h) => { h.breakGet(); h.breakSet(); };
const NAV_CASES: NavCase[] = [
  { label: "setItem throws, cookie works", faults: (h) => h.breakSet(), choices: ["declined"], expected: "declined", asks: false },
  { label: "setItem throws, cookie blocked", options: { cookies: "blocked" }, faults: (h) => h.breakSet(), choices: ["declined"], expected: "declined", asks: true },
  { label: "setItem throws, cookie throws", options: { cookies: "throws" }, faults: (h) => h.breakSet(), choices: ["declined"], expected: "declined", asks: true },
  { label: "getItem and setItem throw, cookie works", faults: breakAll, choices: ["declined"], expected: "declined", asks: false },
  { label: "getItem and setItem throw, cookie blocked", options: { cookies: "blocked" }, faults: breakAll, choices: ["declined"], expected: "declined", asks: true },
  { label: "getItem throws only, cookie works", faults: (h) => h.breakGet(), choices: ["declined"], expected: "declined", asks: false },
  { label: "readable not writable, stale accept removable, cookie works", initial: "accepted", faults: (h) => h.breakSet(), choices: ["declined"], expected: "declined", asks: false },
  { label: "readable not writable, stale accept removable, cookie blocked", initial: "accepted", options: { cookies: "blocked" }, faults: (h) => h.breakSet(), choices: ["declined"], expected: "declined", asks: true },
  { label: "read-only storage, stale accept kept, cookie works", initial: "accepted", faults: (h) => { h.breakSet(); h.breakRemove(); }, choices: ["declined"], expected: "declined", asks: true },
  { label: "read-only storage, stale accept kept, cookie blocked", initial: "accepted", options: { cookies: "blocked" }, faults: (h) => { h.breakSet(); h.breakRemove(); }, choices: ["declined"], expected: "declined", asks: true },
  { label: "read-only storage, stale accept kept, cookie throws", initial: "accepted", options: { cookies: "throws" }, faults: (h) => { h.breakSet(); h.breakRemove(); }, choices: ["declined"], expected: "declined", asks: true },
  { label: "accept after decline, setItem throws, cookie works", faults: (h) => h.breakSet(), choices: ["declined", "accepted"], expected: "accepted", asks: false },
  { label: "accept after decline, no store at all", options: { cookies: "blocked" }, faults: breakAll, choices: ["declined", "accepted"], expected: "declined", asks: true },
  { label: "decline after accept, setItem throws, cookie works", faults: (h) => h.breakSet(), choices: ["accepted", "declined"], expected: "declined", asks: false },
  { label: "healthy storage, decline", faults: () => {}, choices: ["declined"], expected: "declined", asks: false },
  { label: "healthy storage, accept", faults: () => {}, choices: ["accepted"], expected: "accepted", asks: false },
];

test("a choice survives a full page load whatever the stores do, and a decline is never read back as allowed", () => {
  for (const mode of MODES) {
    for (const c of NAV_CASES) {
      const label = `${mode}/${c.label}`;
      const h = installHarness(mode, c.initial, c.options);
      c.faults(h);
      for (const choice of c.choices) setConsentStatus(choice);
      for (const page of [2, 3]) {
        h.reload();
        const allowed = c.expected === "accepted";
        assertGates(c.expected, allowed, `${label}: page ${page}`);
        assert.equal(isConsentChoiceNeeded(), c.asks, `${label}: page ${page} banner`);
      }
    }
  }
});

test("a fresh visitor with no durable store reads as declined in every mode, and an accept holds for the page", () => {
  const stores: [string, HarnessOptions, StoreSetup][] = [
    ["setItem throws, cookie blocked", { cookies: "blocked" }, (h) => h.breakSet()],
    ["everything throws", { cookies: "throws" }, breakAll],
    ["getItem throws, cookie blocked", { cookies: "blocked" }, (h) => h.breakGet()],
  ];
  for (const mode of MODES) {
    for (const [label, options, faults] of stores) {
      const h = installHarness(mode, undefined, options);
      faults(h);
      assertGates("declined", false, `${mode}/${label}`);
      assert.equal(isConsentChoiceNeeded(), true, `${mode}/${label}: banner asks`);
      setConsentStatus("accepted");
      assertGates("accepted", true, `${mode}/${label}: accept, this page`);
    }
  }
});

test("a fresh visitor with a durable store is unchanged: unset, allowed only under us-default, and the probe leaves nothing", () => {
  const stores: [string, HarnessOptions, StoreSetup][] = [
    ["healthy storage", {}, () => {}],
    ["setItem throws, cookie works", {}, (h) => h.breakSet()],
    ["healthy storage, cookie blocked", { cookies: "blocked" }, () => {}],
  ];
  for (const [mode, allowed] of [["us-default", true], ["strict", false]] as const) {
    for (const [label, options, faults] of stores) {
      const h = installHarness(mode, undefined, options);
      faults(h);
      assertGates("unset", allowed, `${mode}/${label}`);
      assert.equal(isConsentChoiceNeeded(), true, `${mode}/${label}: banner asks`);
      assert.deepEqual([...h.store.keys()], [], `${mode}/${label}: no probe left in storage`);
      assert.deepEqual([...h.cookies.jar.keys()], [], `${mode}/${label}: no probe cookie left`);
    }
  }
});

test("stores that disagree read as declined and ask again, whichever holds the accept", () => {
  const cases: [string, string, string][] = [
    ["storage accept, cookie decline", "accepted", "declined"],
    ["storage decline, cookie accept", "declined", "accepted"],
    ["storage accept, cookie unrecognised", "accepted", "denied"],
    ["storage unrecognised, cookie accept", "granted", "accepted"],
  ];
  for (const mode of MODES) {
    for (const [label, stored, cookie] of cases) {
      installHarness(mode, stored, { initialCookie: `${COOKIE}=${cookie}` });
      assertGates("declined", false, `${mode}/${label}`);
      assert.equal(isConsentChoiceNeeded(), true, `${mode}/${label}: banner asks`);
    }
  }
});

test("stores that agree, or a cookie alone, are read as the choice", () => {
  const cases: [string, string | undefined, string, ConsentStatus, boolean][] = [
    ["both decline", "declined", "declined", "declined", false],
    ["both accept", "accepted", "accepted", "accepted", false],
    ["cookie decline only", undefined, "declined", "declined", false],
    ["cookie accept only", undefined, "accepted", "accepted", false],
    ["cookie unrecognised only", undefined, "yes", "declined", true],
    ["cookie undecodable only", undefined, "%E0%A4%A", "declined", true],
  ];
  for (const [label, stored, cookie, expected, asks] of cases) {
    installHarness("us-default", stored, { initialCookie: `${COOKIE}=${cookie}` });
    assertGates(expected, expected === "accepted" || (expected === "unset"), label);
    assert.equal(isConsentChoiceNeeded(), asks, `${label}: banner`);
  }
});

test("the cookie is written only when storage cannot keep the choice, and cleared once storage can", () => {
  const h = installHarness("us-default");
  setConsentStatus("declined");
  assert.deepEqual(h.cookies.writes, [], "healthy storage: no cookie write at all");
  h.breakSet();
  setConsentStatus("declined");
  assert.equal(h.cookies.jar.get(COOKIE), "declined", "fallback cookie set");
  h.healStorage();
  h.reload();
  setConsentStatus("accepted");
  assert.equal(h.cookies.jar.has(COOKIE), false, "cookie cleared once storage keeps the choice");
  h.reload();
  assertGates("accepted", true, "next page");
  assert.equal(isConsentChoiceNeeded(), false);
});

test("the fallback cookie records only the choice: Path=/, SameSite=Lax, a long Max-Age, Secure only on https", () => {
  for (const protocol of ["https:", "http:"] as const) {
    const h = installHarness("us-default", undefined, { protocol });
    h.breakSet();
    setConsentStatus("declined");
    const name = protocol === "https:" ? COOKIE : CONSENT_STORAGE_KEY;
    const write = h.cookies.writes.find((w) => w.startsWith(`${name}=declined`));
    assert.ok(write, `${protocol}: written`);
    const attrs = write.split(";").map((a) => a.trim().toLowerCase());
    assert.ok(attrs.includes("path=/"), `${protocol}: path`);
    assert.ok(attrs.includes("samesite=lax"), `${protocol}: samesite`);
    const maxAge = Number(attrs.find((a) => a.startsWith("max-age="))?.slice(8));
    assert.ok(maxAge >= 180 * 24 * 3600, `${protocol}: long max-age (${maxAge})`);
    assert.equal(attrs.includes("secure"), protocol === "https:", `${protocol}: secure`);
    assert.ok(!attrs.some((a) => a.startsWith("domain=")), `${protocol}: host-only`);
  }
});

test("a cookie-only decline in another tab reaches a tab that already holds an accept, on focus or visibility", () => {
  for (const type of ["focus", "visibilitychange", "pageshow"]) {
    const h = installHarness("us-default");
    h.breakSet();
    setConsentStatus("accepted");
    const backToA = h.openTab();
    setConsentStatus("declined");
    backToA();
    // The queue latch is per page in a browser; tab B's decline latched B's, not A's.
    resetQueueForTests();
    h.calls.length = 0;
    assertGates("accepted", true, `${type}: memory before the tab is seen`);
    h.fire(type);
    assertGates("declined", false, `${type}: after`);
    assert.ok(h.calls.includes("opt_out"), `${type}: opt-out ran`);
    assert.equal(isConsentRevoked(), true, `${type}: queue latched`);
  }
});

test("a tab with no choice in memory reads another tab's cookie-only decline at once", () => {
  const h = installHarness("us-default");
  h.breakSet();
  assertGates("unset", true, "B before");
  const backToB = h.openTab();
  setConsentStatus("declined");
  backToB();
  assertGates("declined", false, "B after");
});

test("another tab clearing the cookie is not a choice: a known decline is kept", () => {
  const h = installHarness("us-default");
  h.breakSet();
  setConsentStatus("declined");
  const backToA = h.openTab();
  h.healStorage();
  setConsentStatus("accepted");
  h.breakSet();
  backToA();
  h.store.clear();
  h.calls.length = 0;
  h.fire("focus");
  assertGates("declined", false, "cleared cookie does not downgrade");
  assert.deepEqual(h.calls, []);
});

test("an unchanged cookie on focus does nothing", () => {
  const h = installHarness("us-default");
  h.breakSet();
  setConsentStatus("declined");
  h.calls.length = 0;
  h.fire("focus");
  h.fire("visibilitychange");
  assert.deepEqual(h.calls, []);
});

test("a stored accept that no decline could ever replace is not trusted: declined, and the banner asks", () => {
  const cases: [string, HarnessOptions, StoreSetup, ConsentStatus, boolean][] = [
    ["read-only storage, cookie blocked", { cookies: "blocked" }, (h) => { h.breakSet(); h.breakRemove(); }, "declined", true],
    ["read-only storage, cookie throws", { cookies: "throws" }, (h) => { h.breakSet(); h.breakRemove(); }, "declined", true],
    // Removal alone is not enough: once storage recovers, an emptied store reads as unset.
    ["full storage (removable), cookie blocked", { cookies: "blocked" }, (h) => h.breakSet(), "declined", true],
    ["read-only storage, cookie works", {}, (h) => { h.breakSet(); h.breakRemove(); }, "accepted", false],
    ["healthy storage, cookie blocked", { cookies: "blocked" }, () => {}, "accepted", false],
  ];
  for (const mode of MODES) {
    for (const [label, options, faults, expected, asks] of cases) {
      const h = installHarness(mode, "accepted", options);
      faults(h);
      assertGates(expected, expected === "accepted", `${mode}/${label}`);
      assert.equal(isConsentChoiceNeeded(), asks, `${mode}/${label}: banner`);
      setConsentStatus("accepted");
      assertGates("accepted", true, `${mode}/${label}: an accept here holds for the page`);
    }
  }
});

// A site that reloads after a decline (to unload GTM loaded on Accept) gates the
// reload on declineIsDurable(). Each row: the browser before the page, faults
// during the page, the visitor's choices, and whether a reload is safe.
interface DurableCase {
  label: string;
  initial?: string;
  options?: HarnessOptions;
  faults: StoreSetup;
  choices: ("accepted" | "declined")[];
  durable: boolean;
}

const throwAll: StoreSetup = (h) => { h.breakGet(); h.breakSet(); h.breakRemove(); };
const readOnly: StoreSetup = (h) => { h.breakSet(); h.breakRemove(); };
const DURABLE_CASES: DurableCase[] = [
  { label: "reviewer: stored accept, every storage method throws, accept then decline", initial: "accepted", faults: throwAll, choices: ["accepted", "declined"], durable: false },
  { label: "reviewer, cookie blocked too", initial: "accepted", options: { cookies: "blocked" }, faults: throwAll, choices: ["accepted", "declined"], durable: false },
  { label: "every storage method throws, nothing stored before", faults: throwAll, choices: ["declined"], durable: false },
  { label: "reads but cannot write or remove, stored accept, cookie works", initial: "accepted", faults: readOnly, choices: ["declined"], durable: false },
  { label: "reads but cannot write or remove, stored accept, cookie blocked", initial: "accepted", options: { cookies: "blocked" }, faults: readOnly, choices: ["declined"], durable: false },
  { label: "reads but cannot write or remove, unrecognised value, cookie works", initial: "denied", faults: readOnly, choices: ["declined"], durable: false },
  { label: "setItem throws, accept removable, cookie works", initial: "accepted", faults: (h) => h.breakSet(), choices: ["declined"], durable: true },
  { label: "setItem throws, accept removable, cookie blocked", initial: "accepted", options: { cookies: "blocked" }, faults: (h) => h.breakSet(), choices: ["declined"], durable: false },
  { label: "healthy storage, stale cookie accept that cannot be cleared", options: { initialCookie: `${COOKIE}=accepted`, cookies: "readonly" }, faults: () => {}, choices: ["declined"], durable: false },
  { label: "healthy storage, stale cookie accept that clears", options: { initialCookie: `${COOKIE}=accepted` }, faults: () => {}, choices: ["declined"], durable: true },
  { label: "disagreeing stores at load, both rewritten", initial: "accepted", options: { initialCookie: `${COOKIE}=declined` }, faults: () => {}, choices: ["declined"], durable: true },
  { label: "disagreeing stores at load, cookie cannot be cleared", initial: "declined", options: { initialCookie: `${COOKIE}=accepted`, cookies: "readonly" }, faults: () => {}, choices: ["declined"], durable: false },
  { label: "healthy storage, cookie throws", options: { cookies: "throws" }, faults: () => {}, choices: ["declined"], durable: false },
  { label: "healthy storage", faults: () => {}, choices: ["declined"], durable: true },
  { label: "healthy storage, accept after decline", faults: () => {}, choices: ["declined", "accepted"], durable: false },
  { label: "healthy storage, no choice yet", faults: () => {}, choices: [], durable: false },
];

test("declineIsDurable answers by read-back: true only when every store reads the decline", () => {
  for (const mode of MODES) {
    for (const c of DURABLE_CASES) {
      const h = installHarness(mode, c.initial, c.options);
      c.faults(h);
      for (const choice of c.choices) setConsentStatus(choice);
      assert.equal(declineIsDurable(), c.durable, `${mode}/${c.label}`);
    }
  }
});

test("a reload declineIsDurable allows reads the decline, even after storage recovers", () => {
  for (const mode of MODES) {
    for (const c of DURABLE_CASES.filter((d) => d.durable)) {
      const h = installHarness(mode, c.initial, c.options);
      c.faults(h);
      for (const choice of c.choices) setConsentStatus(choice);
      h.healStorage();
      if (h.cookies.fault !== "throws") h.cookies.fault = "ok";
      h.reload();
      assertGates("declined", false, `${mode}/${c.label}: after reload`);
    }
  }
});

test("the reviewer's sequence is why a reload is refused: storage recovers and the old accept is read", () => {
  const h = installHarness("strict", "accepted", { cookies: "blocked" });
  throwAll(h);
  setConsentStatus("accepted");
  setConsentStatus("declined");
  assert.equal(declineIsDurable(), false);
  h.healStorage();
  h.reload();
  assertGates("accepted", true, "what a reload would have restored");
});

// Regressions from the independent review of #183 (ATTACK1-8), plus variants it did not name.
// Every row ends in the state a later read must give; a decline must never read as allowed.
const S = CONSENT_STORAGE_KEY;
const currentWindow = () => (globalThis as { window: unknown }).window;
const setWindow = (win: unknown) => { (globalThis as { window?: unknown }).window = win; };

test("review M1: a tab whose choice came from a storage event still sees a later cookie-only decline", () => {
  for (const deliverRemoval of [true, false]) {
    for (const event of ["visibilitychange", "focus", "pageshow"]) {
      const label = `${event}${deliverRemoval ? ", removal event delivered" : ""}`;
      const h = installHarness("us-default");
      h.breakSet();
      setConsentStatus("declined");
      const backToA = h.openTab();
      const tabB = currentWindow();
      h.healStorage();
      setConsentStatus("accepted");
      backToA();
      h.remote(S, "accepted");
      assertGates("accepted", true, `${label}: A follows B's accept`);
      setWindow(tabB);
      h.breakSet();
      setConsentStatus("declined");
      assert.equal(declineIsDurable(), true, `${label}: B's decline is durable`);
      backToA();
      resetQueueForTests();
      if (deliverRemoval) h.remote(S, null);
      h.fire(event);
      assertGates("declined", false, `${label}: A after B's durable decline`);
    }
  }
});

test("review M2: a page restored from the back/forward cache applies a decline made on a later page", () => {
  for (const mode of MODES) {
    for (const [label, initial, options, faults] of [
      ["healthy storage", "accepted", {}, () => {}],
      ["setItem throws, cookie works", undefined, {}, (h: Harness) => h.breakSet()],
    ] as [string, string | undefined, HarnessOptions, StoreSetup][]) {
      const h = installHarness(mode, initial, options);
      faults(h);
      setConsentStatus("accepted");
      assertGates("accepted", true, `${mode}/${label}: page 1`);
      const backToPage1 = h.openTab();
      setConsentStatus("declined");
      backToPage1();
      resetQueueForTests();
      h.calls.length = 0;
      h.fire("pageshow");
      assertGates("declined", false, `${mode}/${label}: page 1 restored`);
      assert.ok(h.calls.includes("opt_out"), `${mode}/${label}: opt-out ran on restore`);
    }
  }
});

test("review L1/L5: a same-name cookie from elsewhere never turns a decline into an allow, nor hides a healthy accept", () => {
  const cases: [string, HarnessOptions, StoreSetup, "accepted" | "declined", ConsentStatus, boolean, boolean][] = [
    ["https: foreign plain site-consent=accepted beside our cookie decline", { shadow: "site-consent=accepted" }, (h) => h.breakSet(), "declined", "declined", false, true],
    ["https: second __Host- value accepted (same-origin only) beside our decline", { shadow: `${COOKIE}=accepted` }, (h) => h.breakSet(), "declined", "declined", true, false],
    ["http: shadowing site-consent=accepted beside our decline", { protocol: "http:", shadow: "site-consent=accepted" }, (h) => h.breakSet(), "declined", "declined", true, false],
    ["https: foreign plain cookie, healthy storage, accept", { shadow: "site-consent=yes" }, () => {}, "accepted", "accepted", false, false],
    ["https: foreign plain cookie, healthy storage, decline", { shadow: "site-consent=accepted" }, () => {}, "declined", "declined", false, true],
  ];
  for (const mode of MODES) {
    for (const [label, options, faults, choice, expected, asks, durable] of cases) {
      const h = installHarness(mode, undefined, options);
      faults(h);
      setConsentStatus(choice);
      assert.equal(declineIsDurable(), durable, `${mode}/${label}: declineIsDurable`);
      h.reload();
      assertGates(expected, expected === "accepted", `${mode}/${label}: next page`);
      assert.equal(isConsentChoiceNeeded(), asks, `${mode}/${label}: banner`);
    }
  }
});

test("review L2: a full quota is freed by removing the old value, so the decline is written", () => {
  for (const mode of MODES) {
    const h = installHarness(mode, "accepted", { cookies: "blocked" });
    h.breakOverwrite();
    setConsentStatus("declined");
    assert.equal(h.store.get(S), "declined", `${mode}: written after the removal`);
    assert.equal(declineIsDurable(), true, mode);
    h.healStorage();
    h.reload();
    assertGates("declined", false, `${mode}: after recovery`);
  }
});

test("review L2: a store that can only remove is not trusted with an accept, and its decline is never vouched for", () => {
  for (const mode of MODES) {
    const h = installHarness(mode, "accepted", { cookies: "blocked" });
    h.breakSet();
    assertGates("declined", false, `${mode}: the stored accept is not trusted here`);
    setConsentStatus("declined");
    assert.equal(h.store.has(S), false, `${mode}: the accept is removed, never left to be read back`);
    assert.equal(declineIsDurable(), false, `${mode}: no reload`);
    h.reload();
    assertGates("declined", false, `${mode}: next page while storage is broken`);
    // Nothing anywhere holds the decline, so a recovered browser reads like a first visit: unset, banner asks.
    h.healStorage();
    h.reload();
    assertGates("unset", mode === "us-default", `${mode}: after recovery`);
    assert.equal(isConsentChoiceNeeded(), true, `${mode}: banner asks after recovery`);
  }
});

test("review L3: a durable decline whose storage turns unreadable on a later load stays declined", () => {
  for (const mode of MODES) {
    const h = installHarness(mode);
    setConsentStatus("declined");
    assert.equal(declineIsDurable(), true, mode);
    h.breakGet();
    h.breakSet();
    h.reload();
    assertGates("declined", false, `${mode}: next load`);
    assert.equal(isConsentChoiceNeeded(), true, `${mode}: banner asks`);
  }
});

test("memory still wins over stores that did not change: a decline whose writes failed survives every re-check", () => {
  for (const mode of MODES) {
    const h = installHarness(mode, "accepted", { cookies: "blocked" });
    h.breakSet();
    h.breakRemove();
    setConsentStatus("declined");
    h.calls.length = 0;
    for (const event of ["focus", "visibilitychange", "pageshow"]) h.fire(event);
    h.remote(null, null, h.session);
    assertGates("declined", false, mode);
    assert.deepEqual(h.calls, [], `${mode}: no effects`);
  }
});

test("a restored page re-checks with nothing changed: no effects, and a later accept elsewhere is the latest choice", () => {
  const h = installHarness("us-default");
  setConsentStatus("declined");
  h.calls.length = 0;
  h.fire("pageshow");
  assert.deepEqual(h.calls, [], "unchanged: nothing");
  const backToPage1 = h.openTab();
  setConsentStatus("accepted");
  backToPage1();
  h.fire("pageshow");
  assertGates("accepted", true, "the visitor's latest choice");
});

test("another tab clearing storage leaves a cookie-only decline in force", () => {
  const h = installHarness("us-default");
  h.breakSet();
  setConsentStatus("declined");
  h.calls.length = 0;
  h.remote(null, null);
  h.fire("focus");
  assertGates("declined", false, "after clear");
  assert.deepEqual(h.calls, []);
});

// Review round 2 (N6, N3): the first read and every re-check share one derivation.
test("review N6: a re-check never adopts a stored accept the first read refused, after an in-page decline", () => {
  const recoveries: [string, (h: Harness) => void][] = [
    ["focus after getItem recovers", (h) => h.fire("focus")],
    ["pageshow after getItem recovers", (h) => h.fire("pageshow")],
    ["a storage event re-announcing the stale accept", (h) => h.remote(S, "accepted")],
  ];
  for (const mode of MODES) {
    for (const [label, recover] of recoveries) {
      const h = installHarness(mode, "accepted", { cookies: "blocked" });
      h.breakSet();
      h.breakRemove();
      assertGates("declined", false, `${mode}/${label}: first read refuses the accept`);
      setConsentStatus("declined");
      h.breakGet();
      h.fire("focus");
      h.healGet();
      recover(h);
      assertGates("declined", false, `${mode}/${label}`);
      assert.equal(isConsentChoiceNeeded(), false, `${mode}/${label}: the visitor's decline stands, no new question`);
    }
  }
});

test("review N3: another tab's decline that could only delete the stored accept closes a tab holding that accept", () => {
  const deliveries: [string, (h: Harness) => void][] = [
    ["storage event for the removal", (h) => h.remote(S, null)],
    ["focus", (h) => h.fire("focus")],
    ["pageshow", (h) => h.fire("pageshow")],
  ];
  for (const mode of MODES) {
    for (const [label, deliver] of deliveries) {
      const h = installHarness(mode, undefined, { cookies: "blocked" });
      setConsentStatus("accepted");
      h.breakSet();
      const backToA = h.openTab();
      assertGates("declined", false, `${mode}/${label}: B does not trust an accept it cannot replace`);
      setConsentStatus("declined");
      assert.equal(h.store.has(S), false, `${mode}/${label}: B could only delete`);
      backToA();
      resetQueueForTests();
      h.calls.length = 0;
      deliver(h);
      assertGates("declined", false, `${mode}/${label}: A`);
      assert.equal(isConsentChoiceNeeded(), true, `${mode}/${label}: A asks`);
      assert.ok(h.calls.includes("opt_out"), `${mode}/${label}: A opted out`);
    }
  }
});

test("an emptied store leaves a decline as it was: no new question, no effects", () => {
  for (const mode of MODES) {
    const h = installHarness(mode);
    setConsentStatus("declined");
    h.calls.length = 0;
    h.remote(S, null);
    h.remote(null, null);
    h.fire("focus");
    assertGates("declined", false, mode);
    assert.equal(isConsentChoiceNeeded(), false, `${mode}: no new question`);
    assert.deepEqual(h.calls, [], `${mode}: no effects`);
  }
});

// The decision table, cell by cell, against the rules stated in consent-decision-table.ts.
function expectedCell(local: StoreState, cookie: CookieState): { result: string; ask: boolean; durable: boolean } {
  const states: string[] = [local, cookie];
  const durable = !states.includes("unreadable") && cookie !== "multiple"
    && states.some((x) => x === "declined") && states.every((x) => x === "declined" || x === "absent");
  if (states.includes("declined")) {
    const other = local === "declined" ? cookie : local;
    return { result: "declined", ask: ["accepted", "unrecognised", "multiple"].includes(other), durable };
  }
  if (states.some((x) => x === "unrecognised" || x === "multiple" || x === "unreadable")) return { result: "declined", ask: true, durable };
  if (states.includes("accepted")) return { result: "accepted", ask: false, durable };
  return { result: "unset", ask: true, durable };
}

/** Puts a page in exactly one store state per store. */
function setupCell(mode: Mode, local: StoreState, cookie: CookieState): Harness {
  const localValue = { absent: undefined, accepted: "accepted", declined: "declined", unrecognised: "denied", unreadable: "accepted" }[local];
  const cookieValue = { absent: undefined, accepted: "accepted", declined: "declined", unrecognised: "yes", unreadable: undefined, multiple: "declined" }[cookie];
  const h = installHarness(mode, localValue, {
    initialCookie: cookieValue === undefined ? undefined : `${COOKIE}=${cookieValue}`,
    cookies: cookie === "unreadable" ? "throws" : "ok",
    shadow: cookie === "multiple" ? `${COOKIE}=accepted` : undefined,
  });
  if (local === "unreadable") h.breakGet();
  return h;
}

test("the decision table has exactly one cell for every store state, and each follows the stated rules", () => {
  assert.deepEqual(Object.keys(CONSENT_DECISION_TABLE).sort(), [...LOCAL_STATES].sort());
  for (const local of LOCAL_STATES) {
    assert.deepEqual(Object.keys(CONSENT_DECISION_TABLE[local]).sort(), [...COOKIE_STATES].sort(), local);
    for (const cookie of COOKIE_STATES) {
      const cell = CONSENT_DECISION_TABLE[local][cookie];
      const { reason, ...decided } = cell;
      assert.deepEqual(decided, expectedCell(local, cookie), `${local} x ${cookie}`);
      assert.ok(reason.length > 0, `${local} x ${cookie}: reason`);
      if (decided.durable) assert.equal(decided.result, "declined", `${local} x ${cookie}: durable only where a decline is read`);
      if (decided.result === "accepted") assert.ok(![local, cookie].some((x) => ["declined", "unrecognised", "unreadable", "multiple"].includes(x)), `${local} x ${cookie}: accept only when nothing doubts it`);
    }
  }
});

test("every cell of the cross product is what the gates read, in both modes", () => {
  for (const mode of MODES) {
    for (const local of LOCAL_STATES) {
      for (const cookie of COOKIE_STATES) {
        const label = `${mode}/${local} x ${cookie}`;
        setupCell(mode, local, cookie);
        const cell = CONSENT_DECISION_TABLE[local][cookie];
        // The page itself can always write here (healthy setItem), so the trust rule never overrides the cell.
        const status: ConsentStatus = cell.result;
        assertGates(status, isAnalyticsAllowedFor(mode, status), label);
        assert.equal(isConsentChoiceNeeded(), cell.ask, `${label}: banner`);
        if (status === "declined") assert.equal(declineIsDurable(), cell.durable, `${label}: declineIsDurable`);
        else assert.equal(declineIsDurable(), false, `${label}: declineIsDurable`);
      }
    }
  }
});

function isAnalyticsAllowedFor(mode: Mode, status: ConsentStatus): boolean {
  return mode === "strict" ? status === "accepted" : status !== "declined";
}

test("review 5746672854: a stale uncleared cookie accept, a later localStorage decline, then storage unreadable: still declined", () => {
  for (const mode of MODES) {
    for (const [label, unreadableAs] of [["getItem throws on the next load", "reload"], ["getItem throws on this page, then focus", "recheck"]] as const) {
      const h = installHarness(mode, undefined, { initialCookie: `${COOKIE}=accepted`, cookies: "readonly" });
      assertGates("accepted", true, `${mode}/${label}: the old cookie accept`);
      setConsentStatus("declined");
      assert.equal(h.store.get(S), "declined", `${mode}/${label}: the decline is in storage`);
      assert.equal(h.cookies.jar.get(COOKIE), "accepted", `${mode}/${label}: the cookie could not be cleared`);
      h.breakGet();
      if (unreadableAs === "reload") h.reload();
      else h.fire("focus");
      assertGates("declined", false, `${mode}/${label}`);
      assert.equal(declineIsDurable(), false, `${mode}/${label}: no reload vouched for while a store is unreadable`);
    }
  }
});

// Google ad consent: granted only by an explicit Accept the store reads as
// "accepted"; every other state leaves the three ad types denied, and every
// decline path sends deny-all.

const ALL_GRANTED = { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" };
const ANALYTICS_ONLY = { ...GA_DENIED, analytics_storage: "granted" };

/** Swap the harness's recording gtag for the one ga.ts defines, so every command lands in the dataLayer in order. */
function swapInRealGtag(): void {
  delete (globalThis as { window: { gtag?: unknown } }).window.gtag;
}

/** Every consent command of one kind in this page's dataLayer, in order. */
function consentPayloads(kind: "default" | "update"): Record<string, string>[] {
  const dl = ((globalThis as { window: { dataLayer?: unknown[] } }).window.dataLayer ?? []);
  return dl
    .filter((entry) => Object.prototype.toString.call(entry) === "[object Arguments]")
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter(([command, k]) => command === "consent" && k === kind)
    .map(([, , value]) => value as Record<string, string>);
}

/** What GoogleAnalytics and pushDataLayer do on load: the default, then config when allowed. */
function loadGa(): void {
  swapInRealGtag();
  pushDataLayer({ event: "section_viewed" });
  configureGaOnce((globalThis as { window: Record<string, unknown> }).window, "G-TEST1", gaConsentLevelNow);
}

function lastUpdate(): Record<string, string> | undefined {
  return consentPayloads("update").at(-1);
}

function expectedLevel(mode: Mode, result: "accepted" | "declined" | "unset"): GaConsentLevel {
  if (result === "accepted") return "all";
  return mode === "us-default" && result === "unset" ? "analytics" : "none";
}

test("ad consent over every decision-table cell, in both modes: the default, then Accept and Decline updates", () => {
  process.env.NEXT_PUBLIC_GA4_ID = "G-TEST1";
  for (const mode of MODES) {
    for (const local of LOCAL_STATES) {
      for (const cookie of COOKIE_STATES) {
        const label = `${mode}/${local} x ${cookie}`;
        setupCell(mode, local, cookie);
        const level = expectedLevel(mode, CONSENT_DECISION_TABLE[local][cookie].result);
        assert.equal(gaConsentLevelNow(), level, `${label}: level`);
        loadGa();
        assert.equal(gtagOrder().order[0], "consent default", `${label}: the default is the first command`);
        assert.deepEqual(consentPayloads("default"), [gaConsentFor(level)], `${label}: one default, ads only for a stored accept`);
        assert.deepEqual(consentPayloads("update"), level === "none" ? [GA_DENIED] : [], `${label}: a page that may not run GA is denied outright`);
        setConsentStatus("accepted");
        assert.deepEqual(lastUpdate(), ALL_GRANTED, `${label}: an explicit Accept grants every type`);
        setConsentStatus("declined");
        assert.deepEqual(lastUpdate(), GA_DENIED, `${label}: a Decline denies every type`);
        assert.equal(gtagOrder().order.filter((c) => c === "consent default").length, 1, `${label}: still one default`);
      }
    }
  }
  delete process.env.NEXT_PUBLIC_GA4_ID;
});

test("ad consent across page loads: only a durably stored Accept grants ads by default on the next page", () => {
  process.env.NEXT_PUBLIC_GA4_ID = "G-TEST1";
  const cases: { label: string; initial?: string; options?: HarnessOptions; faults: StoreSetup; next: GaConsentLevel }[] = [
    { label: "healthy storage", faults: () => {}, next: "all" },
    { label: "setItem throws, the cookie keeps the accept", faults: (h) => h.breakSet(), next: "all" },
    { label: "getItem and setItem throw, the cookie keeps the accept", faults: breakAll, next: "none" },
    { label: "setItem throws, cookie blocked: nothing keeps it", options: { cookies: "blocked" }, faults: (h) => h.breakSet(), next: "none" },
    { label: "everything throws: nothing keeps it", options: { cookies: "throws" }, faults: breakAll, next: "none" },
    { label: "read-only storage holding an old accept, cookie blocked", initial: "accepted", options: { cookies: "blocked" }, faults: (h) => { h.breakSet(); h.breakRemove(); }, next: "none" },
    { label: "read-only storage holding an old decline, cookie works", initial: "declined", faults: (h) => { h.breakSet(); h.breakRemove(); }, next: "none" },
  ];
  for (const mode of MODES) {
    for (const c of cases) {
      const label = `${mode}/${c.label}`;
      const h = installHarness(mode, c.initial, c.options);
      c.faults(h);
      loadGa();
      setConsentStatus("accepted");
      assert.deepEqual(lastUpdate(), ALL_GRANTED, `${label}: the Accept grants ads on this page`);
      h.reload();
      loadGa();
      // An empty store with nothing writable reads declined (an earlier decline may be lost), never a first visit.
      assert.deepEqual(consentPayloads("default"), [gaConsentFor(c.next)], `${label}: next page default`);
      assert.equal(gaConsentLevelNow(), c.next, `${label}: next page level`);
    }
  }
  delete process.env.NEXT_PUBLIC_GA4_ID;
});

test("every decline path after an Accept sends deny-all and the next page defaults to no ads", () => {
  process.env.NEXT_PUBLIC_GA4_ID = "G-TEST1";
  const paths: [string, (h: Harness) => void][] = [
    ["local decline", () => setConsentStatus("declined")],
    ["decline in another tab (storage event)", (h) => h.remote(CONSENT_STORAGE_KEY, "declined")],
    ["decline in another tab, then focus", (h) => { const back = h.openTab(); setConsentStatus("declined"); back(); h.fire("focus"); }],
    ["another tab clears storage", (h) => h.remote(null, null)],
    ["another tab removes the key", (h) => h.remote(CONSENT_STORAGE_KEY, null)],
    ["unrecognised value from another tab", (h) => h.remote(CONSENT_STORAGE_KEY, "granted")],
    ["decline with every write throwing", (h) => { h.breakGet(); h.breakSet(); setConsentStatus("declined"); }],
  ];
  for (const mode of MODES) {
    for (const [label, decline] of paths) {
      const name = `${mode}/${label}`;
      const h = installHarness(mode);
      loadGa();
      setConsentStatus("accepted");
      assert.deepEqual(lastUpdate(), ALL_GRANTED, `${name}: granted after Accept`);
      decline(h);
      assert.deepEqual(lastUpdate(), GA_DENIED, `${name}: deny-all`);
      assert.equal(gaConsentLevelNow(), "none", `${name}: level`);
      h.reload();
      loadGa();
      const [nextDefault] = consentPayloads("default");
      assert.deepEqual([nextDefault.ad_storage, nextDefault.ad_user_data, nextDefault.ad_personalization], ["denied", "denied", "denied"], `${name}: no ads on the next page`);
    }
  }
  delete process.env.NEXT_PUBLIC_GA4_ID;
});

test("an Accept in another tab grants ads here; us-default with no choice never does", () => {
  process.env.NEXT_PUBLIC_GA4_ID = "G-TEST1";
  for (const mode of MODES) {
    const h = installHarness(mode);
    loadGa();
    assert.deepEqual(consentPayloads("default"), [mode === "us-default" ? ANALYTICS_ONLY : GA_DENIED], `${mode}: no choice, no ads`);
    h.remote(CONSENT_STORAGE_KEY, "accepted");
    assert.deepEqual(lastUpdate(), ALL_GRANTED, `${mode}: remote accept`);
    assert.equal(gaConsentLevelNow(), "all", `${mode}: level`);
  }
  delete process.env.NEXT_PUBLIC_GA4_ID;
});
