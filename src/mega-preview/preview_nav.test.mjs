import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { MEGA_EDITOR_ORIGINS, MEGA_PREVIEW_HIDE_CSS, MEGA_PREVIEW_NAV_SCRIPT, megaPreviewNavScript } from "./preview_nav.mjs";

const navigated = (k) => k.posts.filter((p) => p.data.type === "preview.navigated");
const styleText = (k) => k.appended.map((a) => a.node.children.map((c) => c.text).join("")).join("");

/** A minimal browser: location + history that mutate the URL, a recording parent. */
function run({ framed = true, throwFor = null, startUrl = "/", readyState = "loading", head = true, throwOnStyle = false } = {}) {
  const posts = [];
  const appended = [];
  const listeners = {};
  const location = { pathname: "", search: "", hash: "" };
  const setUrl = (url) => {
    const u = new URL(url, "https://site.test");
    location.pathname = u.pathname;
    location.search = u.search;
    location.hash = u.hash;
  };
  setUrl(startUrl);
  const history = {
    pushState: (_s, _t, url) => url !== undefined && setUrl(url),
    replaceState: (_s, _t, url) => url !== undefined && setUrl(url),
  };
  const parent = {
    postMessage(data, origin) {
      if (origin === throwFor) throw new Error("blocked");
      posts.push({ data: JSON.parse(JSON.stringify(data)), origin });
    },
  };
  const window = { location, history, addEventListener: (n, f) => (listeners[n] = f) };
  const docListeners = {};
  const frames = [];
  const makeNode = (tag) => ({ tag, attributes: {}, children: [], setAttribute(n, v) { this.attributes[n] = v; }, appendChild(c) { this.children.push(c); return c; } });
  const headNode = { appendChild: (node) => (appended.push({ parent: "head", node }), node) };
  const documentElement = { appendChild: (node) => (appended.push({ parent: "html", node }), node) };
  const document = {
    readyState,
    addEventListener: (n, f) => (docListeners[n] = f),
    head: head ? headNode : null,
    documentElement,
    createElement: (tag) => { if (throwOnStyle) throw new Error("blocked"); return makeNode(tag); },
    createTextNode: (text) => ({ text }),
  };
  const requestAnimationFrame = (f) => frames.push(f);
  window.window = window;
  window.parent = framed ? parent : window;
  const originalPush = history.pushState;
  vm.runInNewContext(MEGA_PREVIEW_NAV_SCRIPT, { window, location, history, document, requestAnimationFrame, parent: window.parent });
  /** Runs the queued animation frames one generation at a time. */
  const runFrame = () => frames.splice(0).forEach((f) => f());
  const domContentLoaded = () => docListeners.DOMContentLoaded && docListeners.DOMContentLoaded();
  return { posts, appended, history, listeners, setUrl, originalPush, docListeners, frames, runFrame, domContentLoaded };
}

test("K1 not framed: nothing posted, history not wrapped", () => {
  const k = run({ framed: false });
  assert.equal(k.history.pushState, k.originalPush);
  k.history.pushState({}, "", "/b");
  assert.deepEqual(k.posts, []);
  assert.equal(k.listeners.popstate, undefined);
  assert.deepEqual(k.docListeners, {});
  assert.deepEqual(k.frames, []);
  assert.equal(k.appended.length, 1);
});

test("K2 initial load posts hello only, never navigated", () => {
  const k = run({ startUrl: "/a?q=1" });
  assert.ok(k.posts.every((p) => p.data.type === "preview.hello"));
  assert.equal(k.posts.length, 2);
});

test("K3 pushState posts once per origin", () => {
  const k = run();
  k.history.pushState({}, "", "/b");
  assert.equal(navigated(k).length, 2);
  for (const p of navigated(k)) assert.deepEqual(p.data, { type: "preview.navigated", path: "/b" });
});

test("K4 replaceState to the same URL posts nothing", () => {
  const k = run({ startUrl: "/a" });
  k.history.replaceState({}, "", "/a");
  k.history.replaceState(null, "");
  assert.deepEqual(navigated(k), []);
});

test("K5 hash-only change posts nothing", () => {
  const k = run({ startUrl: "/a" });
  k.history.pushState({}, "", "/a#x");
  assert.deepEqual(navigated(k), []);
});

