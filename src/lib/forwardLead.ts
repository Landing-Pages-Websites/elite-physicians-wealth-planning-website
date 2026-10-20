import { siteConfig } from "@/lib/mega-config";
import { UPLOAD_KEYS_FIELD } from "@/lib/leadUploads";
import type { LeadContext } from "@/lib/megaLeadContext";
import type { ValidatedLeadFields } from "@/lib/leadValidation";

const SUBMIT_ENDPOINT = "https://analytics.gomega.ai/submission/submit";

export interface KeystoneSubmitResult {
  ok: boolean;
  id?: string;
}

/**
 * What a fallback proof-of-work claims at the receiver (Keystone), which is the
 * one place every serving instance meets. `issuedAt`, `nonce` and `email` are
 * the exact proof fields the visitor solved; `attemptId` is one value per
 * inbound request, reused by this module's own forward retries so a retry of a
 * lost response returns the original lead instead of a replay refusal.
 */
export interface ProofClaim {
  readonly issuedAt: string;
  readonly nonce: string;
  readonly email: string;
  readonly attemptId: string;
  readonly token: string;
}

/** The receiver refused this proof for good: do not retry, do not deliver. */
export class ProofClaimRefusedError extends Error {
  constructor(readonly status: number) {
    super(`Keystone refused the proof claim (HTTP ${status})`);
  }
}

/** The claim could not be established; nothing may be delivered. */
export class ProofClaimUnavailableError extends Error {}

const PROOF_CLAIM_TOKEN_HEADER = "x-mega-proof-claim-token";
const PROOF_CLAIM_REFUSAL_STATUSES: ReadonlySet<number> = new Set([
  400, 401, 403, 409,
]);
const PROOF_CLAIM_RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  500, 502, 503, 504,
]);
/**
 * Each forward attempt. Generous on purpose: Keystone answers only after its
 * notifications finish, and a caller that gives up early leaves them unfinished
 * on the retry's "original outcome" path.
 */
export const PROOF_FORWARD_TIMEOUT_MS = 25_000;
/** Total attempts for a proof-claiming forward; all carry the same attempt id. */
export const PROOF_FORWARD_MAX_ATTEMPTS = 2;

export interface ForwardTransport {
  readonly fetch?: typeof fetch;
}

export async function forwardLeadToKeystone(
  fields: ValidatedLeadFields,
  context: LeadContext,
  formKey: string,
  proofClaim?: ProofClaim,
  transport: ForwardTransport = {},
): Promise<KeystoneSubmitResult> {
  const payload = {
    ...context,
    customer_id: siteConfig.megaCustomerId,
    site_id: siteConfig.megaSiteId,
    source_provider: siteConfig.sourceProvider,
    // Top level, never inside form_data: MEGA strips a `form_key` found there
    // so a visitor cannot type into a field of that name and pick which of the
    // customer's inboxes receives their submission.
    form_key: formKey,
    form_data: {
      firstName: fields.firstName,
      lastName: fields.lastName,
      email: fields.email,
      phone: fields.phone,
      ...fields.extra,
      // Spread last and only when present, so the reserved field cannot be
      // shadowed by an extra and an ordinary submission carries no empty array
      // for MEGA's notification email to render as a field.
      ...(fields.uploadKeys.length > 0
        ? { [UPLOAD_KEYS_FIELD]: fields.uploadKeys }
        : {}),
    },
  };

  if (proofClaim) {
    return forwardWithProofClaim(payload, proofClaim, transport.fetch ?? fetch);
  }

  const response = await fetch(SUBMIT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Keystone HTTP ${response.status}`);
  }

  return parseSubmitResult(await response.json());
}

function parseSubmitResult(json: unknown): KeystoneSubmitResult {
  if (
    typeof json !== "object" ||
    json === null ||
    !("ok" in json) ||
    (json as { ok: unknown }).ok !== true
  ) {
    throw new Error("Keystone rejected the submission");
  }
  const id =
    "id" in json && typeof (json as { id: unknown }).id === "string"
      ? (json as { id: string }).id
      : undefined;
  return { ok: true, id };
}

function claimMarker(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const marker = (json as { proof_claim?: unknown }).proof_claim;
  return typeof marker === "string" ? marker : null;
}

/**
 * Forwards a lead that carries a proof claim. Single use is enforced by the
 * receiver in the transaction that records the lead, so this module only has
 * to be unambiguous about outcomes:
 *  - a 2xx counts ONLY with the receiver's `proof_claim` marker; a receiver
 *    that never looked at the claim answers 200 too, and that is not a claim;
 *  - 400/401/403/409 are final refusals of this proof;
 *  - timeouts, network errors and 5xx are retried with the SAME attempt id and
 *    the SAME body bytes, which the receiver answers with the original lead;
 *  - anything still unresolved after the last attempt is "unavailable".
 */
async function forwardWithProofClaim(
  payload: Record<string, unknown>,
  proofClaim: ProofClaim,
  doFetch: typeof fetch,
): Promise<KeystoneSubmitResult> {
  const body = JSON.stringify({
    ...payload,
    proof_claim: {
      issued_at: proofClaim.issuedAt,
      nonce: proofClaim.nonce,
      email: proofClaim.email,
      attempt_id: proofClaim.attemptId,
    },
  });
  let lastFailure = "no attempt made";
  for (let attempt = 1; attempt <= PROOF_FORWARD_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await doFetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [PROOF_CLAIM_TOKEN_HEADER]: proofClaim.token,
        },
        body,
        signal: AbortSignal.timeout(PROOF_FORWARD_TIMEOUT_MS),
      });
      if (PROOF_CLAIM_REFUSAL_STATUSES.has(response.status)) {
        throw new ProofClaimRefusedError(response.status);
      }
      if (response.ok) return await readClaimedResult(response);
      lastFailure = `HTTP ${response.status}`;
      if (!PROOF_CLAIM_RETRYABLE_STATUSES.has(response.status)) break;
    } catch (error) {
      if (error instanceof ProofClaimRefusedError) throw error;
      if (error instanceof ProofClaimUnavailableError) throw error;
      lastFailure = error instanceof Error ? error.message : "transport error";
    }
  }
  throw new ProofClaimUnavailableError(`Keystone proof claim: ${lastFailure}`);
}

async function readClaimedResult(
  response: Response,
): Promise<KeystoneSubmitResult> {
  const json: unknown = await response.json();
  const marker = claimMarker(json);
  if (marker !== "claimed" && marker !== "retry") {
    throw new ProofClaimUnavailableError(
      "Keystone answered without a proof claim marker",
    );
  }
  return parseSubmitResult(json);
}
