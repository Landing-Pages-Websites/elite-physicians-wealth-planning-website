import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { RECORDING_BLOCK_SELECTORS, UNCAPTURED_SELECTORS } from "./field-privacy.ts";
import { buildPostHogOptions, expiredPostHogCookies, expireStaleCookies, probePersistence, REVIEWED_DEFAULTS } from "./posthog-options.ts";

const TYPES_FILE = new URL("../../../node_modules/@posthog/types/dist/posthog-config.d.ts", import.meta.url);
const MODULE_FILE = new URL("../../../node_modules/posthog-js/dist/module.d.ts", import.meta.url);

/**
 * Every top-level key of the config, read from both type files because they
 * drift: @posthog/types has the shared PostHogConfig, posthog-js's own
 * module.d.ts extends it with a few keys of its own.
 */
function topLevelKeys(typesText: string, moduleText: string): string[] {
  const start = typesText.indexOf("export interface PostHogConfig {");
  assert.ok(start >= 0, "PostHogConfig interface not found in @posthog/types; the layout changed");
  const block = typesText.slice(start, typesText.indexOf("\n}\n", start));
  const extStart = moduleText.indexOf("type PostHogConfig = Omit<PostHogConfig$1,");
  assert.ok(extStart >= 0, "PostHogConfig extension not found in posthog-js module.d.ts; the layout changed");
  const extBlock = moduleText.slice(extStart, moduleText.indexOf("\n};\n", extStart));
  const keyPattern = /^ {4}([A-Za-z_]\w*)\??:/gm;
  const keys = [...block.matchAll(keyPattern), ...extBlock.matchAll(keyPattern)].map((m) => m[1]);
  return [...new Set(keys)];
}

/** Keys that are neither set in the options nor in the reviewed defaults list. */
function undecidedKeys(keys: string[], options: Record<string, unknown>): string[] {
  const reviewed = new Set(Object.values(REVIEWED_DEFAULTS).flatMap((group) => Object.keys(group)));
  return keys.filter((k) => options[k] === undefined && !reviewed.has(k));
}

const installedKeys = (): string[] => topLevelKeys(readFileSync(TYPES_FILE, "utf8"), readFileSync(MODULE_FILE, "utf8"));

test("every installed top-level config key is set or reviewed, so an upgrade that adds one fails here", () => {
  const options = buildPostHogOptions() as Record<string, unknown>;
  const keys = installedKeys();
  assert.ok(keys.length > 120, `parsed only ${keys.length} keys; the parser is broken`);
  for (const key of ["persistence", "logs", "session_recording", "error_tracking", "opt_in_site_apps", "disableDeviceModel"]) {
    assert.ok(keys.includes(key), `${key} missing from the installed types`);
  }
  const undecided = undecidedKeys(keys, options);
  assert.deepEqual(undecided, [], `decide these posthog-js options in posthog-options.ts: ${undecided.join(", ")}`);
});

test("mutation: a new key in either types file fails the decision test", () => {
  const options = buildPostHogOptions() as Record<string, unknown>;
  const types = readFileSync(TYPES_FILE, "utf8");
  const mod = readFileSync(MODULE_FILE, "utf8");
  const typesMutant = types.replace("export interface PostHogConfig {", "export interface PostHogConfig {\n    brand_new_feature_switch?: boolean;");
  const moduleMutant = mod.replace("type PostHogConfig = Omit<PostHogConfig$1, 'loaded'> & {", "type PostHogConfig = Omit<PostHogConfig$1, 'loaded'> & {\n    another_new_switch?: boolean;");
  assert.notEqual(typesMutant, types, "mutation did not apply to @posthog/types");
  assert.notEqual(moduleMutant, mod, "mutation did not apply to module.d.ts");
  assert.deepEqual(undecidedKeys(topLevelKeys(typesMutant, mod), options), ["brand_new_feature_switch"]);
  assert.deepEqual(undecidedKeys(topLevelKeys(types, moduleMutant), options), ["another_new_switch"]);
});

test("the reviewed defaults are real keys, each with a reason, and none is also set", () => {
  const options = buildPostHogOptions() as Record<string, unknown>;
  const installed = new Set(installedKeys());
  for (const [group, entries] of Object.entries(REVIEWED_DEFAULTS)) {
    for (const [key, reason] of Object.entries(entries)) {
      assert.ok(installed.has(key), `${group}: ${key} is not an installed option any more; remove it`);
      assert.ok(reason.trim().length > 10, `${group}: ${key} needs a reason`);
      assert.equal(options[key], undefined, `${key} is both set and listed as default`);
    }
  }
});

