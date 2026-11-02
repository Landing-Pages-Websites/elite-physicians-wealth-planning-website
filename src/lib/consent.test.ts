import assert from "node:assert/strict";
import test from "node:test";
import type { PostHog } from "posthog-js";
import {
  analyticsAllowedNow,
  CONSENT_STORAGE_KEY,
  getConsentStatus,
  isConsentChoiceNeeded,
  setConsentStatus,
  siteConfig,
  subscribeToConsent,
  type ConsentStatus,
} from "@/lib/consent";
import { setPostHogClient } from "@/lib/posthog-client";
import { pushDataLayer } from "@/lib/track";
import { enqueueOrCapture, flushQueue, isConsentRevoked, resetQueueForTests } from "@/lib/tracking/queue";

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
  /** Another tab writes the key: the store changes and this tab gets a storage event. */
  remote(key: string | null, newValue: string | null, area?: Storage): void;
  breakGet(): void;
  breakSet(): void;
}

function makeStorage(store: Map<string, string>, faults: { get: boolean; set: boolean }): Storage {
  return {
    getItem(k) {
      if (faults.get) throw new Error("SecurityError");
      return store.get(k) ?? null;
    },
    setItem(k, v) {
      if (faults.set) throw new Error("QuotaExceededError");
      store.set(k, v);
    },
    removeItem(k) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  };
}

function installHarness(mode: Mode, initial?: string): Harness {
  (siteConfig as { consentMode: Mode }).consentMode = mode;
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(CONSENT_STORAGE_KEY, initial);
  const faults = { get: false, set: false };
  const local = makeStorage(store, faults);
  const session = makeStorage(new Map(), { get: false, set: false });
  const target = new EventTarget();
  const calls: string[] = [];
  const win = {
    localStorage: local,
    sessionStorage: session,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    gtag: (...args: unknown[]) => calls.push(`gtag:${JSON.stringify(args.slice(0, 3))}`),
    dataLayer: undefined as unknown[] | undefined,
  };
  (globalThis as { window?: unknown }).window = win;
  let optedOut = false;
  const client = {
    opt_out_capturing: () => { optedOut = true; calls.push("opt_out"); },
    opt_in_capturing: () => { optedOut = false; calls.push("opt_in"); },
    has_opted_out_capturing: () => optedOut,
    stopSessionRecording: () => calls.push("stop_recording"),
    startSessionRecording: () => calls.push("start_recording"),
  };
  setPostHogClient(client as unknown as PostHog);
  resetQueueForTests();
  return {
    store,
    local,
    session,
    calls,
    remote(key, newValue, area = local) {
      if (area === local && key !== null) {
        if (newValue === null) store.delete(key);
        else store.set(key, newValue);
      }
      if (area === local && key === null) store.clear();
      const event = Object.assign(new Event("storage"), { key, newValue, storageArea: area });
      win.dispatchEvent(event);
    },
    breakGet: () => { faults.get = true; },
    breakSet: () => { faults.set = true; },
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

test("unreadable storage with no choice yet reads as unset: allowed only under us-default", () => {
  for (const [mode, allowed] of [["us-default", true], ["strict", false]] as const) {
    installHarness(mode, "declined").breakGet();
    assertGates("unset", allowed, mode);
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

test("unrecognised then accept whose write fails: memory wins over the bad stored value", () => {
  const h = installHarness("strict", "denied");
  getConsentStatus();
  h.breakSet();
  setConsentStatus("accepted");
  assert.equal(h.store.get(CONSENT_STORAGE_KEY), "denied", "bad value still stored");
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
  assert.deepEqual(h.calls, ["opt_in", "start_recording"]);
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
    ["strict accept, remote clear", "strict", undefined, () => setConsentStatus("accepted"), "accepted", true],
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
