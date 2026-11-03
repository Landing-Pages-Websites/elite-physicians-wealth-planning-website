import type { GaDropReason, GaHitDroppedProperties } from "./contract";
import { isGaHit, scrubGaHit } from "./ga-hits";

/**
 * GA4 has no before-send hook, and enhanced measurement (history page views,
 * outbound clicks, downloads, forms, site search) builds its hits inside
 * gtag.js from the raw address bar and the DOM. The only place every hit
 * passes through is the browser transport, so each one a page script can use
 * scrubs a GA4 hit before it leaves: fetch, sendBeacon, XMLHttpRequest, the
 * URL properties of elements (src, srcset, href, ping, data, poster), the
 * same attributes set through setAttribute/setAttributeNS, and the same
 * transports in a same-origin child frame reached through contentWindow or
 * contentDocument.
 *
 * Only GA4 hits (ga-hits.ts, by endpoint on any host) are touched. Every other
 * call reaches the native function with its own arguments. A hit whose body
 * cannot be read as text, or that fails to scrub, is not sent (fail closed)
 * and is counted.
 */

export { GA_HIT_DROPPED_EVENT } from "./contract";
export type { GaDropReason } from "./contract";

type Page = Window & typeof globalThis;
type AnyFunction = (this: unknown, ...args: unknown[]) => unknown;

/** Every wrapper and accessor we installed, in any realm: what re-assertion recognises as ours. */
const ours = new WeakSet<object>();
const installedPages = new WeakSet<object>();

const dropCounts = new Map<GaDropReason, number>();
let dropReporter: ((reason: GaHitDroppedProperties["reason"]) => void) | null = null;
let dropReported = false;

/** Called once per page, on the first hit dropped because it could not be scrubbed (site search drops are by design and only counted). */
export function setGaDropReporter(reporter: (reason: GaHitDroppedProperties["reason"]) => void): void {
  dropReporter = reporter;
}

export function gaHitDropCounts(): Partial<Record<GaDropReason, number>> {
  return Object.fromEntries(dropCounts);
}

function recordDrop(reason: GaDropReason): void {
  dropCounts.set(reason, (dropCounts.get(reason) ?? 0) + 1);
  if (reason === "site_search" || dropReported || !dropReporter) return;
  dropReported = true;
  try {
    dropReporter(reason);
  } catch {
    // Reporting must never break the transport.
  }
}

function baseOf(page: Page): string {
  return page.document?.baseURI ?? page.location?.href ?? "";
}

/** Same name, length and source text as the native function, and recognisable as ours. */
function nativeLike<T extends object>(wrapper: T, original: AnyFunction): T {
  try {
    Object.defineProperty(wrapper, "name", { value: original.name, configurable: true });
    Object.defineProperty(wrapper, "length", { value: original.length, configurable: true });
    const toString = (): string => Function.prototype.toString.call(original);
    Object.defineProperty(wrapper, "toString", { value: toString, configurable: true, writable: true });
  } catch {
    // Cosmetic only.
  }
  ours.add(wrapper);
  return wrapper;
}

// Slots (owner + name) we have wrapped at least once.
const wrappedSlots = new WeakMap<object, Set<string>>();
const NATIVE_SOURCE = /\{\s*\[native code\]\s*\}\s*$/;

function isNativeFunction(fn: unknown): boolean {
  try {
    return typeof fn === "function" && NATIVE_SOURCE.test(Function.prototype.toString.call(fn));
  } catch {
    return false;
  }
}

/**
 * Whether to wrap what a slot holds now. The first time, anything that is not
 * ours (another library may have wrapped first). After that only a native
 * function, meaning a library restored an original it captured: a non-native
 * function there is a library's wrapper over ours, and wrapping it again on
 * every re-assert would stack one layer per call without limit.
 */
function claimSlot(owner: object, slot: string, current: unknown): boolean {
  if (typeof current !== "function" || ours.has(current)) return false;
  const slots = wrappedSlots.get(owner) ?? wrappedSlots.set(owner, new Set()).get(owner)!;
  if (slots.has(slot) && !isNativeFunction(current)) return false;
  slots.add(slot);
  return true;
}