test("persistence fails closed: localStorage only when it works, memory otherwise", () => {
  const kept = new Map<string, string>();
  const real = { setItem: (k: string, v: string) => void kept.set(k, v), getItem: (k: string) => kept.get(k) ?? null, removeItem: (k: string) => void kept.delete(k) };
  assert.equal(probePersistence(() => real), "localStorage");
  // Accepts writes but keeps nothing: posthog would fall back to its cookie store.
  assert.equal(probePersistence(() => ({ setItem() {}, getItem: () => null, removeItem() {} })), "memory");
  assert.equal(probePersistence(() => ({ setItem() { throw new Error("quota"); }, getItem: () => null, removeItem() {} })), "memory");
  assert.equal(probePersistence(() => { throw new Error("denied"); }), "memory");
  assert.equal(probePersistence(() => null as unknown as Storage), "memory");
  assert.equal(buildPostHogOptions("memory").persistence, "memory");
  assert.equal(buildPostHogOptions().persistence, "localStorage");
});

test("stale ph_ cookies from the cookie-based setup are expired on the host and every parent domain", () => {
  const cookies = expiredPostHogCookies("phc_abc", "www.shop.acme.com");
  const name = "ph_phc_abc_posthog";
  for (const c of cookies) {
    assert.ok(c.startsWith(`${name}=;`), c);
    assert.ok(c.includes("expires=Thu, 01 Jan 1970 00:00:00 GMT"), c);
    assert.ok(c.includes("path=/"), c);
  }
  const domains = cookies.map((c) => /domain=([^;]+)/.exec(c)?.[1] ?? "(host)");
  assert.deepEqual(domains, ["(host)", "www.shop.acme.com", ".www.shop.acme.com", "shop.acme.com", ".shop.acme.com", "acme.com", ".acme.com"]);
  assert.deepEqual(expiredPostHogCookies("phc_abc", "localhost").map((c) => /domain=/.test(c)), [false]);
  assert.deepEqual(expiredPostHogCookies("phc_abc", "127.0.0.1").map((c) => /domain=/.test(c)), [false]);
});

test("features we do not use are pinned off and the ones we use are pinned on", () => {
  const o = buildPostHogOptions();
  assert.equal(o.advanced_disable_feature_flags, true);
  assert.equal(o.advanced_disable_feature_flags_on_first_load, true);
  assert.equal(o.advanced_disable_flags, false); // remote config must keep loading
  assert.equal(o.remote_config_refresh_interval_ms, 0);
  assert.equal(o.persistence, "localStorage");
  for (const key of ["disable_surveys", "disable_surveys_automatic_display", "disable_product_tours", "disable_conversations", "disable_web_experiments"] as const) {
    assert.equal(o[key], true, key);
  }
  assert.equal(o.enable_recording_console_log, false);
  assert.equal(o.opt_in_site_apps, false);
  assert.equal(o.disableDeviceModel, true);
  assert.deepEqual(o.error_tracking, { captureExtensionExceptions: false });
  assert.equal(o.opt_out_capturing_persistence_type, "localStorage");
  assert.equal(o.capture_heatmaps, true);
  assert.ok(o.capture_dead_clicks);
  assert.equal(o.capture_exceptions, true);
  assert.equal(o.disable_session_recording, false);
  assert.equal(o.disable_external_dependency_loading, false); // the recorder and exception bundles load from /ingest/static
  assert.equal(o.disable_capture_url_hashes, true);
  assert.equal(o.mask_personal_data_properties, true);
  assert.equal(o.api_host, "/ingest");
});

test("recording masks inputs, blocks choice controls, their labels and private elements, and records no headers, bodies or canvas", () => {
  const r = buildPostHogOptions().session_recording;
  assert.ok(r);
  assert.equal(r.maskAllInputs, true);
  assert.equal(r.blockSelector, RECORDING_BLOCK_SELECTORS.join(", "));
  const blocked = r.blockSelector?.split(", ") ?? [];
  for (const s of ["[data-mega-private]", "[data-mega-answer-text]", "[role~=checkbox i]", "[role~=switch i]", "[aria-checked]", "select", "option"]) assert.ok(blocked.includes(s), s);
  // Form friction stays watchable: forms, text fields, textareas, labels and buttons are not blocked.
  for (const s of ["form", "fieldset", "label", "input", "textarea", "button"]) assert.ok(!blocked.includes(s), s);
  assert.equal(r.recordHeaders, false);
  assert.equal(r.recordBody, false);
  assert.equal(r.streamNetworkBody, false);
  assert.equal(r.recordCrossOriginIframes, false);
  assert.deepEqual(r.captureCanvas, { recordCanvas: false });
  assert.equal(typeof r.maskCapturedNetworkRequestFn, "function");
});

