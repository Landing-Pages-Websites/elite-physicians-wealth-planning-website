import { installGaHitScrubber, reassertGaHitScrubber } from "./ga-transport";

interface GtagTarget {
  gtag?: (...args: unknown[]) => void;
}

interface GtagPage extends GtagTarget {
  dataLayer?: unknown[];
}

/** Every Google consent type, denied: nothing GA4 or ads-related may store or send. */
export const GA_DENIED = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

/**
 * The Consent Mode default: ad storage and processing are denied in every mode
 * and state; analytics storage follows the consent store (us-default unset is
 * granted, strict unset is denied, a decline is denied).
 */
export function gaConsentDefault(analyticsAllowed: boolean): Record<keyof typeof GA_DENIED, "granted" | "denied"> {
  return { ...GA_DENIED, analytics_storage: analyticsAllowed ? "granted" : "denied" };
}

/** Read at call time so tests can set it; Next still inlines the literal reference. */
export function ga4Id(): string | undefined {
  return process.env.NEXT_PUBLIC_GA4_ID;
}

/** gtag.js reads Arguments objects from the dataLayer, not arrays. */
function gtagCommand(...args: unknown[]): IArguments {
  void args;
  // eslint-disable-next-line prefer-rest-params
  return arguments;
}

// Pages whose dataLayer already holds the consent default.
const defaulted = new WeakSet<object>();

/**
 * Makes `consent default` the first gtag command this page ever holds, and is
 * the only place `gtag` is defined. Every path that writes to GA4 (our
 * dataLayer writer, configuration, consent updates) calls it first, so no
 * config, event or update can precede the default. Until gtag.js has loaded
 * the default goes in front of whatever is queued, including entries from a
 * gtag stub another script defined (gtag.js reads the queue in order). Once
 * gtag.js has loaded (it replaces dataLayer.push) it goes through gtag.
 */
export function ensureGaConsentDefault(page: GtagPage, id: string | undefined, allowedNow: () => boolean): void {
  if (!id?.trim() || defaulted.has(page)) return;
  defaulted.add(page);
  const dataLayer = (page.dataLayer ??= []);
  const command = gtagCommand("consent", "default", gaConsentDefault(allowedNow()));
  const gtagJsLoaded = dataLayer.push !== Array.prototype.push;
  if (!gtagJsLoaded) dataLayer.unshift(command);
  else if (page.gtag) page.gtag(...Array.from(command));
  else dataLayer.push(command);
  page.gtag ??= function gtag() {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };
}

/**
 * Applies a consent decision to GA4 in this page. Once gtag.js has loaded,
 * unmounting its <Script> does not stop it: enhanced measurement sends
 * page_view on route changes, scroll and outbound clicks straight from
 * gtag.js, never through our dataLayer gate. `ga-disable-<id>` stops every
 * hit for that property (and is honoured if gtag.js loads later); the consent
 * update stops cookieless pings too. An accept grants analytics storage only;
 * ad consent is never granted here.
 */
export function applyGaConsent(target: GtagPage, id: string | undefined, allowed: boolean): void {
  const property = id?.trim();
  // Without our property id there is nothing to disable or default; a gtag the
  // site runs itself still gets the update.
  if (property) (target as unknown as Record<string, unknown>)[`ga-disable-${property}`] = !allowed;
  try {
    if (property) ensureGaConsentDefault(target, property, () => allowed);
    target.gtag?.("consent", "update", allowed ? { analytics_storage: "granted" } : GA_DENIED);
  } catch {
    // The disable flag above already stops every hit; a broken gtag must not break the revoke.
  }
}

// Pages whose gtag.js has been configured: at most once per page.
const configured = new WeakSet<object>();

/**
 * Configures gtag.js once it is ready (next/script onReady), and only if the
 * consent store allows analytics at that moment. Configuring at render would
 * run even when a decline landed while gtag.js was still loading. A later
 * remount (after a re-accept) configures a page that was never configured.
 * In the browser the hit scrubber is installed first, so no GA4 hit (its
 * own page_view and every enhanced measurement event) carries a URL that has
 * not been through scrubUrl.
 */
export function configureGaOnce(page: GtagPage, id: string | undefined, allowedNow: () => boolean): void {
  const property = id?.trim();
  const browserPage = typeof window !== "undefined" && page === window;
  // Every configure re-asserts the transports, in case a library restored an original it captured.
  if (browserPage) reassertGaHitScrubber(window);
  if (!property || configured.has(page)) return;
  ensureGaConsentDefault(page, property, allowedNow);
  if (!allowedNow()) {
    applyGaConsent(page, property, false);
    return;
  }
  if (browserPage) installGaHitScrubber(window);
  page.gtag?.("js", new Date());
  page.gtag?.("config", property);
  configured.add(page);
}
