import assert from "node:assert/strict";
import test from "node:test";
import { isGaHit, scrubGaHit } from "./ga-hits.ts";
import { gaHitDropCounts, installGaHitScrubber, reassertGaHitScrubber, setGaDropReporter } from "./ga-transport.ts";
import { scrubCapture } from "./scrub.ts";

const BASE = "https://site.test/sub/page?x=1";
const COLLECT = "https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST000001";
const hitParams = (raw: string) => Object.fromEntries(new URLSearchParams(raw));
const urlParams = (url: string) => hitParams(new URL(url).search);

test("a GA4 hit is recognised by its endpoint on any host, resolved against the page", () => {
  const hits = [
    "https://www.google-analytics.com/g/collect?v=2&tid=G-X1",
    "https://region1.google-analytics.com/g/collect",
    "https://analytics.google.com/g/s/collect?v=2",
    "https://stats.g.doubleclick.net/g/collect?v=2",
    "https://site.test/metrics/g/collect?v=2&tid=G-X1",
    "https://sgtm.customer.test/g/collect?v=2",
    "/metrics/g/collect?v=2",
    "g/collect?v=2",
    "//www.google-analytics.com/g/collect?v=2",
    "https://www.google-analytics.com./g/collect?v=2",
    "HTTPS://WWW.GOOGLE-ANALYTICS.COM/G/COLLECT?v=2",
    "https://www.google-analytics.com:443/g/collect/",
    "https://www.google.com/ccm/collect?tid=G-X1&dl=x",
    "https://www.googletagmanager.com/td?id=G-X1&v=3",
    "https://www.google.com/ads/ga-audiences?tid=G-X1&v=1",
  ];
  const notHits = [
    "https://www.google.com/ccm/geo",
    "https://play.google.com/log?format=json",
    "https://accounts.google.com/gsi/button?origin=https%3A%2F%2Fsite.test",
    "https://docs.google.com/presentation/d/X/embed?start=false#slide=id.p3",
    "https://www.google.com/maps/embed?pb=!1m18!2d-1",
    "https://www.google.com/recaptcha/api2/anchor?ar=1&k=K&co=aHR0cHM6",
    "https://www.googletagmanager.com/td?id=GTM-X1",
    "https://www.google.com/ccm/collect?tid=AW-123",
    "https://www.googletagmanager.com/gtag/js?id=G-X1",
    "https://www.google-analytics.com/collect?v=1&tid=UA-1",
    "https://site.test/api/lead?dl=https%3A%2F%2Fx.test%2F%3Fa%3D1",
    "https://site.test/g/collector",
    "mailto:a@b.co",
    "javascript:void(0)",
    "",
  ];
  for (const url of hits) assert.equal(isGaHit(url, BASE), true, url);
  for (const url of notHits) assert.equal(isGaHit(url, BASE), false, url);
});

test("anything that is not a GA4 hit comes back as the same object, byte for byte", () => {
  const requests = [
    { url: "https://play.google.com/log?format=json&hasfast=true", body: '[[1,null,null,[{"a":"x&y=1"}]],"https://site.test/?q=1"]' },
    { url: "https://docs.google.com/presentation/d/X/embed?start=false#slide=id.p3" },
    { url: "https://accounts.google.com/gsi/button?origin=https%3A%2F%2Fsite.test&redirect_uri=https%3A%2F%2Fsite.test%2Fcb%3Fs%3D1" },
    { url: "https://www.google.com/maps/embed?pb=!1m18!1m12~x" },
    { url: "https://site.test/api/lead", body: "email=a%40b.co&next=https%3A%2F%2Fx.test%2F%3Fq%3D1" },
  ];
  for (const request of requests) assert.equal(scrubGaHit(request, BASE), request, request.url);
});