test("K6 query change posts with the query, never the hash", () => {
  const k = run({ startUrl: "/a" });
  k.history.pushState({}, "", "/a?q=1#frag");
  assert.equal(navigated(k).length, 2);
  assert.ok(navigated(k).every((p) => p.data.path === "/a?q=1"));
});

test("K7 popstate back posts the earlier path", () => {
  const k = run();
  k.history.pushState({}, "", "/b");
  k.posts.length = 0;
  k.setUrl("/");
  k.listeners.popstate();
  assert.equal(navigated(k).length, 2);
  assert.ok(navigated(k).every((p) => p.data.path === "/"));
});

test("K8 one origin throwing does not stop the other", () => {
  const k = run({ throwFor: MEGA_EDITOR_ORIGINS[0] });
  k.history.pushState({}, "", "/b");
  assert.deepEqual(navigated(k).map((p) => p.origin), [MEGA_EDITOR_ORIGINS[1]]);
});

test("K9 target origins are exactly the two constants, never *", () => {
  assert.deepEqual([...MEGA_EDITOR_ORIGINS], ["https://app.gomega.ai", "https://admin.gomega.ai"]);
  assert.ok(Object.isFrozen(MEGA_EDITOR_ORIGINS));
  const k = run();
  k.history.pushState({}, "", "/b");
  k.history.replaceState({}, "", "/c?x=1");
  k.setUrl("/");
  k.listeners.popstate();
  assert.equal(navigated(k).length, 6);
  for (const p of navigated(k)) {
    assert.notEqual(p.origin, "*");
    assert.ok(MEGA_EDITOR_ORIGINS.includes(p.origin));
    assert.deepEqual(Object.keys(p.data).sort(), ["path", "type"]);
  }
});

test("K10 not exactly '1' yields null", () => {
  for (const v of [undefined, "0", "true", " 1", "1 ", "", "11"]) {
    assert.equal(megaPreviewNavScript({ MEGA_PREVIEW_MODE: v }), null, String(v));
  }
});

test("K11 exactly '1' yields the script", () => {
  assert.equal(megaPreviewNavScript({ MEGA_PREVIEW_MODE: "1" }), MEGA_PREVIEW_NAV_SCRIPT);
});

