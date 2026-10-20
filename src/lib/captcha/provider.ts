/**
 * The staging bypass, and the server's entry points to the routing rule.
 *
 * The rule itself lives in route-rule.ts, which never states the sentinel, so
 * the browser can share it. Everything it exports is re-exported here, so
 * existing importers are unchanged.
 */
import {
  configuredCaptchaProvider,
  routeWith,
  type ProviderResolution,
  type VerificationRoute,
} from "./route-rule";

export {
  NOT_CONFIGURED_ERROR,
  configuredCaptchaProvider,
  resolveCaptchaProvider,
  type CaptchaProvider,
  type ProviderResolution,
  type VerificationRoute,
} from "./route-rule";

/**
 * The preview-only sentinel. `/api/lead` accepts any non-empty token when the
 * configured site key is EXACTLY this, which is what lets go-live QA and the
 * form-registration `curl` submit without solving a challenge. `/api/lead`
 * admits a bypassed submission only for a test contact (previewLeadGate.ts), so
 * a Preview lead can never reach a customer.
 *
 * Production carries a real key, so the bypass branch is unreachable there by
 * construction rather than by configuration. Three separate guards keep it that
 * way: the provisioner refuses to write this to a production target, the go-live
 * sweep fails production when the served bundle contains it, and provisioning
 * row 8.6 compares the served key against the effective production key.
 */
export const STAGING_BYPASS_SITE_KEY = "recaptcha-staging-bypass-key";

/**
 * Exact match only, after trimming. A key that merely CONTAINS the sentinel is
 * not the sentinel: the bypass is safe only because "production never holds
 * this value" is checkable by inspection, and substring matching would make a
 * real key starting with these bytes silently bypass the challenge.
 */
export function isStagingBypassSiteKey(siteKey: string | undefined): boolean {
  return siteKey?.trim() === STAGING_BYPASS_SITE_KEY;
}

/**
 * Which captcha this deployment uses — the ONE rule (route-rule.ts), with the
 * real staging sentinel. Server-side only: importing this module ships
 * `STAGING_BYPASS_SITE_KEY` to every visitor.
 */
export function routeVerification(input: {
  readonly provider: ProviderResolution;
  readonly recaptchaSiteKey: string | undefined;
}): VerificationRoute {
  return routeWith(input, isStagingBypassSiteKey);
}

/** The route this deployment resolves to, from its own configuration. */
export function configuredVerificationRoute(): VerificationRoute {
  return routeVerification({
    provider: configuredCaptchaProvider(),
    recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  });
}

/**
 * Cloudflare's documented Turnstile test keys. Every one of them fails to
 * authenticate a human: the always-pass keys accept anything, the always-block
 * keys and the "token already spent" secret reject everything, and the
 * forced-interactive key is a test widget. A deployment holding any of them as
 * its site key OR its secret is not protected by a real challenge.
 *
 * ONE list, here and nowhere else in the lead path. Server-side only for the
 * same reason as the sentinel: the production go-live sweep fails any bundle
 * containing these, so the browser must never import them.
 */
export const CLOUDFLARE_TURNSTILE_TEST_SITE_KEYS: readonly string[] = [
  "1x00000000000000000000AA", // always passes, visible
  "2x00000000000000000000AB", // always blocks, visible
  "1x00000000000000000000BB", // always passes, invisible
  "2x00000000000000000000BB", // always blocks, invisible
  "3x00000000000000000000FF", // forces an interactive challenge
];
export const CLOUDFLARE_TURNSTILE_TEST_SECRET_KEYS: readonly string[] = [
  "1x0000000000000000000000000000000AA", // always passes
  "2x0000000000000000000000000000000AA", // always fails
  "3x0000000000000000000000000000000AA", // yields "token already spent"
];

/** Case-insensitive on purpose: a lookalike casing may only widen the gate. */
function isListedKey(value: string | undefined, list: readonly string[]): boolean {
  const key = value?.trim().toLowerCase() ?? "";
  return key.length > 0 && list.some((listed) => listed.toLowerCase() === key);
}

export function isCloudflareTestSiteKey(siteKey: string | undefined): boolean {
  return isListedKey(siteKey, CLOUDFLARE_TURNSTILE_TEST_SITE_KEYS);
}

export function isCloudflareTestSecretKey(secret: string | undefined): boolean {
  return isListedKey(secret, CLOUDFLARE_TURNSTILE_TEST_SECRET_KEYS);
}

/** Vercel injects VERCEL_ENV; anything set and not "production" is not production. */
function isNonProductionDeployment(vercelEnv: string | undefined): boolean {
  const value = vercelEnv?.trim().toLowerCase() ?? "";
  return value.length > 0 && value !== "production";
}

/**
 * Whether this deployment's lead route may only take test leads.
 *
 * True whenever its captcha cannot authenticate a human, or the deployment is
 * not production: the reCAPTCHA staging sentinel, any Cloudflare Turnstile test
 * site key or secret, a route that resolves to `reject` (unconfigured or an
 * unrecognised provider), or a non-production deployment holding any key at
 * all (a Preview is test-only, period). Fails closed: only a production
 * (or non-Vercel) deployment with a real key is left alone.
 */
export function leadsAreTestOnly(): boolean {
  const route = configuredVerificationRoute();
  if (route.kind === "bypass" || route.kind === "reject") return true;
  if (isNonProductionDeployment(process.env.VERCEL_ENV)) return true;
  if (route.kind !== "turnstile") return false;
  return (
    isCloudflareTestSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ||
    isCloudflareTestSecretKey(
      process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET,
    )
  );
}