/** Every shape a URL can take in a value, for GA4 params and PostHog properties alike. */
const URL_VALUES: [string, string][] = [
  ["https://site.test/?email=a@b.co&utm_source=x", "https://site.test/?utm_source=x"],
  ["https://site.test/?Email=Mixed@x.co&UTM_Campaign=z", "https://site.test/?utm_campaign=z"],
  ["https://site.test/?%65mail=enc@x.co", "https://site.test/"],
  ["https://site.test/#access_token=SECRET", "https://site.test/"],
  ["https://outbound.test/path?outq=SECRET", "https://outbound.test/path"],
  ["/x?token=1#frag", "/x"],
  ["https%3A%2F%2Fx.test%2F%3Femail%3Da%40b.co", "https://x.test/"],
  ["https%253A%252F%252Fx.test%252F%253Femail%253Da%2540b.co", "https://x.test/"],
  ["www.x.test/?email=a@b.co", "www.x.test/"],
  ["thanks?email=a@b.co", "thanks"],
  ["wss://x.test/?token=SECRET", "wss://x.test/"],
  ["(https://x.test/a)?t=SECRET", "(https://x.test/a)"],
  ["see https://x.test/?a=SECRET now", "see https://x.test/ now"],
  ["x.test/p#access_token=SECRET", "x.test/p"],
  ["see https://a.test/?x=1 and https%3A%2F%2Fb.test%2F%3Fe%3D2", "see https://a.test/ and https://b.test/"],
];
const NOT_URLS = ["Home | Site", "90", "/", "outbound.test", "50%25 off", "What? yes", "a=b"];

test("every URL-bearing value keeps only utm_* and loses its fragment: GA4 params", () => {
  for (const [raw, want] of URL_VALUES) {
    const hit = scrubGaHit({ url: `${COLLECT}&ep.note=${encodeURIComponent(raw)}` }, BASE);
    assert.equal(urlParams(hit!.url)["ep.note"], want, raw);
  }
  for (const raw of NOT_URLS) {
    const hit = scrubGaHit({ url: `${COLLECT}&dt=${encodeURIComponent(raw)}` }, BASE);
    assert.equal(urlParams(hit!.url).dt, raw, raw);
  }
});

test("the same shapes are scrubbed on PostHog's path", () => {
  for (const [raw, want] of URL_VALUES) {
    const out = scrubCapture({ event: "e", properties: { note: raw } });
    assert.equal(out?.properties?.note, want, raw);
  }
  for (const raw of NOT_URLS) assert.equal(scrubCapture({ event: "e", properties: { note: raw } })?.properties?.note, raw, raw);
});

test("batched bodies are scrubbed line by line, and site search (derived from the query) is dropped", () => {
  const body = [
    "en=page_view&dl=https%3A%2F%2Fsite.test%2F%3Femail%3Da%40b.co",
    "en=view_search_results&ep.search_term=john%20smith&ep.q_name=jane",
    "en=click&ep.link_url=https%3A%2F%2Fout.test%2F%3Fq%3D1",
  ].join("\r\n");
  const hit = scrubGaHit({ url: COLLECT, body }, BASE);
  const lines = hit!.body!.split("\n").map(hitParams);
  assert.deepEqual(lines.map((l) => l.en), ["page_view", "click"]);
  assert.equal(lines[0].dl, "https://site.test/");
  assert.equal(lines[1]["ep.link_url"], "https://out.test/");
  assert.doesNotMatch(hit!.body!, /john|jane/);
  assert.equal(scrubGaHit({ url: `${COLLECT}&en=view_search_results&ep.search_term=john` }, BASE), null);
  assert.equal(scrubGaHit({ url: COLLECT, body: "en=view_search_results&ep.search_term=john\n" }, BASE), null);
});

type Sent = { via: string; url: string; body?: unknown };

type Placement = "own" | "inherited" | "missing";
type Transport = "fetch" | "beacon" | "xhr" | "src" | "setAttribute";

/**
 * A page with the transports page code can use, recording what leaves. Each
 * transport sits where the browser puts it by default ("own" on its usual
 * owner), one prototype further up ("inherited"), or nowhere ("missing").
 */