/** Where key is defined for target: target itself or the first prototype on its chain that has it. */
function findProperty(target: object, key: string): { owner: object; descriptor: PropertyDescriptor } | null {
  for (let owner: object | null = target; owner; owner = Object.getPrototypeOf(owner) as object | null) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (descriptor) return { owner, descriptor };
  }
  return null;
}

// Required transports already reported missing, so a re-assert does not count them again.
const missingSlots = new WeakMap<object, Set<string>>();

/** A transport gtag.js can use that this realm does not have where expected: counted and reported, never silent. */
function recordMissing(target: object | undefined, slot: string): void {
  const key = target ?? missingSlots;
  const seen = missingSlots.get(key) ?? missingSlots.set(key, new Set()).get(key)!;
  if (seen.has(slot)) return;
  seen.add(slot);
  recordDrop("transport_missing");
}

/**
 * Wraps the method key resolves to from target, wherever on the prototype
 * chain it is defined (fetch is an own property of window in browsers today,
 * per WebIDL [Global], but nothing here depends on that), keeping its
 * descriptor, when claimSlot allows it. A required method found nowhere is
 * recorded as missing.
 */
function replaceMethod(target: object | undefined, key: string, wrap: (original: AnyFunction) => AnyFunction, required = true): void {
  const found = target && findProperty(target, key);
  if (!found || typeof found.descriptor.value !== "function") {
    if (required) recordMissing(target, key);
    return;
  }
  const { owner, descriptor } = found;
  const original = descriptor.value as AnyFunction;
  if (!claimSlot(owner, key, original)) return;
  const wrapper = nativeLike(wrap(original), original);
  Object.defineProperty(owner, key, { ...descriptor, value: wrapper });
}

type Outcome = { pass: true } | { pass: false; send: false } | { pass: false; send: true; url: string; body: string | undefined };
const PASS: Outcome = { pass: true };
const DROP: Outcome = { pass: false, send: false };

const isText = (body: unknown): boolean =>
  typeof body === "string" || Object.prototype.toString.call(body) === "[object URLSearchParams]";

/** What to do with a request to href carrying body. Anything that is not a GA4 hit passes. */
function decide(page: Page, href: string, body: unknown): Outcome {
  if (!isGaHit(href, baseOf(page))) return PASS;
  if (body !== undefined && body !== null && !isText(body)) {
    recordDrop("unreadable_body");
    return DROP;
  }
  try {
    const hit = scrubGaHit({ url: href, body: body == null ? undefined : String(body) }, baseOf(page));
    if (hit) return { pass: false, send: true, url: hit.url, body: hit.body };
    recordDrop("site_search");
  } catch {
    recordDrop("scrub_error");
  }
  return DROP;
}

/** decide(), with any exception reading the arguments treated as "not ours to judge": the native call runs. */
function safeDecide(page: Page, readHref: () => string, readBody: () => unknown): Outcome {
  let href: string;
  let body: unknown;
  try {
    href = readHref();
    body = readBody();
  } catch {
    return PASS;
  }
  return decide(page, href, body);
}

const isRequest = (value: unknown): value is Request => Object.prototype.toString.call(value) === "[object Request]";

function patchFetch(page: Page): void {
  replaceMethod(page, "fetch", (original) =>
    function fetch(this: unknown, ...args: unknown[]) {
      // fetch() with no argument rejects natively; anything unreadable is the native call's to handle.
      if (args.length === 0) return original.apply(this, args);
      const [input, init] = args as [unknown, RequestInit | undefined];
      const outcome = safeDecide(page, () => (isRequest(input) ? input.url : String(input)), () => init?.body);
      if (outcome.pass) return original.apply(this, args);
      if (!outcome.send || isRequest(input)) {
        // A Request object's body is a stream we cannot rewrite synchronously.
        if (outcome.send) recordDrop("request_object");
        return Promise.resolve(new page.Response(null, { status: 204 }));
      }
      const scrubbedInit = init && "body" in init ? { ...init, body: outcome.body } : init;
      return original.call(this, outcome.url, scrubbedInit);
    },
  );
}

