import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { PostHog } from "posthog-js";
import { startGoogleAnalytics } from "../src/components/analytics/GoogleAnalytics";
import { startPostHogAnalytics } from "../src/components/analytics/PostHogProvider";
import { setConsentStatus } from "../src/lib/consent";

function browser() {
  let stored: string | null = null;
  let sequence = 0;
  const timers = new Map<number, () => void>();
  const target = new EventTarget();
  const fake = Object.assign(target, {
    localStorage: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } },
    setTimeout: (callback: () => void) => { timers.set(++sequence, callback); return sequence; },
    clearTimeout: (id: number) => { timers.delete(id); },
    dataLayer: [] as Record<string, unknown>[],
    gtag: undefined as Window["gtag"],
  });
  Object.assign(globalThis, { window: fake, document: { fonts: { ready: new Promise(() => {}) } } });
  return { fake, timers, release() { for (const callback of [...timers.values()]) callback(); } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function posthogMock() {
  let initializations = 0;
  let optedOut = false;
  let options: unknown;
  const optIns: unknown[] = [];
  const client = {
    init: (_key: string, config: unknown) => { initializations++; options = config; },
    has_opted_out_capturing: () => optedOut,
    opt_out_capturing: () => { optedOut = true; },
    opt_in_capturing: (config: unknown) => { optedOut = false; optIns.push(config); },
  } as unknown as PostHog;
  return { client, optIns, get initializations() { return initializations; },
    get optedOut() { return optedOut; }, get options() { return options; } };
}

afterEach(() => { Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "document"); });

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
    ["consent", "update", { analytics_storage: "denied" }]);
  setConsentStatus("accepted"); env.release(); stop();
  const remount = startGoogleAnalytics("G-TEST-ONCE", () => {}); env.release(); remount();
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
  const stopPostHog = startPostHogAnalytics("test-key", () => { imports++; return new Promise(() => {}); });
  assert.equal(env.timers.size, 0); env.release(); assert.equal(imports, 0);
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "config").length, 0);
  stopGoogle(); stopPostHog();
});

test("readiness rechecks persisted decline even without a consent broadcast", () => {
  const env = browser(); const readiness: boolean[] = []; let imports = 0;
  const stopGoogle = startGoogleAnalytics("G-TEST-PERSISTED", (ready) => readiness.push(ready));
  const stopPostHog = startPostHogAnalytics("test-key", () => { imports++; return new Promise(() => {}); });
  env.fake.localStorage.setItem("site-consent", "declined"); env.release();
  assert.deepEqual(readiness, [false]); assert.equal(imports, 0);
  assert.equal(env.fake.dataLayer.filter((entry) => entry[0] === "config").length, 0);
  stopGoogle(); stopPostHog();
});

test("PostHog unmount invalidates an in-flight import", async () => {
  const env = browser(); const sdk = posthogMock();
  const pending = deferred<{ default: PostHog }>();
  const stop = startPostHogAnalytics("test-key", () => pending.promise);
  env.release(); stop(); pending.resolve({ default: sdk.client }); await pending.promise;
  assert.equal(sdk.initializations, 0);
});

test("PostHog cancels before/during import, permits reaccept, initializes once and retains options", async () => {
  const env = browser(); const sdk = posthogMock();
  const first = deferred<{ default: PostHog }>(); let imports = 0;
  const stop = startPostHogAnalytics("test-key", () => { imports++; return first.promise; });
  assert.equal(imports, 0);
  setConsentStatus("declined"); env.release(); assert.equal(imports, 0);
  setConsentStatus("accepted"); env.release(); assert.equal(imports, 1);
  setConsentStatus("declined"); first.resolve({ default: sdk.client }); await first.promise;
  assert.equal(sdk.initializations, 0);
  setConsentStatus("accepted"); env.release(); await Promise.resolve();
  assert.equal(sdk.initializations, 1);
  assert.deepEqual(sdk.options, { api_host: "https://us.i.posthog.com", capture_pageview: true,
    capture_pageleave: true, person_profiles: "identified_only", disable_session_recording: true });
  setConsentStatus("declined"); assert.equal(sdk.optedOut, true);
  setConsentStatus("accepted"); env.release(); await Promise.resolve();
  assert.equal(sdk.optedOut, false); assert.deepEqual(sdk.optIns, [{ captureEventName: false }]);
  stop();
  const remount = startPostHogAnalytics("test-key", async () => ({ default: sdk.client }));
  env.release(); await Promise.resolve(); remount();
  assert.equal(sdk.initializations, 1);
});