function fakePage(where: Partial<Record<Transport, Placement>> = {}) {
  // Defaults match the browser: sendBeacon lives on Navigator.prototype, everything else on its usual owner.
  const at = (t: Transport): Placement => where[t] ?? (t === "beacon" ? "inherited" : "own");
  const sent: Sent[] = [];
  const attrs = new Map<object, Map<string, unknown>>();
  const attrOf = (el: object) => attrs.get(el) ?? attrs.set(el, new Map()).get(el)!;
  const define = (target: object, key: string, value: unknown) =>
    Object.defineProperty(target, key, { configurable: true, enumerable: true, writable: true, value });
  class NodeBase {}
  class Element extends NodeBase {}
  const attributeHost = at("setAttribute") === "inherited" ? NodeBase.prototype : Element.prototype;
  if (at("setAttribute") !== "missing") {
    define(attributeHost, "setAttribute", function setAttribute(this: object, name: string, value: unknown) { attrOf(this).set(name, value); sent.push({ via: `attr:${name}`, url: String(value) }); });
    define(attributeHost, "setAttributeNS", function setAttributeNS(this: { setAttribute(n: string, v: unknown): void }, _ns: string | null, name: string, value: unknown) { this.setAttribute(name, value); });
  }
  const accessor = (name: string) => ({
    configurable: true,
    enumerable: true,
    get(this: object) { return attrOf(this).get(name) ?? ""; },
    set(this: object, v: unknown) { attrOf(this).set(name, v); sent.push({ via: name, url: String(v) }); },
  });
  class HTMLElementBase extends Element {}
  class HTMLImageElement extends HTMLElementBase {}
  const srcHost = at("src") === "inherited" ? HTMLElementBase.prototype : HTMLImageElement.prototype;
  if (at("src") !== "missing") for (const name of ["src", "srcset"]) Object.defineProperty(srcHost, name, accessor(name));
  class HTMLScriptElement extends Element {}
  Object.defineProperty(HTMLScriptElement.prototype, "src", accessor("src"));
  class HTMLIFrameElement extends Element {}
  Object.defineProperty(HTMLIFrameElement.prototype, "src", accessor("src"));
  class HTMLAnchorElement extends Element {}
  Object.defineProperty(HTMLAnchorElement.prototype, "ping", accessor("ping"));
  class Navigator {}
  const navigator = new Navigator();
  const sendBeacon = function sendBeacon(url: string, body?: unknown) { sent.push({ via: "beacon", url, body }); return true; };
  // Browsers define sendBeacon on Navigator.prototype; "own" here puts it on the instance instead.
  if (at("beacon") === "inherited") define(Navigator.prototype, "sendBeacon", sendBeacon);
  if (at("beacon") === "own") define(navigator, "sendBeacon", sendBeacon);
  class XhrBase {}
  class XMLHttpRequest extends XhrBase {}
  const xhrHost = at("xhr") === "inherited" ? XhrBase.prototype : XMLHttpRequest.prototype;
  if (at("xhr") !== "missing") {
    define(xhrHost, "open", function open(this: { url?: string }, _method: string, url: string) { this.url = url; });
    define(xhrHost, "send", function send(this: { url?: string }, body?: unknown) { sent.push({ via: "xhr", url: this.url ?? "", body }); });
  }
  async function rawFetch(input?: unknown, init?: RequestInit): Promise<Response> {
    if (arguments.length === 0) throw new TypeError("Failed to execute 'fetch': 1 argument required");
    const url = Object.prototype.toString.call(input) === "[object Request]" ? (input as Request).url : String(input);
    sent.push({ via: "fetch", url, body: init?.body });
    return new Response(null, { status: 204 });
  }
  // Bound, so its source reads as native code like the browser's fetch.
  const fetch = rawFetch.bind(undefined);
  const globals: object = at("fetch") === "inherited" ? { fetch } : {};
  const page = Object.assign(Object.create(globals) as object, {
    document: { baseURI: BASE }, navigator, Navigator, Response,
    XMLHttpRequest, Element, HTMLImageElement, HTMLScriptElement, HTMLIFrameElement, HTMLAnchorElement,
  }, at("fetch") === "own" ? { fetch } : {}) as unknown as Window & typeof globalThis;
  return { page, sent, nativeFetch: fetch, Img: HTMLImageElement, A: HTMLAnchorElement };
}

const leaky = `${COLLECT}&en=page_view&dl=${encodeURIComponent("https://site.test/?email=a@b.co&utm_source=x")}`;
const SECRET = /email|a%40b|john|q%3D1|SECRET/;