function patchBeacon(page: Page): void {
  replaceMethod(page.navigator, "sendBeacon", (original) =>
    function sendBeacon(this: unknown, ...args: unknown[]) {
      const outcome = safeDecide(page, () => String(args[0]), () => args[1]);
      if (outcome.pass) return original.apply(this, args);
      if (!outcome.send) return true;
      return original.call(this, outcome.url, outcome.body);
    },
  );
}

/** XHRs opened to a GA4 hit, shared by every open/send wrapper so a re-asserted send still sees them. */
const opened = new WeakMap<object, string>();

function patchXhr(page: Page): void {
  const proto = page.XMLHttpRequest?.prototype;
  replaceMethod(proto, "open", (original) =>
    function open(this: unknown, ...args: unknown[]) {
      const xhr = this as object;
      opened.delete(xhr);
      const outcome = safeDecide(page, () => String(args[1]), () => undefined);
      if (outcome.pass) return original.apply(this, args);
      opened.set(xhr, String(args[1]));
      // A dropped hit opens a URL that send() then never sends.
      const rest = [...args];
      rest[1] = outcome.send ? outcome.url : "about:blank";
      return original.apply(this, rest);
    },
  );
  replaceMethod(proto, "send", (original) =>
    function send(this: unknown, ...args: unknown[]) {
      const href = opened.get(this as object);
      if (href === undefined) return original.apply(this, args);
      const outcome = decide(page, href, args[0]);
      if (outcome.pass) return original.apply(this, args);
      if (outcome.send) return original.call(this, outcome.body ?? null);
    },
  );
}

/** One URL value: the same value when it is not a GA4 hit, the scrubbed URL, or null to not set it at all. */
function scrubUrlValue(page: Page, value: unknown): { value: unknown } | null {
  const outcome = safeDecide(page, () => String(value), () => undefined);
  if (outcome.pass) return { value };
  return outcome.send ? { value: outcome.url } : null;
}

/** A whitespace-separated URL list (srcset, ping): each URL token judged on its own; one dropped hit drops the list. */
function scrubUrlList(page: Page, value: unknown): { value: unknown } | null {
  let text: string;
  try {
    text = String(value);
  } catch {
    return { value };
  }
  let changed = false;
  let dropped = false;
  const tokens = text.split(/(\s+)/).map((token) => {
    const core = token.replace(/,+$/, "");
    if (!core.trim()) return token;
    const out = scrubUrlValue(page, core);
    if (out === null) dropped = true;
    if (out === null || out.value === core) return token;
    changed = true;
    return String(out.value) + token.slice(core.length);
  });
  if (dropped) return null;
  return changed ? { value: tokens.join("") } : { value };
}

function scrubAttribute(page: Page, name: unknown, value: unknown): { value: unknown } | null {
  const attribute = typeof name === "string" ? name.toLowerCase() : "";
  if (LIST_ATTRIBUTES.has(attribute)) return scrubUrlList(page, value);
  return URL_ATTRIBUTES.has(attribute) ? scrubUrlValue(page, value) : { value };
}

const URL_ATTRIBUTES = new Set(["src", "href", "data", "poster"]);
const LIST_ATTRIBUTES = new Set(["srcset", "imagesrcset", "ping"]);
const URL_PROPERTIES: [keyof Page, string][] = [
  ["HTMLImageElement", "src"], ["HTMLScriptElement", "src"], ["HTMLIFrameElement", "src"], ["HTMLFrameElement", "src"],
  ["HTMLSourceElement", "src"], ["HTMLEmbedElement", "src"], ["HTMLMediaElement", "src"], ["HTMLInputElement", "src"],
  ["HTMLTrackElement", "src"], ["HTMLLinkElement", "href"], ["HTMLObjectElement", "data"], ["HTMLVideoElement", "poster"],
  ["HTMLImageElement", "srcset"], ["HTMLSourceElement", "srcset"], ["HTMLLinkElement", "imageSrcset"],
  ["HTMLAnchorElement", "ping"], ["HTMLAreaElement", "ping"],
];

