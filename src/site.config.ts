import type { ConsentMode } from "@/lib/tracking/consent-gate";

/**
 * Site configuration read by the site-starter tracking files, which import
 * `siteConfig` from here unchanged. This site keeps its identity in
 * src/lib/content.ts and its lead settings in src/lib/mega-config.ts, so only
 * the consent setting lives here.
 *
 * Cookie-consent behavior.
 * - "us-default": analytics load immediately; the banner is informational
 *   ("Accept cookies" / "Decline") and Decline is an opt-out.
 * - "strict": nothing loads until the visitor clicks Accept.
 */
export const siteConfig: { consentMode: ConsentMode } = { consentMode: "us-default" };