test("every transport sends only scrubbed GA4 hits, however the URL is spelled", async () => {
  const { page, sent, Img, A } = fakePage();
  installGaHitScrubber(page);
  const img = new Img() as unknown as { src: string; srcset: string; setAttribute(n: string, v: string): void; setAttributeNS(ns: null, n: string, v: string): void };
  const relative = leaky.replace("https://region1.google-analytics.com", "");
  page.navigator.sendBeacon(leaky, "en=click&ep.link_url=https%3A%2F%2Fo.test%2F%3Fq%3D1");
  await page.fetch(leaky, { method: "POST", body: "en=scroll&dr=https%3A%2F%2Fs.test%2F%3Fq%3Djohn" });
  await page.fetch(new URL(leaky));
  img.src = leaky.replace("https:", "");
  img.setAttribute("src", leaky.replace("region1.google-analytics.com", "region1.google-analytics.com."));
  img.setAttributeNS(null, "SRC", relative);
  img.srcset = `${leaky} 1x, /a.png 2x`;
  (new A() as unknown as { ping: string }).ping = `/own-ping ${leaky}`;
  const xhr = new page.XMLHttpRequest();
  xhr.open("POST", leaky);
  xhr.send("en=form_start&ep.form_destination=https%3A%2F%2Fsite.test%2Fthanks%3Fq%3D1");
  await page.fetch("https://site.test/metrics/g/collect?v=2&dl=https%3A%2F%2Fsite.test%2F%3Femail%3Da%40b.co");
  assert.equal(sent.length, 10);
  for (const s of sent) assert.doesNotMatch(`${s.url} ${String(s.body ?? "")}`, SECRET, s.via);
  assert.ok(sent.some((s) => s.via === "srcset" && s.url.endsWith(", /a.png 2x")), "other srcset candidates kept");
});

test("every call that is not a GA4 hit reaches the native function with its own arguments", async () => {
  const { page, sent, nativeFetch, Img } = fakePage();
  installGaHitScrubber(page);
  const own = ["https://site.test/api?next=https%3A%2F%2Fx.test%2F%3Fa%3D1", "https://play.google.com/log?format=json", "https://docs.google.com/d/X#slide=1"];
  for (const url of own) await page.fetch(url, { method: "POST", body: '[[1,"https://x.test/?q=1"]]' });
  page.navigator.sendBeacon(own[1], new Blob(["x"]));
  const img = new Img() as unknown as { src: string };
  img.src = own[2];
  await assert.rejects(page.fetch(), TypeError, "fetch() still rejects");
  await page.fetch(undefined as unknown as string);
  await page.fetch(null as unknown as string);
  await page.fetch({ toString: () => "/api/tostr" } as unknown as string);
  await page.fetch(new Request("https://site.test/api/r", { method: "POST", body: "a=1" }));
  assert.deepEqual(sent.slice(0, 3).map((s) => s.body), Array(3).fill('[[1,"https://x.test/?q=1"]]'));
  assert.deepEqual(sent.slice(3).map((s) => s.url), [own[1], own[2], "undefined", "null", "/api/tostr", "https://site.test/api/r"]);
  assert.equal(page.fetch.name, nativeFetch.name);
  assert.equal(page.fetch.length, nativeFetch.length);
  assert.equal(page.fetch.toString(), Function.prototype.toString.call(nativeFetch));
  assert.equal(Object.prototype.hasOwnProperty.call(page.navigator, "sendBeacon"), false, "sendBeacon stays on the prototype");
});

test("a restored original is wrapped again on the next configure or dataLayer write", async () => {
  const { page, sent, nativeFetch } = fakePage();
  reassertGaHitScrubber(page);
  await page.fetch(leaky);
  assert.match(sent.at(-1)!.url, /email/, "not installed on a page that never configured GA4");
  installGaHitScrubber(page);
  page.fetch = nativeFetch;
  reassertGaHitScrubber(page);
  await page.fetch(leaky);
  assert.doesNotMatch(sent.at(-1)!.url, /email/);
  const wrapped = page.fetch;
  reassertGaHitScrubber(page);
  assert.equal(page.fetch, wrapped, "re-assertion never stacks a second wrapper");
});