test("K12 script is inline, eval-free, network-free, ES5-safe", () => {
  const s = MEGA_PREVIEW_NAV_SCRIPT;
  for (const banned of [/\beval\s*\(/, /\bFunction\s*\(/, /\bfetch\b/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /importScripts/, /\bimport\b/, /document\.write/, /<\/script/i, /=>/, /\b(let|const)\b/, /`/, /["']\*["']/]) {
    assert.doesNotMatch(s, banned, String(banned));
  }
  assert.doesNotThrow(() => new vm.Script(s));
});

test("K13 layout renders the script only through the preview-mode gate, in head", () => {
  const layout = readFileSync(fileURLToPath(new URL("../app/layout.tsx", import.meta.url)), "utf8");
  assert.match(layout, /import \{ megaPreviewNavScript \} from "@\/mega-preview\/preview_nav\.mjs"/);
  assert.match(layout, /const navScript = megaPreviewNavScript\(\);/);
  const head = layout.slice(layout.indexOf("<head>"), layout.indexOf("</head>"));
  assert.match(head, /navScript \? <script dangerouslySetInnerHTML=\{\{ __html: navScript \}\} \/> : null/);
  assert.doesNotMatch(layout, /MEGA_PREVIEW_NAV_SCRIPT/);
  assert.equal(megaPreviewNavScript({}), null);
  assert.equal(megaPreviewNavScript({ MEGA_PREVIEW_MODE: "0" }), null);
});

const MESSAGE_TYPES = ["preview.hello", "preview.painted"];
const ofType = (k, type) => k.posts.filter((p) => p.data.type === type);

test("K14 hello is posted once per origin on run, before DOMContentLoaded", () => {
  const k = run();
  const hellos = ofType(k, "preview.hello");
  assert.deepEqual(hellos.map((p) => p.origin), [...MEGA_EDITOR_ORIGINS]);
  assert.equal(k.posts.length, 2);
  assert.equal(typeof k.docListeners.DOMContentLoaded, "function");
});

test("K15 painted waits for DOMContentLoaded plus two animation frames, once", () => {
  const k = run();
  k.runFrame();
  assert.deepEqual(ofType(k, "preview.painted"), [], "no frames queued before DOMContentLoaded");
  k.domContentLoaded();
  k.runFrame();
  assert.deepEqual(ofType(k, "preview.painted"), [], "one frame is not enough");
  k.runFrame();
  assert.deepEqual(ofType(k, "preview.painted").map((p) => p.origin), [...MEGA_EDITOR_ORIGINS]);
  k.runFrame();
  assert.equal(ofType(k, "preview.hello").length, 2);
  assert.equal(ofType(k, "preview.painted").length, 2);
});

test("K16 already past DOMContentLoaded: frames queue at once, painted after two", () => {
  for (const readyState of ["interactive", "complete"]) {
    const k = run({ readyState });
    assert.deepEqual(k.docListeners, {}, readyState);
    k.runFrame();
    assert.deepEqual(ofType(k, "preview.painted"), [], readyState);
    k.runFrame();
    assert.equal(ofType(k, "preview.painted").length, 2, readyState);
  }
});

test("K17 hello and painted are exactly { type }, never to *, only to editor origins", () => {
  const k = run();
  k.domContentLoaded();
  k.runFrame();
  k.runFrame();
  assert.equal(k.posts.length, 4);
  for (const p of k.posts) {
    assert.deepEqual(p.data, { type: p.data.type });
    assert.ok(MESSAGE_TYPES.includes(p.data.type));
    assert.ok(MEGA_EDITOR_ORIGINS.includes(p.origin));
    assert.notEqual(p.origin, "*");
  }
});

test("K18 not framed: no hello, no painted, no listeners, no frames", () => {
  const k = run({ framed: false, readyState: "complete" });
  k.domContentLoaded();
  k.runFrame();
  assert.deepEqual(k.posts, []);
  assert.deepEqual(k.frames, []);
});

test("K19 a throwing origin does not stop hello or painted reaching the other", () => {
  const k = run({ throwFor: MEGA_EDITOR_ORIGINS[0] });
  k.domContentLoaded();
  k.runFrame();
  k.runFrame();
  assert.deepEqual(k.posts.map((p) => [p.data.type, p.origin]), [
    ["preview.hello", MEGA_EDITOR_ORIGINS[1]],
    ["preview.painted", MEGA_EDITOR_ORIGINS[1]],
  ]);
});

test("K20 navigated still carries only type and path alongside the paint signals", () => {
  const k = run();
  k.domContentLoaded();
  k.runFrame();
  k.runFrame();
  k.history.pushState({}, "", "/b");
  assert.equal(k.posts.length, 6);
  for (const p of navigated(k)) assert.deepEqual(p.data, { type: "preview.navigated", path: "/b" });
});

test("K14 the hide rule is added once to head, framed or not (Browserbase loads previews top-level)", () => {
  for (const framed of [true, false]) {
    const k = run({ framed });
    assert.equal(k.appended.length, 1, String(framed));
    assert.equal(k.appended[0].parent, "head");
    assert.equal(k.appended[0].node.tag, "style");
    assert.equal(k.appended[0].node.attributes["data-mega-preview-style"], "");
    assert.equal(styleText(k), MEGA_PREVIEW_HIDE_CSS);
  }
});

test("K15 the selector is the declared marker plus the shared accessible name, case-insensitive, nothing broader", () => {
  assert.equal(MEGA_PREVIEW_HIDE_CSS, '[data-mega-preview-hide], [aria-label="Cookie consent" i] { display: none !important; }');
  assert.doesNotMatch(MEGA_PREVIEW_HIDE_CSS, /cookie(?!\sconsent)/i);
  assert.doesNotMatch(MEGA_PREVIEW_HIDE_CSS, /\*=|\^=|\$=/);
});

test("K16 a document with no head yet puts the rule on the root element", () => {
  const k = run({ head: false });
  assert.equal(k.appended[0].parent, "html");
});

test("K17 a document that refuses the style still says hello and still reports navigation", () => {
  const k = run({ throwOnStyle: true });
  assert.equal(k.appended.length, 0);
  assert.equal(k.posts.filter((p) => p.data.type === "preview.hello").length, 2);
  k.history.pushState({}, "", "/b");
  assert.equal(navigated(k).length, 2);
});

test("K18 outside preview there is no script, so no rule", () => {
  for (const v of [undefined, "0", "true", " 1"]) assert.equal(megaPreviewNavScript({ MEGA_PREVIEW_MODE: v }), null);
});
