export const TRACKING_CONTRACT_VERSION = 1;
export const TRACKING_TEMPLATE = "starter";
/** DOM event LeadForm dispatches on its form after a confirmed submit. */
export const LEAD_SUBMITTED_EVENT = "mega:lead-submitted";

export type TrackingEvent =
  | "contact_click" | "cta_click" | "section_viewed" | "form_started" | "form_field_completed"
  | "form_abandoned" | "form_error" | "lead_form_submit" | "outbound_click" | "file_download";

/**
 * Sent to PostHog only, at most once per page, when a GA4 hit could not be
 * scrubbed and was therefore not sent (src/lib/tracking/ga-transport.ts).
 * Its one property is `reason`; no URL or hit parameter is ever attached.
 */
export const GA_HIT_DROPPED_EVENT = "mega_ga_hit_dropped";
/** transport_missing: a transport the scrubber must wrap was not found on its target or prototype chain. */
export type GaDropReason = "site_search" | "unreadable_body" | "request_object" | "scrub_error" | "transport_missing";
export interface GaHitDroppedProperties {
  reason: Exclude<GaDropReason, "site_search">;
}

export type Placement = "header" | "footer" | "nav" | "section" | "inline";

export interface ClickInput {
  href: string | null;
  pageHost: string;
  ctaLabel: string | null;
  text: string;
  placement: Placement;
}

export interface ClassifiedClick {
  event: TrackingEvent;
  properties: Record<string, string>;
}

export interface TrackingEnv {
  siteId?: string;
  release?: string;
  vercelEnv?: string;
  pageType?: string;
}

const LABEL_MAX = 80;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOWNLOAD_EXT = /\.(pdf|docx?|xlsx?|pptx?|csv|zip)$/i;
const DIRECTIONS_HOSTS = ["maps.google.com", "maps.app.goo.gl", "maps.apple.com"];
const BOOKING_HOSTS = ["calendly.com", "acuityscheduling.com", "squareup.com", "vagaro.com", "mindbodyonline.com", "setmore.com", "booksy.com", "zocdoc.com"];
const SCHEME_CHANNEL: Record<string, string> = { "tel:": "call", "sms:": "text", "mailto:": "email" };
const LANDMARKS: Record<string, Placement> = { header: "header", footer: "footer", nav: "nav", section: "section" };

function bareHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

function hostMatches(host: string, list: string[]): boolean {
  return list.some((h) => host === h || host.endsWith("." + h));
}