test("an unreadable GA4 hit is dropped, counted, and reported once with its reason only", async () => {
  const reports: unknown[] = [];
  setGaDropReporter((reason) => reports.push(reason));
  const { page, sent } = fakePage();
  installGaHitScrubber(page);
  const before = gaHitDropCounts();
  page.navigator.sendBeacon(leaky, new Blob(["en=page_view&dl=https://x.test/?a=1"]));
  await page.fetch(new Request(leaky, { method: "POST", body: "x" }));
  await page.fetch(`${COLLECT}&en=view_search_results&ep.search_term=john`);
  await page.fetch(leaky, { method: "POST", body: new Blob(["x"]) });
  assert.equal(sent.length, 0, "nothing unreadable leaves");
  const after = gaHitDropCounts();
  assert.equal((after.unreadable_body ?? 0) - (before.unreadable_body ?? 0), 2);
  assert.equal((after.request_object ?? 0) - (before.request_object ?? 0), 1);
  assert.equal((after.site_search ?? 0) - (before.site_search ?? 0), 1);
  assert.deepEqual(reports, ["unreadable_body"], "one report per page, reason only");
});

/** Google's own click ids: GA4 keeps them on the URL a param carries; nothing else does. */
const CLICK_ID_URLS: [string, string, string][] = [
  // [raw URL value, GA4 result, PostHog result]
  ["https://site.test/?gclid=G1&email=a@b.co&utm_source=x", "https://site.test/?gclid=G1&utm_source=x", "https://site.test/?utm_source=x"],
  ["https://site.test/?GCLID=G1&Gbraid=B1&WBRAID=W1&dclid=D1", "https://site.test/?gclid=G1&gbraid=B1&wbraid=W1&dclid=D1", "https://site.test/"],
  ["https://site.test/?%67clid=G1&%65mail=a@b.co", "https://site.test/?gclid=G1", "https://site.test/"],
  ["https://site.test/?gclid=G1&gclid=G2", "https://site.test/?gclid=G1&gclid=G2", "https://site.test/"],
  ["https://site.test/?next=https%3A%2F%2Fx.test%2F%3Fgclid%3DHIDDEN&gclid=G1", "https://site.test/?gclid=G1", "https://site.test/"],
  ["https://site.test/?fbclid=F1&msclkid=M1&gclsrc=aw.ds&gclidx=1&xgclid=2", "https://site.test/", "https://site.test/"],
  ["https://site.test/p#gclid=G1", "https://site.test/p", "https://site.test/p"],
  ["/thanks?gclid=G1&token=1", "/thanks?gclid=G1", "/thanks"],
];

test("GA4 keeps exactly Google's click ids on a URL value; PostHog and nested URLs never do", () => {
  for (const [raw, ga, posthog] of CLICK_ID_URLS) {
    const hit = scrubGaHit({ url: `${COLLECT}&dl=${encodeURIComponent(raw)}` }, BASE);
    assert.equal(urlParams(hit!.url).dl, ga, `GA4: ${raw}`);
    assert.equal(scrubCapture({ event: "e", properties: { $current_url: raw } })?.properties?.$current_url, posthog, `PostHog: ${raw}`);
  }
  const text = scrubGaHit({ url: `${COLLECT}&ep.note=${encodeURIComponent("see https://x.test/?gclid=G1")}` }, BASE);
  assert.equal(urlParams(text!.url)["ep.note"], "see https://x.test/", "a URL inside free text is scrubbed with the default allowlist");
});

test("a library that keeps re-wrapping fetch never makes re-assertion stack layers", async () => {
  const { page, sent } = fakePage();
  installGaHitScrubber(page);
  const KEEPER = Symbol("keeper");
  type Kept = typeof page.fetch & { [KEEPER]?: true };
  // An APM-style agent: whenever window.fetch is not its own, it wraps whatever is there.
  const keep = (): void => {
    if ((page.fetch as Kept)[KEEPER]) return;
    const inner = page.fetch;
    const keeper = function (this: unknown, ...args: Parameters<typeof fetch>) { return inner.apply(this, args); } as Kept;
    keeper[KEEPER] = true;
    page.fetch = keeper;
  };
  for (let i = 0; i < 50; i++) {
    keep();
    reassertGaHitScrubber(page);
    keep();
  }
  // Each of our layers reads a non-hit URL once and passes the same object on; the native fetch reads it once more.
  let reads = 0;
  const counted = { toString: () => (reads++, "/api/counted") };
  await page.fetch(counted as unknown as string);
  assert.equal(reads, 2, "exactly one of our layers in the chain");
  await page.fetch(leaky);
  assert.doesNotMatch(sent.at(-1)!.url, /email/, "hits are still scrubbed");
  await page.fetch("https://site.test/api?next=https%3A%2F%2Fx.test%2F%3Fa%3D1", { method: "POST", body: "a=1" });
  assert.deepEqual(sent.at(-1), { via: "fetch", url: "https://site.test/api?next=https%3A%2F%2Fx.test%2F%3Fa%3D1", body: "a=1" });
});

