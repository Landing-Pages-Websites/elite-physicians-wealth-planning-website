import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { PostHog } from "posthog-js";
import { startGoogleAnalytics } from "../src/components/analytics/DeferredGoogleAnalytics";
import { startPostHogAnalytics } from "../src/components/analytics/PostHogProvider";
import { analyticsAllowedNow, CONSENT_STORAGE_KEY, getConsentStatus, setConsentStatus } from "../src/lib/consent";
import { POSTHOG_KEY } from "../src/lib/tracking/destination";
import { setPostHogClient } from "../src/lib/posthog-client";
import { configureGaOnce, GA_DENIED } from "../src/lib/tracking/ga";
import { resetQueueForTests } from "../src/lib/tracking/queue";
import { storageDouble } from "../src/lib/__fixtures__/storage-double";

/** What the template GoogleAnalytics runs in the gtag.js Script onReady. */
function onGtagReady(id: string): void {
  configureGaOnce(window, id, analyticsAllowedNow);
}

type StorageFailure = { getItem?: boolean; setItem?: boolean };

function browser(fails: StorageFailure = {}) {
  let sequence = 0;
  const timers = new Map<number, () => void>();
  const target = new EventTarget();
  const fake = Object.assign(target, {
    localStorage: storageDouble(null, { getThrows: fails.getItem, setThrows: fails.setItem }),
    location: { hostname: "example.test", pathname: "/", href: "https://example.test/" },
    setTimeout: (callback: () => void) => { timers.set(++sequence, callback); return sequence; },
    clearTimeout: (id: number) => { timers.delete(id); },
    dataLayer: [] as Record<string, unknown>[],
    gtag: undefined as Window["gtag"],
  });
  // The document is just enough for PostHog's pre-init answer-text marking (no choice controls).
  const document = { cookie: "", fonts: { ready: new Promise(() => {}) }, documentElement: {}, querySelectorAll: () => [] };
  class MutationObserver { observe(): void {} disconnect(): void {} }
  Object.assign(globalThis, { window: fake, document, MutationObserver });
  return {
    fake, timers,
    release() { for (const callback of [...timers.values()]) callback(); },
    /** Another tab writes the consent key: the browser fires `storage` here only. */
    otherTab(value: string) {
      fake.localStorage.setItem(CONSENT_STORAGE_KEY, value);
      fake.dispatchEvent(Object.assign(new Event("storage"), {
        key: CONSENT_STORAGE_KEY, newValue: value, storageArea: fake.localStorage,
      }));
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function posthogMock() {
  let initializations = 0;
  let optedOut = false;
  let options: Record<string, unknown> = {};
  let key = "";
  const optIns: unknown[] = [];
  const client = {
    init: (token: string, config: Record<string, unknown>) => { initializations++; key = token; options = config; },
    register: () => {},
    capture: () => {},
    has_opted_out_capturing: () => optedOut,
    opt_out_capturing: () => { optedOut = true; },
    opt_in_capturing: (config: unknown) => { optedOut = false; optIns.push(config); },
    startSessionRecording: () => {},
    stopSessionRecording: () => {},
  } as unknown as PostHog;
  return { client, optIns, get initializations() { return initializations; },
    get optedOut() { return optedOut; }, get options() { return options; }, get key() { return key; } };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "document"); Reflect.deleteProperty(globalThis, "MutationObserver"); resetQueueForTests();
  setPostHogClient(null as unknown as PostHog);
});

test("Google preserves early dataLayer events, configures once, and never grants after decline", () => {
  const env = browser(); const readiness: boolean[] = [];
  const earlyLead = { event: "form_submission", formIntent: "strategy-call" };
  env.fake.dataLayer.push(earlyLead);
  const originalQueue = env.fake.dataLayer;
  const stop = startGoogleAnalytics("G-TEST-ONCE", (ready) => readiness.push(ready));
  assert.equal(env.fake.dataLayer, originalQueue);
  assert.equal(readiness.length, 0);
  env.fake.dataLayer.push({ event: "guide_download" });
  env.release(); setConsentStatus("declined"); env.release();
  assert.equal(readiness.at(-1), false);
  assert.deepEqual(Array.from(env.fake.dataLayer.at(-1) as unknown as ArrayLike<unknown>),
    ["consent", "update", GA_DENIED]);
  assert.equal((env.fake as unknown as Record<string, unknown>)["ga-disable-G-TEST-ONCE"], true);
  // gtag.js finishing its load after the decline configures nothing.
  onGtagReady("G-TEST-ONCE");
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "config").length, 0);
  setConsentStatus("accepted"); env.release(); onGtagReady("G-TEST-ONCE"); stop();
  const remount = startGoogleAnalytics("G-TEST-ONCE", () => {}); env.release(); onGtagReady("G-TEST-ONCE"); remount();
  // The Consent Mode default is the first entry, ahead of the early lead.
  assert.deepEqual(Array.from(env.fake.dataLayer[0] as unknown as ArrayLike<unknown>).slice(0, 2), ["consent", "default"]);
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "config").length, 1);
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "js").length, 1);
  assert.equal(env.fake.dataLayer.filter((entry) => entry === earlyLead).length, 1);
  assert.equal(env.fake.dataLayer.filter((entry) => entry.event === "guide_download").length, 1);
  assert.equal(env.timers.size, 0);
});

