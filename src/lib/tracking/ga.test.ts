import assert from "node:assert/strict";
import test from "node:test";
import { applyGaConsent, configureGaOnce, ensureGaConsentDefault, GA_DENIED, gaConsentFor, type GaConsentLevel } from "./ga.ts";

type Target = { gtag?: (...args: unknown[]) => void; [key: string]: unknown };

function target(withGtag = true): { win: Target; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const win: Target = {};
  if (withGtag) win.gtag = (...args) => calls.push(args);
  return { win, calls };
}

test("a decline disables the GA4 property and denies every consent type", () => {
  const { win, calls } = target();
  applyGaConsent(win, "G-TEST1", "none");
  assert.equal(win["ga-disable-G-TEST1"], true);
  // gtag.js has not loaded, so the default is queued at the front, then the update goes through gtag.
  assert.deepEqual(Array.from((win.dataLayer as ArrayLike<unknown>[])[0]), ["consent", "default", gaConsentFor("none")]);
  assert.deepEqual(calls, [["consent", "update", GA_DENIED]]);
  assert.deepEqual(GA_DENIED, { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
});

test("an explicit accept re-enables the property and grants every consent type, ads included", () => {
  const { win, calls } = target();
  applyGaConsent(win, "G-TEST1", "none");
  calls.length = 0;
  applyGaConsent(win, "G-TEST1", "all");
  assert.equal(win["ga-disable-G-TEST1"], false);
  assert.deepEqual(calls, [["consent", "update", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" }]]);
  calls.length = 0;
  applyGaConsent(win, "G-TEST1", "none");
  assert.equal(win["ga-disable-G-TEST1"], true, "a decline after the accept disables again");
  assert.deepEqual(calls, [["consent", "update", GA_DENIED]], "and denies every type, ads included");
});

test("the disable flag is set before gtag.js has loaded, and without a GA id nothing is keyed", () => {
  const noGtag: { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[]; [key: string]: unknown } = {};
  applyGaConsent(noGtag, "G-TEST1", "none");
  assert.equal(noGtag["ga-disable-G-TEST1"], true, "flag set with no gtag yet");
  for (const id of [undefined, "  "]) {
    const page: Target = {};
    applyGaConsent(page, id, "none");
    assert.deepEqual(Object.keys(page), [], `${JSON.stringify(id)}: nothing keyed`);
  }
});

test("a throwing gtag never breaks the revoke", () => {
  const win: Target = { gtag: () => { throw new Error("gtag broke"); } };
  assert.doesNotThrow(() => applyGaConsent(win, "G-TEST1", "none"));
  assert.equal(win["ga-disable-G-TEST1"], true);
});

type GtagPage = { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[]; [key: string]: unknown };

/** The commands gtag() queued, as plain arrays (gtag pushes Arguments objects). */
function commands(page: GtagPage): unknown[][] {
  return (page.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

test("gtag.js is configured once per page, and only while consent allows it at that moment", () => {
  const cases: [string, GaConsentLevel[], number][] = [
    ["allowed on ready", ["analytics"], 1],
    ["accepted on ready", ["all"], 1],
    ["ready fires again (remount): still one config", ["analytics", "all", "analytics"], 1],
    ["declined before gtag.js was ready: never configured", ["none"], 0],
    ["declined before ready, then a later accept remounts it", ["none", "all"], 1],
  ];
  for (const [label, readyCalls, configs] of cases) {
    const page: GtagPage = {};
    for (const level of readyCalls) configureGaOnce(page, "G-TEST1", () => level);
    const configCalls = commands(page).filter((c) => c[0] === "config");
    assert.equal(configCalls.length, configs, label);
    if (configs) assert.deepEqual(configCalls[0], ["config", "G-TEST1"], label);
  }
});

test("a decline before gtag.js is ready leaves the property disabled", () => {
  const page: GtagPage = {};
  configureGaOnce(page, "G-TEST1", () => "none");
  assert.equal(page["ga-disable-G-TEST1"], true);
  assert.equal(commands(page).some((c) => c[0] === "config" || c[0] === "js"), false);
});

test("gtag pushes Arguments objects, which gtag.js requires, onto an existing dataLayer", () => {
  const earlier = { event: "form_submission" };
  const page: GtagPage = { dataLayer: [earlier] };
  configureGaOnce(page, "G-TEST1", () => "analytics");
  assert.equal(page.dataLayer?.[1], earlier, "earlier entries kept, behind the consent default");
  assert.equal(Object.prototype.toString.call(page.dataLayer?.[0]), "[object Arguments]");
  assert.deepEqual(commands(page)[0].slice(0, 2), ["consent", "default"]);
  assert.equal(commands(page)[2][0], "js");
});

test("without a GA id nothing is configured", () => {
  const page: GtagPage = {};
  configureGaOnce(page, undefined, () => "analytics");
  assert.deepEqual(Object.keys(page), []);
});

const GTAG_COMMANDS = new Set(["js", "config", "event", "set", "get"]);

/** Where each gtag command sits; object entries (pushDataLayer events) are "object". */
function order(page: GtagPage): string[] {
  return (page.dataLayer ?? []).map((entry) => {
    if (Object.prototype.toString.call(entry) !== "[object Arguments]") return "object";
    const [command, kind] = Array.from(entry as ArrayLike<unknown>);
    return command === "consent" ? `consent ${String(kind)}` : String(command);
  });
}

function assertDefaultFirst(page: GtagPage, label: string): void {
  const o = order(page);
  assert.equal(o[0], "consent default", `${label}: consent default is the first entry (${o.join(", ")})`);
  assert.equal(o.filter((c) => c === "consent default").length, 1, `${label}: exactly one default`);
  for (const [i, c] of o.entries()) {
    if (GTAG_COMMANDS.has(c) || c === "consent update") assert.ok(i > 0, `${label}: ${c} after the default`);
  }
}

test("ads are granted only at level all; every payload states all four types", () => {
  const cases: [GaConsentLevel, Record<keyof typeof GA_DENIED, string>][] = [
    ["none", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }],
    ["analytics", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }],
    ["all", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" }],
  ];
  for (const [level, expected] of cases) assert.deepEqual(gaConsentFor(level), expected, level);
  assert.deepEqual(gaConsentFor("none"), GA_DENIED);
  // An unrecognised level (a JS caller, a widened type) fails closed on ads.
  for (const bogus of ["granted", "ALL", "", undefined]) {
    const payload = gaConsentFor(bogus as unknown as GaConsentLevel);
    assert.deepEqual([payload.ad_storage, payload.ad_user_data, payload.ad_personalization], ["denied", "denied", "denied"], String(bogus));
  }
});

test("consent default precedes every gtag command, in every order the page can reach", () => {
  const sequences: [string, (page: GtagPage) => void, GaConsentLevel][] = [
    ["allowed: configure", (page) => configureGaOnce(page, "G-TEST1", () => "analytics"), "analytics"],
    ["accepted: configure", (page) => configureGaOnce(page, "G-TEST1", () => "all"), "all"],
    ["not allowed: configure", (page) => configureGaOnce(page, "G-TEST1", () => "none"), "none"],
    ["events written before gtag.js loads, then configure", (page) => {
      page.dataLayer = [{ event: "section_viewed" }, { event: "third_party" }];
      configureGaOnce(page, "G-TEST1", () => "analytics");
    }, "analytics"],
    ["decline before configure", (page) => { applyGaConsent(page, "G-TEST1", "none"); configureGaOnce(page, "G-TEST1", () => "none"); }, "none"],
    ["accept update before configure", (page) => { applyGaConsent(page, "G-TEST1", "all"); configureGaOnce(page, "G-TEST1", () => "all"); }, "all"],
    ["configure, then decline, then re-accept", (page) => {
      configureGaOnce(page, "G-TEST1", () => "analytics");
      applyGaConsent(page, "G-TEST1", "none");
      applyGaConsent(page, "G-TEST1", "all");
    }, "analytics"],
    ["ensure called twice", (page) => { ensureGaConsentDefault(page, "G-TEST1", () => "analytics"); ensureGaConsentDefault(page, "G-TEST1", () => "none"); configureGaOnce(page, "G-TEST1", () => "analytics"); }, "analytics"],
  ];
  for (const [label, run, level] of sequences) {
    const page: GtagPage = {};
    run(page);
    assertDefaultFirst(page, label);
    const first = Array.from(page.dataLayer?.[0] as ArrayLike<unknown>);
    assert.deepEqual(first[2], gaConsentFor(level), `${label}: default reflects consent when first sent`);
    assert.equal(order(page).includes("config"), level !== "none", `${label}: config only when allowed`);
  }
});

test("once gtag.js has loaded, the default goes through gtag, still before config", () => {
  const seen: string[] = [];
  const page: GtagPage = { dataLayer: [] };
  // gtag.js replaces dataLayer.push with its own processor once it loads.
  page.dataLayer!.push = function (...entries: unknown[]) {
    for (const e of entries) seen.push(Array.from(e as ArrayLike<unknown>).slice(0, 2).join(" "));
    return 0;
  };
  configureGaOnce(page, "G-TEST1", () => "analytics");
  assert.equal(seen[0], "consent default");
  assert.ok(seen[1].startsWith("js "), seen[1]);
  assert.equal(seen[2], "config G-TEST1");
});

test("a gtag the site runs itself, without our GA id, gets the update only", () => {
  const { win, calls } = target();
  applyGaConsent(win, undefined, "none");
  assert.deepEqual(calls, [["consent", "update", GA_DENIED]]);
  assert.deepEqual(Object.keys(win), ["gtag"]);
});

test("entries another script queued before gtag.js loads never precede the default", () => {
  const stubCommand = (...args: unknown[]) => args;
  const foreign: [string, (page: GtagPage) => void][] = [
    ["a widget's object push", (page) => { page.dataLayer = [{ event: "widget_ready" }]; }],
    ["a site snippet's own gtag stub with config", (page) => {
      const layer: unknown[] = (page.dataLayer = []);
      page.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        layer.push(arguments);
      };
      page.gtag("js", new Date());
      page.gtag("config", "G-OTHER");
    }],
    ["an array-shaped command", (page) => { page.dataLayer = [stubCommand("event", "early")]; }],
    ["nothing queued yet", () => undefined],
  ];
  for (const [label, queue] of foreign) {
    for (const level of ["none", "analytics", "all"] as const) {
      const page: GtagPage = {};
      queue(page);
      const queued = page.dataLayer?.length ?? 0;
      // What GoogleAnalytics does while rendering, before its <Script> can preload gtag.js.
      ensureGaConsentDefault(page, "G-TEST1", () => level);
      const name = `${label}, level=${level}`;
      assert.equal(page.dataLayer?.length, queued + 1, `${name}: foreign entries kept`);
      assert.deepEqual(Array.from(page.dataLayer?.[0] as ArrayLike<unknown>), ["consent", "default", gaConsentFor(level)], `${name}: default is entry 0 when gtag.js reads the queue`);
      configureGaOnce(page, "G-TEST1", () => level);
      assertDefaultFirst(page, name);
    }
  }
});
