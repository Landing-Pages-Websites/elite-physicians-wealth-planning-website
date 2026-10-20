/**
 * Builds the claim a fallback proof presents to Keystone (see forwardLead.ts).
 * Returns undefined when the site has no claim credential, which the caller
 * treats as "cannot deliver" rather than "deliver unclaimed".
 */

import { randomUUID } from "node:crypto";
import type { ProofClaim } from "../forwardLead";

const TOKEN_ENV = "LEAD_PROOF_CLAIM_TOKEN";

const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The proof fields are read from the payload exactly as received, because the
 * proof covers the raw strings and Keystone derives the single-use digest from
 * the same three values. `attemptId` is minted here, once per inbound request.
 */
export function buildProofClaim(
  payload: Record<string, unknown>,
  env: Readonly<Record<string, string | undefined>> = process.env,
  newAttemptId: () => string = randomUUID,
): ProofClaim | undefined {
  // Trimmed and shape-checked: a pasted newline or a placeholder must read as
  // "not configured" (loud 502), not as a token Keystone rejects as 401.
  const token = text(env[TOKEN_ENV]?.trim());
  const validToken = token !== null && TOKEN_PATTERN.test(token);
  const issuedAt = text(payload.powIssuedAt);
  const nonce = text(payload.powNonce);
  const email = text(payload.email);
  if (!token || !validToken || !issuedAt || !nonce || !email) return undefined;
  return { issuedAt, nonce, email, attemptId: newAttemptId(), token };
}
