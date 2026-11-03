import { scrubText, scrubUrl } from "./scrub";

/**
 * A GA4 hit is recognised by its endpoint, on any host: Google's collectors,
 * the first-party Google tag gateway (`<site>/<prefix>/g/collect`) and a
 * custom `transport_url` or server container alike. The measurement protocol
 * paths (`/g/collect`, `/g/s/collect`) are GA4 hits by themselves. The other
 * endpoints gtag.js sends GA4 data to (from its source: consent mode, Signals,
 * remarketing, tag diagnostics) count only with a GA4 measurement id, so an
 * unrelated `/td` or `/collect` is never touched. Every other request is not a
 * hit and is passed through as it was.
 */
const GA4_PATH = /\/g(\/s)?\/collect\/?$/i;
const GA4_SIDE_PATH = /\/(ccm(\/s)?\/collect|mc\/collect|rmkt\/collect|ads\/ga-audiences|td)\/?$/i;
const GA4_ID = /^G-[A-Z0-9]+$/i;
const ID_PARAMS = ["tid", "id"];

/**
 * Enhanced measurement's site search event exists only because the page URL
 * had a search query: its search_term (and any q_<param> extras the property
 * adds) is that query's value. It is dropped whole, not scrubbed.
 */
const QUERY_DERIVED_EVENTS = new Set(["view_search_results"]);

/**
 * Enhanced measurement's form events name the field the visitor touched first
 * (first_field_id, first_field_name, first_field_type, first_field_position),
 * which can reveal what they answered about (a "hasDenial" checkbox). Every
 * first_field_* param, text (ep.) or numeric (epn.), is dropped from every
 * hit. form_destination stays, URL-scrubbed; form_id, form_name and
 * form_length describe the site's own form and stay.
 */
const FIELD_IDENTIFYING_PARAM = /^epn?\.first_field_/i;

/**
 * GA4 alone also keeps Google's own click ids on a URL value: they tell
 * Google nothing it lacks, and Ads auto-tagging attribution in GA4 needs them
 * on page_location. Only on the URL a param carries, never on a URL nested
 * inside one of its params (those are dropped whole), and never for any other
 * destination (scrubUrl's default).
 */
export const GA4_EXTRA_KEPT_PARAMS: ReadonlySet<string> = new Set(["gclid", "gbraid", "wbraid", "dclid"]);

const ABSOLUTE = /^(https?:)?\/\//i;
const ROOT_RELATIVE = /^\/(?!\/)/;

/** Absolute, protocol-relative and root-relative URLs go through scrubUrl; any other text through the shared text scrubber. */
function scrubParamValue(key: string, value: string): string {
  if (ABSOLUTE.test(value) || (ROOT_RELATIVE.test(value) && /[?#]/.test(value))) return scrubUrl(value, GA4_EXTRA_KEPT_PARAMS);
  return scrubText(value, key);
}

/** One hit's params (a query string or one body line); null when the hit must not be sent at all. */
function scrubParams(raw: string): string | null {
  const out = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(raw)) {
    if (key === "en" && QUERY_DERIVED_EVENTS.has(value)) return null;
    if (FIELD_IDENTIFYING_PARAM.test(key)) continue;
    out.append(key, scrubParamValue(key, value));
  }
  return out.toString();
}

/** Resolves like the browser does (against the document's base URL); null when it is not a web URL. */
export function resolveRequestUrl(raw: string, base: string): URL | null {
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function hasGa4Id(url: URL): boolean {
  return ID_PARAMS.some((name) => GA4_ID.test(url.searchParams.get(name) ?? ""));
}

/** Whether a request URL, resolved against base, is a GA4 hit. */
export function isGaHit(raw: string, base: string): boolean {
  const url = resolveRequestUrl(raw, base);
  if (!url) return false;
  return GA4_PATH.test(url.pathname) || (GA4_SIDE_PATH.test(url.pathname) && hasGa4Id(url));
}

export interface GaHit {
  url: string;
  body?: string;
}

/**
 * Scrubs one GA4 hit: every param in the URL's query and in each line of a
 * batched body goes through the same scrubber PostHog uses, and the URL is
 * returned resolved. A body line for a query-derived event is dropped; a hit
 * with nothing left (or whose shared URL params are such an event) yields
 * null and must not be sent. Anything that is not a GA4 hit is returned as
 * the same object, untouched.
 */
export function scrubGaHit(hit: GaHit, base: string): GaHit | null {
  if (!isGaHit(hit.url, base)) return hit;
  const url = resolveRequestUrl(hit.url, base) as URL;
  const query = scrubParams(url.search.slice(1));
  if (query === null) return null;
  url.search = query;
  url.hash = "";
  if (hit.body === undefined || hit.body === "") return { url: url.toString(), body: hit.body };
  const kept = hit.body
    .split(/\r?\n/)
    .map((line) => (line ? scrubParams(line) : line))
    .filter((line): line is string => line !== null);
  if (!kept.some(Boolean)) return null;
  return { url: url.toString(), body: kept.join("\n") };
}