function isDirections(url: URL, host: string): boolean {
  return hostMatches(host, DIRECTIONS_HOSTS) || (host === "goo.gl" && url.pathname.startsWith("/maps"))
    || (/(^|\.)google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps"));
}

function contactChannel(url: URL): string | null {
  const scheme = SCHEME_CHANNEL[url.protocol];
  if (scheme) return scheme;
  const host = bareHost(url.hostname);
  if (isDirections(url, host)) return "directions";
  if (hostMatches(host, BOOKING_HOSTS)) return "booking";
  return null;
}

function parse(href: string | null, pageHost: string): URL | null {
  if (!href) return null;
  try {
    return new URL(href, `https://${pageHost}/`);
  } catch {
    return null;
  }
}

function isWeb(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

export function clean(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim() ?? "";
  return trimmed === "" ? null : trimmed.slice(0, LABEL_MAX);
}

/**
 * Precedence is contact, then download, then outbound, then CTA, so one click
 * is exactly one event and a tel: link inside a CTA never double-counts.
 */
export function classifyClick(input: ClickInput): ClassifiedClick | null {
  const url = parse(input.href, input.pageHost);
  const label = clean(input.ctaLabel) ?? clean(input.text) ?? "";
  const placement = input.placement;
  if (url) {
    const channel = contactChannel(url);
    if (channel) return { event: "contact_click", properties: { channel, placement, label } };
    if (isWeb(url)) {
      if (DOWNLOAD_EXT.test(url.pathname)) return { event: "file_download", properties: { ext: url.pathname.split(".").pop()!.toLowerCase(), placement } };
      const host = bareHost(url.hostname);
      if (host !== "" && host !== bareHost(input.pageHost)) return { event: "outbound_click", properties: { host, placement } };
    }
  }
  if (clean(input.ctaLabel)) {
    const destination = url && isWeb(url) ? url.pathname : "";
    return { event: "cta_click", properties: { label, destination, placement } };
  }
  return null;
}

export function placementFrom(ancestorTags: string[]): Placement {
  for (const tag of ancestorTags) {
    const hit = LANDMARKS[tag.toLowerCase()];
    if (hit) return hit;
  }
  return "inline";
}

export function labelFor(attrs: { label: string | null; id: string | null; heading: string | null; text: string | null }): { label: string; source: "attribute" | "fallback" } | null {
  const attr = clean(attrs.label);
  if (attr) return { label: attr, source: "attribute" };
  const fallback = clean(attrs.id) ?? clean(attrs.heading) ?? clean(attrs.text);
  return fallback ? { label: fallback, source: "fallback" } : null;
}

export interface TrackingGateEnv {
  disabled?: string;
  vercelEnv?: string;
  preview?: string;
}

/**
 * Where tracking may run. Fails closed: only a production deploy, or an
 * explicit preview opt-in for local verification. NEXT_PUBLIC_MEGA_TRACKING_DISABLED=1
 * (the CMS editor preview) wins over everything.
 */
export function trackingEnabled(env: TrackingGateEnv): boolean {
  if (env.disabled === "1") return false;
  return env.vercelEnv === "production" || env.preview === "1";
}

export type PageType = "home" | "contact" | "blog" | "service" | "location" | "other";

const PAGE_TYPE_PREFIXES: [string, PageType][] = [
  ["/contact", "contact"], ["/blog", "blog"], ["/services", "service"], ["/service", "service"],
  ["/locations", "location"], ["/location", "location"], ["/areas", "location"],
];

export function pageTypeFor(pathname: string): PageType {
  if (pathname === "/" || pathname === "") return "home";
  const path = pathname.toLowerCase();
  const hit = PAGE_TYPE_PREFIXES.find(([prefix]) => path.startsWith(prefix));
  return hit ? hit[1] : "other";
}

export interface CtaInput {
  /** Value of the nearest [data-mega-cta] attribute, or null when there is none. */
  ctaAttr: string | null;
  insideCta: boolean;
  isButton: boolean;
  /** The button carries aria-expanded, aria-haspopup or aria-controls. */
  toggle: boolean;
  /** Inside a [data-mega-ignore] region such as the consent banner. */
  ignored: boolean;
  text: string;
}

/**
 * A CTA is anything inside [data-mega-cta], or a button that is not a
 * disclosure or menu toggle. Only a non-empty attribute makes the label
 * source "attribute".
 */
export function ctaFor(input: CtaInput): { label: string; source: "attribute" | "fallback" } | null {
  if (input.ignored) return null;
  if (!input.insideCta && !(input.isButton && !input.toggle)) return null;
  const attr = input.insideCta ? clean(input.ctaAttr) : null;
  if (attr) return { label: attr, source: "attribute" };
  const text = clean(input.text);
  return text ? { label: text, source: "fallback" } : null;
}

export function superProperties(env: TrackingEnv): Record<string, string> {
  const props: Record<string, string> = {
    mega_tracking_version: String(TRACKING_CONTRACT_VERSION),
    mega_template: TRACKING_TEMPLATE,
    mega_env: env.vercelEnv || "development",
  };
  const siteId = env.siteId?.trim();
  if (siteId && UUID.test(siteId)) props.mega_site_id = siteId.toLowerCase();
  if (env.release) props.mega_release = env.release;
  if (env.pageType) props.mega_page_type = env.pageType;
  return props;
}
