import { pageTypeFor } from "./contract";

/**
 * Only the campaign parameters; everything else in a query string can carry
 * visitor PII. Ad click ids are dropped too (PostHog masks them itself, and
 * click attribution reaches Keystone through the lead context, not PostHog).
 */
const KEPT_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);
const PLACEHOLDER_ORIGIN = "https://relative.invalid";
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WEB_URL = /^https?:\/\//i;

const NO_EXTRA: ReadonlySet<string> = new Set();

/**
 * The allowlisted campaign params of a query string (without its "?"), plus a
 * destination's own extra keys (lower-case), lower-cased, as "?a=b" or "".
 */
function keptQuery(search: string, extra: ReadonlySet<string> = NO_EXTRA): string {
  const kept = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) {
    const name = key.toLowerCase();
    if (KEPT_PARAMS.has(name) || extra.has(name)) kept.append(name, value);
  }
  const query = kept.toString();
  return query ? `?${query}` : "";
}

/**
 * Scheme, host, path and allowlisted query only; the fragment is dropped. A
 * relative URL stays relative. Any scheme with a host (wss:, ftp:) keeps its
 * scheme and host. Anything that cannot be parsed, or is absolute without a
 * host (mailto:, tel:, javascript:), yields an empty string rather than a
 * partial value that might carry a query. extraKept adds a destination's own
 * keys (lower-case) to the allowlist; the default (every destination but one
 * that says otherwise) keeps utm_* only.
 */
export function scrubUrl(raw: string, extraKept: ReadonlySet<string> = NO_EXTRA): string {
  if (!raw) return "";
  try {
    const url = new URL(raw, PLACEHOLDER_ORIGIN);
    const absolute = HAS_SCHEME.test(raw) || raw.startsWith("//");
    const web = url.protocol === "http:" || url.protocol === "https:";
    if (absolute && !web && !url.host) return "";
    const prefix = !absolute ? "" : web ? url.origin : `${url.protocol}//${url.host}`;
    return prefix + url.pathname + keptQuery(url.search, extraKept);
  } catch {
    return "";
  }
}

interface CaptureLike {
  event?: string;
  properties?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const MAX_DEPTH = 5;
const TRUNCATED = "[truncated]";
const URL_KEY = /(^|[_$-])(url|href|referrer|uri)$/i;
const CAMEL_URL_KEY = /[a-z](Url|URL|Href|HREF|Referrer|Uri|URI)$/;
const isUrlKey = (key: string): boolean => URL_KEY.test(key) || CAMEL_URL_KEY.test(key);
const URL_IN_TEXT = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]]+/gi;
/**
 * A query or fragment attached to any token: scheme-less (www.x.test/?a=1),
 * relative without a slash (thanks?a=1, thanks?a@b.co), or after closing
 * punctuation ((https://x.test/a)?a=1), and a "?" followed by a space and a
 * key=value (x.test/a? email=a@b.co). Fails toward stripping. Group 1 is the
 * character before the tail, kept (no lookbehind: Safari before 16.4 cannot
 * parse one, which would break every chunk importing this file).
 */