test("Google decline before readiness prevents config and unmount prevents late startup", () => {
  const env = browser(); const readiness: boolean[] = [];
  const stop = startGoogleAnalytics("G-TEST-CANCEL", (ready) => readiness.push(ready));
  setConsentStatus("declined"); env.release();
  assert.deepEqual(readiness, [false]);
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "config").length, 0);
  setConsentStatus("accepted"); stop(); env.release();
  assert.deepEqual(readiness, [false]);
});

test("stored decline schedules neither SDK on mount", () => {
  const env = browser(); let imports = 0;
  env.fake.localStorage.setItem("site-consent", "declined");
  const stopGoogle = startGoogleAnalytics("G-TEST-DECLINED", (ready) => assert.equal(ready, false));
  const stopPostHog = startPostHogAnalytics(() => { imports++; return new Promise(() => {}); });
  assert.equal(env.timers.size, 0); env.release(); assert.equal(imports, 0);
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "config").length, 0);
  stopGoogle(); stopPostHog();
});

test("readiness rechecks persisted decline even without a consent broadcast", () => {
  const env = browser(); const readiness: boolean[] = []; let imports = 0;
  const stopGoogle = startGoogleAnalytics("G-TEST-PERSISTED", (ready) => readiness.push(ready));
  const stopPostHog = startPostHogAnalytics(() => { imports++; return new Promise(() => {}); });
  env.fake.localStorage.setItem("site-consent", "declined"); env.release();
  assert.deepEqual(readiness, [false]); assert.equal(imports, 0);
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "config").length, 0);
  stopGoogle(); stopPostHog();
});

test("PostHog unmount invalidates an in-flight import", async () => {
  const env = browser(); const sdk = posthogMock();
  const pending = deferred<{ default: PostHog }>();
  const stop = startPostHogAnalytics(() => pending.promise);
  env.release(); stop(); pending.resolve({ default: sdk.client }); await pending.promise;
  assert.equal(sdk.initializations, 0);
});

