import assert from "node:assert/strict";
import test from "node:test";
import { applyGaConsent, configureGaOnce, ensureGaConsentDefault, GA_DENIED, gaConsentDefault } from "./ga.ts";

type Target = { gtag?: (...args: unknown[]) => void; [key: string]: unknown };

function target(withGtag = true): { win: Target; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const win: Target = {};
  if (withGtag) win.gtag = (...args) => calls.push(args);
  return { win, calls };
}

test("a decline disables the GA4 property and denies every consent type", () => {
  const { win, calls } = target();
  applyGaConsent(win, "G-TEST1", false);
  assert.equal(win["ga-disable-G-TEST1"], true);
  // gtag.js has not loaded, so the default is queued at the front, then the update goes through gtag.
  assert.deepEqual(Array.from((win.dataLayer as ArrayLike<unknown>[])[0]), ["consent", "default", gaConsentDefault(false)]);
  assert.deepEqual(calls, [["consent", "update", GA_DENIED]]);
  assert.deepEqual(GA_DENIED, { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
});

test("an accept re-enables the property and grants analytics storage only", () => {
  const { win, calls } = target();
  applyGaConsent(win, "G-TEST1", false);
  calls.length = 0;
  applyGaConsent(win, "G-TEST1", true);
  assert.equal(win["ga-disable-G-TEST1"], false);
  assert.deepEqual(calls, [["consent", "update", { analytics_storage: "granted" }]]);
});

test("the disable flag is set before gtag.js has loaded, and without a GA id nothing is keyed", () => {
  const noGtag: { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[]; [key: string]: unknown } = {};
  applyGaConsent(noGtag, "G-TEST1", false);
  assert.equal(noGtag["ga-disable-G-TEST1"], true, "flag set with no gtag yet");
  for (const id of [undefined, "  "]) {
    const page: Target = {};
    applyGaConsent(page, id, false);
    assert.deepEqual(Object.keys(page), [], `${JSON.stringify(id)}: nothing keyed`);
  }
});

test("a throwing gtag never breaks the revoke", () => {
  const win: Target = { gtag: () => { throw new Error("gtag broke"); } };
  assert.doesNotThrow(() => applyGaConsent(win, "G-TEST1", false));
  assert.equal(win["ga-disable-G-TEST1"], true);
});

type GtagPage = { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[]; [key: string]: unknown };

/** The commands gtag() queued, as plain arrays (gtag pushes Arguments objects). */
function commands(page: GtagPage): unknown[][] {
  return (page.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

test("gtag.js is configured once per page, and only while consent allows it at that moment", () => {
  const cases: [string, boolean[], number][] = [
    ["allowed on ready", [true], 1],
    ["ready fires again (remount): still one config", [true, true, true], 1],
    ["declined before gtag.js was ready: never configured", [false], 0],
    ["declined before ready, then a later accept remounts it", [false, true], 1],
  ];
  for (const [label, readyCalls, configs] of cases) {
    const page: GtagPage = {};
    for (const allowed of readyCalls) configureGaOnce(page, "G-TEST1", () => allowed);
    const configCalls = commands(page).filter((c) => c[0] === "config");
    assert.equal(configCalls.length, configs, label);
    if (configs) assert.deepEqual(configCalls[0], ["config", "G-TEST1"], label);
  }
});

test("a decline before gtag.js is ready leaves the property disabled", () => {
  const page: GtagPage = {};
  configureGaOnce(page, "G-TEST1", () => false);
  assert.equal(page["ga-disable-G-TEST1"], true);
  assert.equal(commands(page).some((c) => c[0] === "config" || c[0] === "js"), false);
});

test("gtag pushes Arguments objects, which gtag.js requires, onto an existing dataLayer", () => {
  const earlier = { event: "form_submission" };
  const page: GtagPage = { dataLayer: [earlier] };
  configureGaOnce(page, "G-TEST1", () => true);
  assert.equal(page.dataLayer?.[1], earlier, "earlier entries kept, behind the consent default");
  assert.equal(Object.prototype.toString.call(page.dataLayer?.[0]), "[object Arguments]");
  assert.deepEqual(commands(page)[0].slice(0, 2), ["consent", "default"]);
  assert.equal(commands(page)[2][0], "js");
});

test("without a GA id nothing is configured", () => {
  const page: GtagPage = {};
  configureGaOnce(page, undefined, () => true);
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

test("ads are denied by default in every state; analytics follows consent", () => {
  assert.deepEqual(gaConsentDefault(true), { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  assert.deepEqual(gaConsentDefault(false), GA_DENIED);
});

test("consent default precedes every gtag command, in every order the page can reach", () => {
  const sequences: [string, (page: GtagPage) => void, boolean][] = [
    ["allowed: configure", (page) => configureGaOnce(page, "G-TEST1", () => true), true],
    ["not allowed: configure", (page) => configureGaOnce(page, "G-TEST1", () => false), false],
    ["events written before gtag.js loads, then configure", (page) => {
      page.dataLayer = [{ event: "section_viewed" }, { event: "third_party" }];
      configureGaOnce(page, "G-TEST1", () => true);
    }, true],
    ["decline before configure", (page) => { applyGaConsent(page, "G-TEST1", false); configureGaOnce(page, "G-TEST1", () => false); }, false],
    ["accept update before configure", (page) => { applyGaConsent(page, "G-TEST1", true); configureGaOnce(page, "G-TEST1", () => true); }, true],
    ["configure, then decline, then re-accept", (page) => {
      configureGaOnce(page, "G-TEST1", () => true);
      applyGaConsent(page, "G-TEST1", false);
      applyGaConsent(page, "G-TEST1", true);
    }, true],
    ["ensure called twice", (page) => { ensureGaConsentDefault(page, "G-TEST1", () => true); ensureGaConsentDefault(page, "G-TEST1", () => false); configureGaOnce(page, "G-TEST1", () => true); }, true],
  ];
  for (const [label, run, allowed] of sequences) {
    const page: GtagPage = {};
    run(page);
    assertDefaultFirst(page, label);
    const first = Array.from(page.dataLayer?.[0] as ArrayLike<unknown>);
    assert.deepEqual(first[2], gaConsentDefault(allowed), `${label}: default reflects consent when first sent`);
    assert.equal(order(page).includes("config"), allowed, `${label}: config only when allowed`);
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
  configureGaOnce(page, "G-TEST1", () => true);
  assert.equal(seen[0], "consent default");
  assert.ok(seen[1].startsWith("js "), seen[1]);
  assert.equal(seen[2], "config G-TEST1");
});

test("a gtag the site runs itself, without our GA id, gets the update only", () => {
  const { win, calls } = target();
  applyGaConsent(win, undefined, false);
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
    for (const allowed of [true, false]) {
      const page: GtagPage = {};
      queue(page);
      const queued = page.dataLayer?.length ?? 0;
      // What GoogleAnalytics does while rendering, before its <Script> can preload gtag.js.
      ensureGaConsentDefault(page, "G-TEST1", () => allowed);
      const name = `${label}, allowed=${allowed}`;
      assert.equal(page.dataLayer?.length, queued + 1, `${name}: foreign entries kept`);
      assert.deepEqual(Array.from(page.dataLayer?.[0] as ArrayLike<unknown>), ["consent", "default", gaConsentDefault(allowed)], `${name}: default is entry 0 when gtag.js reads the queue`);
      configureGaOnce(page, "G-TEST1", () => allowed);
      assertDefaultFirst(page, name);
    }
  }
});