const QUERY_TAIL = /(^|[^\s?#])([?#][^\s"'<>]+|\?\s+[^\s"'<>]*=[^\s"'<>]*)/g;
const PERCENT_ESCAPE = /%[0-9a-f]{2}/i;
const MAX_DECODES = 3;

function scrubTail(_match: string, before: string, tail: string): string {
  return before + (tail.startsWith("#") ? "" : keptQuery(tail.slice(1).trim().split("#")[0]));
}

function scrubPlainText(value: string): string {
  return value.replace(URL_IN_TEXT, (match) => scrubUrl(match)).replace(QUERY_TAIL, scrubTail);
}

/** A percent-encoded (or double-encoded) URL is judged decoded; if scrubbing changes it, the scrubbed decoded text replaces it. */
function scrubEncoded(value: string): string {
  let decoded = value;
  for (let i = 0; i < MAX_DECODES && PERCENT_ESCAPE.test(decoded); i++) {
    try {
      decoded = decodeURIComponent(decoded.replace(/\+/g, " "));
    } catch {
      break;
    }
    const scrubbed = scrubPlainText(decoded);
    if (scrubbed !== decoded) return scrubbed;
  }
  return value;
}

/**
 * Embedded URLs (any scheme), query tails on any token and percent-encoded
 * URLs are scrubbed wherever they sit in a string. A URL-named key also
 * covers relative values.
 */
export function scrubText(value: string, key: string): string {
  if (isUrlKey(key) && (/[?#]/.test(value) || WEB_URL.test(value))) return scrubUrl(value);
  // Each pass can uncover another layer (a decoded URL holding an encoded one); a value still changing after the cap is dropped.
  let current = value;
  for (let pass = 0; pass <= MAX_DECODES; pass++) {
    const next = scrubEncoded(scrubPlainText(current));
    if (next === current) return current;
    current = next;
  }
  return TRUNCATED;
}

/** Containers nested deeper than the cap are dropped rather than left unscrubbed. */
function scrubValue(value: unknown, key: string, depth: number): unknown {
  if (typeof value === "string") return scrubText(value, key);
  if (typeof value !== "object" || value === null) return value;
  if (depth >= MAX_DEPTH) return TRUNCATED;
  // PerformanceEntry, Date and friends serialise through toJSON; scrub what would be sent.
  if ("toJSON" in value && typeof value.toJSON === "function") {
    try {
      return scrubValue(value.toJSON(key), key, depth + 1);
    } catch {
      return TRUNCATED;
    }
  }
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, key, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrubValue(v, k, depth + 1);
  return out;
}

/** $heatmap_data is keyed by page URL; keys that collapse together are merged. */
function scrubHeatmap(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown[]> = {};
  for (const [key, rows] of Object.entries(data)) {
    const clean = WEB_URL.test(key) ? scrubUrl(key) : key;
    out[clean] = (out[clean] ?? []).concat(Array.isArray(rows) ? rows : [rows]);
  }
  return out;
}

/** Recording meta events carry the page href under data.href. */
function scrubSnapshots(events: unknown[]): unknown[] {
  return events.map((item) => {
    if (!isRecord(item) || !isRecord(item.data) || typeof item.data.href !== "string") return item;
    return { ...item, data: { ...item.data, href: scrubUrl(item.data.href) } };
  });
}

/** Every URL-shaped value in a property bag, scrubbed by shape (PostHog captures and GA4 dataLayer entries alike). */
export function scrubProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "$heatmap_data" && isRecord(value)) out[key] = scrubHeatmap(value);
    else if (key === "$snapshot_data" && Array.isArray(value)) out[key] = scrubSnapshots(value);
    else out[key] = scrubValue(value, key, 0);
  }
  return out;
}

/**
 * posthog-js before_send hook. Scrubs every URL-shaped value by shape rather
 * than by a list of names, so a property PostHog adds later is covered too,
 * and derives mega_page_type from the event's own path so it is right for
 * queued events and for the pageview fired by a client-side navigation.
 */
export function scrubCapture<T extends CaptureLike>(capture: T | null): T | null {
  if (!capture) return capture;
  const out: CaptureLike = { ...capture };
  if (isRecord(capture.properties)) {
    out.properties = scrubProps(capture.properties);
    const path = out.properties.$pathname;
    if (typeof path === "string") out.properties.mega_page_type = pageTypeFor(path);
  }
  if (isRecord(capture.$set)) out.$set = scrubProps(capture.$set);
  if (isRecord(capture.$set_once)) out.$set_once = scrubProps(capture.$set_once);
  return out as T;
}

const STRIPPED_NETWORK_FIELDS = ["requestHeaders", "requestBody", "responseHeaders", "responseBody"];

/** Recording network mask: no headers or bodies (they can hold tokens and form data), and a scrubbed url. */
export function maskNetworkRequest<T extends { name: string }>(request: T): T {
  const out: Record<string, unknown> = { ...request };
  for (const field of STRIPPED_NETWORK_FIELDS) delete out[field];
  out.name = scrubUrl(request.name);
  return out as T;
}