test("performance capture is web vitals only, and PostHog logs are dropped client-side", () => {
  const o = buildPostHogOptions();
  assert.deepEqual(o.capture_performance, { web_vitals: true, network_timing: false, web_vitals_attribution: false });
  const beforeSend = o.logs?.beforeSend;
  assert.equal(typeof beforeSend, "function");
  assert.equal((beforeSend as (r: unknown) => unknown)({ body: "x" }), null);
  assert.equal(o.logs?.captureConsoleLogs, false);
});

test("autocapture and dead clicks ignore every uncaptured region and keep posthog's own opt-outs", () => {
  const o = buildPostHogOptions();
  const auto = o.autocapture as { css_selector_ignorelist: string[] };
  const dead = o.capture_dead_clicks as { css_selector_ignorelist: string[] };
  assert.deepEqual(auto.css_selector_ignorelist, [".ph-no-autocapture", "[data-ph-no-autocapture]", ...UNCAPTURED_SELECTORS]);
  assert.deepEqual(dead.css_selector_ignorelist, [".ph-no-deadclick", ".ph-no-capture", ...UNCAPTURED_SELECTORS]);
  assert.notEqual(buildPostHogOptions().capture_dead_clicks, o.capture_dead_clicks, "posthog-js mutates this object, so each build gets its own");
});

const ELEMENT_EVENTS = ["$autocapture", "$rageclick", "$dead_click", "$copy_autocapture", "some_future_event"];

test("before_send drops any element-describing event inside a form or answer control, by shape not by name", () => {
  const before = buildPostHogOptions("memory", () => true).before_send as (c: unknown) => unknown;
  for (const event of ELEMENT_EVENTS) {
    const inForm = { uuid: "u", event, properties: { $elements_chain: 'label:text="I cannot work";form:nth-child="1"' } };
    const checkbox = { uuid: "u", event, properties: { $elements: [{ tag_name: "input", attr__name: "hasDenial" }] } };
    const link = { uuid: "u", event, properties: { $elements_chain: 'a:attr__href="/about"' } };
    assert.equal(before(inForm), null, `${event}: form`);
    assert.equal(before(checkbox), null, `${event}: checkbox`);
    assert.notEqual(before(link), null, `${event}: link kept`);
  }
});

test("every event goes through the scrubber", () => {
  // Consent is passed explicitly so the scrubber is tested in every consentMode.
  const before = buildPostHogOptions("localStorage", () => true).before_send;
  assert.equal(typeof before, "function");
  const out = (before as (c: unknown) => { properties: Record<string, string> })({ uuid: "u", event: "e", properties: { $current_url: "https://x.com/?email=a@b.co&utm_source=x" } });
  assert.equal(out.properties.$current_url, "https://x.com/?utm_source=x");
});

// Every event family posthog-js sends through capture(), recordings included.
const EVENT_TYPES = ["$autocapture", "$pageview", "$pageleave", "$rageclick", "$$heatmap", "$dead_click", "$web_vitals", "$exception", "$snapshot", "cta_click"];

test("before_send drops every event type unless consent allows it at that moment", () => {
  let allowed = true;
  const before = buildPostHogOptions("memory", () => allowed).before_send as (c: unknown) => unknown;
  for (const event of EVENT_TYPES) {
    const capture = { uuid: "u", event, properties: { $current_url: "https://x.com/" } };
    allowed = true;
    assert.notEqual(before(capture), null, `${event}: sent while allowed`);
    allowed = false;
    assert.equal(before(capture), null, `${event}: dropped once not allowed`);
  }
});

test("expiring stale cookies never throws, even where document.cookie is unwritable", () => {
  const written: string[] = [];
  assert.equal(expireStaleCookies((c) => written.push(c), "phc_abc", "www.acme.com"), written.length);
  assert.ok(written.length > 1);
  let calls = 0;
  const throwing = () => { calls++; throw new DOMException("opaque origin", "SecurityError"); };
  assert.doesNotThrow(() => expireStaleCookies(throwing, "phc_abc", "www.acme.com"));
  assert.equal(expireStaleCookies(throwing, "phc_abc", "localhost"), 0);
  assert.ok(calls > 0);
});