test("PostHog cancels before/during import, permits reaccept, initializes once and retains options", async () => {
  const env = browser(); const sdk = posthogMock();
  const first = deferred<{ default: PostHog }>(); let imports = 0;
  const stop = startPostHogAnalytics(() => { imports++; return first.promise; });
  assert.equal(imports, 0);
  setConsentStatus("declined"); env.release(); assert.equal(imports, 0);
  setConsentStatus("accepted"); env.release(); assert.equal(imports, 1);
  setConsentStatus("declined"); first.resolve({ default: sdk.client }); await first.promise;
  assert.equal(sdk.initializations, 0);
  setConsentStatus("accepted"); env.release(); await Promise.resolve();
  assert.equal(sdk.initializations, 1);
  assert.equal(sdk.key, POSTHOG_KEY);
  assert.equal(sdk.options.api_host, "/ingest");
  assert.equal(sdk.options.persistence, "localStorage");
  setConsentStatus("declined"); assert.equal(sdk.optedOut, true);
  setConsentStatus("accepted"); env.release(); await Promise.resolve();
  // The consent store opts the loaded client back in (src/lib/consent-effects.ts)
  // before readiness runs, so the provider's own re-enable finds nothing to do.
  assert.equal(sdk.optedOut, false); assert.deepEqual(sdk.optIns, [undefined]);
  stop();
  const remount = startPostHogAnalytics(async () => ({ default: sdk.client }));
  env.release(); await Promise.resolve(); remount();
  assert.equal(sdk.initializations, 1);
});

const configs = (env: ReturnType<typeof browser>) => env.fake.dataLayer.filter((entry) => entry[0] === "config").length;

// Review 5742414960: the readiness subscriber re-reads consent on every change,
// so a decline must survive that re-read whatever storage does, in this tab or another.
const declineHoldsCases: { name: string; fails: StorageFailure; decline: (env: ReturnType<typeof browser>) => void }[] = [
  { name: "setItem throws", fails: { setItem: true }, decline: () => setConsentStatus("declined") },
  { name: "getItem throws", fails: { getItem: true }, decline: () => setConsentStatus("declined") },
  { name: "setItem and getItem both throw", fails: { setItem: true, getItem: true }, decline: () => setConsentStatus("declined") },
  { name: "another tab declines", fails: {}, decline: (env) => env.otherTab("declined") },
  { name: "another tab writes an unrecognised value", fails: {}, decline: (env) => env.otherTab("denied") },
];

for (const { name, fails, decline } of declineHoldsCases) {
  test(`readiness keeps a decline when ${name}: neither SDK starts for the page life`, () => {
    const env = browser(fails); const readiness: boolean[] = []; let imports = 0;
    const stopGoogle = startGoogleAnalytics("G-TEST-HOLD", (ready) => readiness.push(ready));
    const stopPostHog = startPostHogAnalytics(() => { imports++; return new Promise(() => {}); });
    decline(env);
    assert.equal(getConsentStatus(), "declined");
    env.release();
    // A later unrelated consent broadcast makes every subscriber re-read.
    window.dispatchEvent(new Event("site-consent-change")); env.release();
    assert.equal(getConsentStatus(), "declined");
    assert.equal(imports, 0); assert.equal(configs(env), 0);
    assert.ok(readiness.length > 0 && readiness.every((ready) => ready === false), JSON.stringify(readiness));
    stopGoogle(); stopPostHog();
  });
}

test("a decline in another tab opts out an initialised PostHog client in this tab", async () => {
  const env = browser(); const sdk = posthogMock();
  const stop = startPostHogAnalytics(async () => ({ default: sdk.client }));
  env.release(); await Promise.resolve(); await Promise.resolve();
  assert.equal(sdk.initializations, 1);
  env.otherTab("declined");
  assert.equal(sdk.optedOut, true);
  env.release(); await Promise.resolve();
  assert.equal(sdk.optedOut, true);
  stop();
});

test("removal of the stored value by another tab never reopens a decline", () => {
  const env = browser(); let imports = 0;
  const stop = startPostHogAnalytics(() => { imports++; return new Promise(() => {}); });
  setConsentStatus("declined");
  env.fake.dispatchEvent(Object.assign(new Event("storage"), {
    key: CONSENT_STORAGE_KEY, newValue: null, storageArea: env.fake.localStorage,
  }));
  env.release();
  assert.equal(getConsentStatus(), "declined"); assert.equal(imports, 0);
  stop();
});