/** The element URL setters gtag.js and pixel code use; the rest of the table is covered where the browser has it. */
const REQUIRED_PROPERTIES = new Set(["HTMLImageElement.src", "HTMLImageElement.srcset", "HTMLScriptElement.src", "HTMLIFrameElement.src"]);

function prototypeOf(page: Page, ctor: keyof Page): object | undefined {
  const value = page[ctor] as { prototype?: object } | undefined;
  return value?.prototype;
}

/** Wraps the setter prop resolves to from proto, wherever on its prototype chain it is defined. */
function patchSetter(proto: object | undefined, prop: string, required: boolean, scrub: (value: unknown) => { value: unknown } | null): void {
  const found = proto && findProperty(proto, prop);
  const native = found?.descriptor.set;
  if (!found || !native) {
    if (required) recordMissing(proto, `set ${prop}`);
    return;
  }
  if (!claimSlot(found.owner, `set ${prop}`, native)) return;
  const set = nativeLike(function (this: unknown, value: unknown) {
    const out = scrub(value);
    if (out) native.call(this, out.value);
  }, native as AnyFunction);
  Object.defineProperty(found.owner, prop, { ...found.descriptor, set });
}

function patchElements(page: Page): void {
  for (const [ctor, prop] of URL_PROPERTIES) {
    const list = LIST_ATTRIBUTES.has(prop.toLowerCase());
    const required = REQUIRED_PROPERTIES.has(`${String(ctor)}.${prop}`);
    patchSetter(prototypeOf(page, ctor), prop, required, (value) => (list ? scrubUrlList(page, value) : scrubUrlValue(page, value)));
  }
  const element = prototypeOf(page, "Element");
  replaceMethod(element, "setAttribute", (original) =>
    function setAttribute(this: unknown, ...args: unknown[]) {
      const out = scrubAttribute(page, args[0], args[1]);
      if (!out) return undefined;
      return out.value === args[1] ? original.apply(this, args) : original.call(this, args[0], out.value);
    },
  );
  replaceMethod(element, "setAttributeNS", (original) =>
    function setAttributeNS(this: unknown, ...args: unknown[]) {
      const local = typeof args[1] === "string" ? args[1].split(":").pop() : args[1];
      const out = scrubAttribute(page, local, args[2]);
      if (!out) return undefined;
      return out.value === args[2] ? original.apply(this, args) : original.call(this, args[0], args[1], out.value);
    },
    false,
  );
}

/** A same-origin child frame is its own realm with its own fetch; it gets the same scrubber when page code reaches it. */
function patchFrameRealms(page: Page): void {
  for (const ctor of ["HTMLIFrameElement", "HTMLFrameElement", "HTMLObjectElement"] as const) {
    const proto = prototypeOf(page, ctor);
    for (const prop of ["contentWindow", "contentDocument"]) {
      const found = proto && findProperty(proto, prop);
      const native = found?.descriptor.get;
      if (!found || !native || !claimSlot(found.owner, `get ${prop}`, native)) continue;
      const { owner, descriptor } = found;
      const get = nativeLike(function (this: unknown) {
        const value = native.call(this) as (Page & Document) | null;
        try {
          const realm = (prop === "contentDocument" ? value?.defaultView : value) as Page | null | undefined;
          if (realm && realm !== page) installGaHitScrubber(realm);
        } catch {
          // Cross-origin or detached: nothing page code can send through it from here.
        }
        return value;
      }, native as AnyFunction);
      Object.defineProperty(owner, prop, { ...descriptor, get });
    }
  }
}

/**
 * Installs the scrubbing transports in this realm, and re-asserts them on
 * every later call: a wrapper another library replaced with an original it
 * captured earlier is wrapped again. Must run before gtag.js is configured.
 */
export function installGaHitScrubber(page: Page): void {
  installedPages.add(page);
  patchFetch(page);
  patchBeacon(page);
  patchXhr(page);
  patchElements(page);
  patchFrameRealms(page);
}

/** Re-asserts the transports, only where they were installed (a page whose GA4 was configured). */
export function reassertGaHitScrubber(page: Page): void {
  if (installedPages.has(page)) installGaHitScrubber(page);
}