test("shipped tracking sources use no regex lookbehind (Safari before 16.4 cannot parse it)", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const dirs = [new URL("./", import.meta.url), new URL("../../components/analytics/", import.meta.url)];
  for (const dir of dirs) {
    for (const name of readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))) {
      const source = readFileSync(new URL(name, dir), "utf8");
      assert.doesNotMatch(source, /\(\?<[=!]/, `${name} has a lookbehind`);
    }
  }
});

test("form events never name the field the visitor touched; the form's own params stay", () => {
  const line = [
    "en=form_start", "ep.form_id=intake", "ep.form_name=claim", "epn.form_length=6",
    `ep.form_destination=${encodeURIComponent("https://site.test/thanks?claim=1")}`,
    "ep.first_field_id=hasDenial", "ep.first_field_name=unableToWork", "ep.first_field_type=checkbox",
    "epn.first_field_position=1", "EP.FIRST_FIELD_NAME=Upper",
  ].join("&");
  for (const hit of [scrubGaHit({ url: `${COLLECT}&${line}` }, BASE), scrubGaHit({ url: COLLECT, body: `en=page_view\n${line}` }, BASE)]) {
    const text = `${hit!.url} ${hit!.body ?? ""}`;
    assert.doesNotMatch(text, /first_field|hasDenial|unableToWork|checkbox|Upper/i);
    const params = hit!.body ? hitParams(hit!.body.split("\n")[1]) : urlParams(hit!.url);
    assert.deepEqual(
      { id: params["ep.form_id"], name: params["ep.form_name"], length: params["epn.form_length"], destination: params["ep.form_destination"] },
      { id: "intake", name: "claim", length: "6", destination: "https://site.test/thanks" },
    );
  }
});

/** Sends one leaky hit through a transport. */
async function sendThrough(t: Transport, page: Window & typeof globalThis, Img: { new (): unknown }): Promise<void> {
  const img = new Img() as { src: string; setAttribute(n: string, v: string): void };
  if (t === "fetch") await page.fetch(leaky);
  if (t === "beacon") page.navigator.sendBeacon(leaky);
  if (t === "xhr") {
    const xhr = new page.XMLHttpRequest();
    xhr.open("GET", leaky);
    xhr.send();
  }
  if (t === "src") img.src = leaky;
  if (t === "setAttribute") img.setAttribute("src", leaky);
}

test("each transport is wrapped wherever it is defined on the prototype chain, and a missing one is reported", async () => {
  const transports: Transport[] = ["fetch", "beacon", "xhr", "src", "setAttribute"];
  for (const t of transports) {
    for (const placement of ["own", "inherited"] as const) {
      const { page, sent, Img } = fakePage({ [t]: placement });
      const before = gaHitDropCounts().transport_missing ?? 0;
      installGaHitScrubber(page);
      await sendThrough(t, page, Img);
      const label = `${t} ${placement}`;
      assert.equal(sent.length, 1, `${label}: the hit is sent`);
      assert.doesNotMatch(sent[0].url, /email/, `${label}: and scrubbed`);
      assert.equal(gaHitDropCounts().transport_missing ?? 0, before, `${label}: nothing reported missing`);
    }
    const { page } = fakePage({ [t]: "missing" });
    const before = gaHitDropCounts().transport_missing ?? 0;
    installGaHitScrubber(page);
    reassertGaHitScrubber(page);
    assert.equal(gaHitDropCounts().transport_missing ?? 0, before + (t === "xhr" ? 2 : t === "src" ? 2 : 1), `${t} missing: reported once per slot, not per re-assert`);
  }
});
