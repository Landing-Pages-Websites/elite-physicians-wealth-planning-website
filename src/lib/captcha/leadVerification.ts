/**
 * The verification gate for `/api/lead`.
 *
 * On a reCAPTCHA deployment, reCAPTCHA alone never drops a lead. It is served
 * by Google, so ad blockers, privacy browsers and corporate networks can block
 * it, and Google can return a verdict our checks reject (BROWSER_ERROR, a low
 * score). Each of those used to discard a real enquiry with no record. When
 * reCAPTCHA cannot vouch for a submission, a valid first-party proof-of-work
 * (single-use, see proofReplayGuard.ts) delivers it instead, labelled in
 * `form_data.spamCheck` so the customer can see it was not reCAPTCHA-verified.
 *
 * The preview bypass replaces ONLY token verification: a Preview request the
 * bypass does not accept (no token) takes the same proof-of-work verify, claim
 * and deliver sequence as production, so the claim is exercisable before launch.
 * A token the bypass accepts is delivered as before, with no `spamCheck` label.
 *
 * Turnstile and unconfigured deployments are unchanged: no fallback, and only
 * reCAPTCHA leads carry a `spamCheck` label.
 */

import { readCaptchaToken } from "../leadValidation";
import { verifyLeadProofOfWork } from "./proofOfWork";
import {
  configuredVerificationRoute,
  type VerificationRoute,
} from "./provider";
import {
  createProofReplayGuard,
  type ProofReplayGuard,
} from "./proofReplayGuard";
import { verifyCaptchaToken, type CaptchaResult } from "./verify";

export const SPAM_CHECK_RECAPTCHA = "Passed reCAPTCHA";
export const SPAM_CHECK_FALLBACK =
  "Unverified: reCAPTCHA did not pass; passed fallback check";
const UNVERIFIED_ERROR =
  "We couldn't verify this submission. Please try again or contact us directly.";

export type LeadVerification =
  { ok: true; spamCheck: string | null } | { ok: false; error: string };

export interface LeadVerificationDeps {
  readonly verifyToken?: typeof verifyCaptchaToken;
  readonly route?: () => VerificationRoute;
  /** Tests only: a fixed clock for proof freshness. */
  readonly now?: () => number;
  /** Tests only: an isolated guard. Production shares one per instance. */
  readonly replayGuard?: ProofReplayGuard;
  /** Tests only: a lower difficulty keeps table-driven suites fast. */
  readonly powDifficultyBits?: number;
}

const instanceReplayGuard = createProofReplayGuard();

/** What makes a fallback proof unique: its timestamp, its nonce and who sent it. */
function proofKey(payload: Record<string, unknown>): string {
  return JSON.stringify([payload.powIssuedAt, payload.powNonce, payload.email]);
}

function verifyToken(
  payload: Record<string, unknown>,
  remoteIp: string | null,
  deps: LeadVerificationDeps,
): Promise<CaptchaResult> {
  return (deps.verifyToken ?? verifyCaptchaToken)(
    readCaptchaToken(payload),
    "lead_submit",
    remoteIp,
  );
}

/**
 * On reCAPTCHA (and the Preview bypass that stands in for it) a verifier that
 * throws is one more way the challenge cannot vouch for the visitor, so the
 * fallback gets its chance. Every other route lets the throw propagate exactly
 * as it did before this gate existed.
 */
async function verifyRecaptchaOrReason(
  payload: Record<string, unknown>,
  remoteIp: string | null,
  deps: LeadVerificationDeps,
): Promise<CaptchaResult> {
  try {
    return await verifyToken(payload, remoteIp, deps);
  } catch {
    return { ok: false, error: UNVERIFIED_ERROR, reason: "verifier-threw" };
  }
}

/**
 * The proof-of-work fallback: valid, fresh and claimed exactly once, or null.
 * The proof covers the raw submitted strings, so it is checked against the
 * payload as received.
 */
async function claimFallbackProof(
  payload: Record<string, unknown>,
  deps: LeadVerificationDeps,
): Promise<"claimed" | string> {
  const now = deps.now?.() ?? Date.now();
  const valid = await verifyLeadProofOfWork(payload, payload.powNonce, {
    difficultyBits: deps.powDifficultyBits,
    now,
  });
  if (!valid) return "proof missing or invalid";
  const guard = deps.replayGuard ?? instanceReplayGuard;
  const claim = guard.consume(
    proofKey(payload),
    Number(payload.powIssuedAt),
    now,
  );
  return claim === "claimed" ? claim : `proof not claimable (${claim})`;
}

export async function verifyLeadSubmission(
  payload: Record<string, unknown>,
  remoteIp: string | null,
  deps: LeadVerificationDeps = {},
): Promise<LeadVerification> {
  const route = (deps.route ?? configuredVerificationRoute)();
  const hasFallback = route.kind === "recaptcha" || route.kind === "bypass";
  if (!hasFallback) {
    const challenge = await verifyToken(payload, remoteIp, deps);
    return challenge.ok
      ? { ok: true, spamCheck: null }
      : { ok: false, error: challenge.error };
  }
  const challenge = await verifyRecaptchaOrReason(payload, remoteIp, deps);
  if (challenge.ok) {
    return {
      ok: true,
      spamCheck: route.kind === "bypass" ? null : SPAM_CHECK_RECAPTCHA,
    };
  }

  const reason = challenge.reason ?? challenge.error;
  const outcome = await claimFallbackProof(payload, deps);
  if (outcome !== "claimed") {
    console.warn(
      `[lead] reCAPTCHA did not pass (${reason}); ${outcome}, lead rejected`,
    );
    return { ok: false, error: UNVERIFIED_ERROR };
  }
  console.warn(
    `[lead] reCAPTCHA did not pass (${reason}); lead accepted via proof-of-work fallback`,
  );
  return { ok: true, spamCheck: SPAM_CHECK_FALLBACK };
}
