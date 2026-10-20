/**
 * Preview deployments accept test leads only.
 *
 * On a deployment whose captcha cannot authenticate a human (the reCAPTCHA
 * staging bypass, a Cloudflare Turnstile test key, an unconfigured route) or
 * that is not production, anyone who finds the URL can post a lead, and
 * Keystone would deliver it to the customer's live recipients. Those
 * deployments exist for go-live QA, so the lead route admits a submission only
 * when Keystone will classify it as a test (see `leadsAreTestOnly` in
 * provider.ts for exactly when the gate applies): test leads are delivered to the internal test recipients and
 * never to the customer or their CRM.
 *
 * The matcher is deliberately the dispatch classifier's own rule
 * (`internal_email_domain` in megaseo-web `src/util/ad_lead_test_classification.ts`,
 * which `classifyLeadForDispatch` acts on): the email's domain is `gomega.ai` or
 * a subdomain of it. It is NOT the substring rule in `crm_test_lead_filter.ts`
 * (`email.includes("gomega.ai")`), which that file documents as not for
 * notifications. A substring match would admit `x@notgomega.ai`,
 * `x@gomega.ai.evil.com` and `gomega.ai@evil.com`, none of which dispatch
 * classifies as a test. Every address this accepts also satisfies the
 * substring rule, so the two classifiers cannot disagree on an admitted lead.
 *
 * Server-side only: importing `./provider` ships the staging sentinel.
 */
import { leadsAreTestOnly } from "./provider";

export const PREVIEW_TEST_EMAIL_DOMAIN = "gomega.ai";

/**
 * MEGA's own routing check promotes a test lead to the customer's PRODUCTION
 * recipients when `form_data` carries this key as boolean `true`
 * (`isMegaRoutingCheckLead`). A Preview lead must never ask for that. The lead
 * route forwards only string extras, so it cannot reach Keystone today; refusing
 * the key by presence keeps that true if the forwarding rule ever widens.
 */
export const ROUTING_CHECK_FORM_KEY = "__mega_routing_check";

export const PREVIEW_TEST_ONLY_ERROR =
  "This preview accepts test submissions only.";

/** Case-insensitive, whitespace-trimmed, exactly one `@`, domain gomega.ai or a subdomain. */
export function isPreviewTestEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length === 0) return false;
  return (
    domain === PREVIEW_TEST_EMAIL_DOMAIN ||
    domain.endsWith(`.${PREVIEW_TEST_EMAIL_DOMAIN}`)
  );
}

/**
 * Whether this submission must be refused before any verification or
 * forwarding. False on a production deployment with a real key, which is
 * unchanged.
 */
export function previewRefusesLead(
  payload: Record<string, unknown>,
  email: string,
): boolean {
  if (!leadsAreTestOnly()) return false;
  if (ROUTING_CHECK_FORM_KEY in payload) return true;
  return !isPreviewTestEmail(email);
}
