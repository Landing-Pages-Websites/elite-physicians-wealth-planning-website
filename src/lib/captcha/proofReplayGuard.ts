/**
 * Single-use enforcement for fallback proofs, within one server instance.
 *
 * reCAPTCHA tokens are single-use (a second assessment returns DUPE), so the
 * proof-of-work fallback must not let an identical captured request through
 * twice either. A proof is already bounded to LEAD_POW_MAX_AGE_MS by its
 * server-issued timestamp; this guard rejects a repeat inside that window.
 *
 * Scope is one warm instance, so this is a cheap first filter, NOT the
 * boundary. Single use across independent instances is enforced by Keystone,
 * which claims the proof in the transaction that records the lead (see
 * forwardLead.ts and megaseo-web docs/lead-proof-claims.md).
 *
 * `consume` is synchronous, so check-and-record cannot interleave with another
 * request on the same instance.
 */

import { createHash } from "node:crypto";
import { LEAD_POW_MAX_AGE_MS } from "./proofOfWork";

/**
 * Upper bound on remembered proofs, so a flood cannot grow memory without
 * limit. When it is reached the guard refuses NEW proofs rather than forgetting
 * unexpired ones: forgetting would make an unexpired proof reusable, which is
 * the exact replay this guard exists to stop. Filling it takes this many valid
 * solves inside one proof window on one instance, and reCAPTCHA-verified leads
 * never reach the guard, so a refusal only affects fallback submissions during
 * such a flood.
 */
export const MAX_REMEMBERED_PROOFS = 100_000;

/**
 * Keys are stored as fixed-size digests, so the cap bounds memory (about 10 MB
 * at capacity) no matter how long a submitted email is. The cap is high so
 * that exhausting it, which would switch the fallback off on this instance
 * until the flood expires, costs an attacker 100,000 solves per proof window.
 */
function digest(proofKey: string): string {
  return createHash("sha256").update(proofKey).digest("base64");
}

/** Why a proof was refused, for the server log. */
export type ProofClaim = "claimed" | "replay" | "capacity";

export interface ProofReplayGuard {
  /** "claimed" the first time a proof is seen inside its window, otherwise why not. */
  consume: (proofKey: string, issuedAt: number, now: number) => ProofClaim;
}

export function createProofReplayGuard(): ProofReplayGuard {
  const seen = new Map<string, number>();

  // Removes only entries whose proof has expired. `<`: at exactly expiresAt the
  // proof is still valid (age <= max age), so it must still be remembered.
  function evictExpired(now: number): void {
    for (const [key, expiresAt] of seen) {
      if (expiresAt < now) seen.delete(key);
    }
  }

  return {
    consume(proofKey, issuedAt, now) {
      const key = digest(proofKey);
      if (seen.size >= MAX_REMEMBERED_PROOFS) evictExpired(now);
      if (seen.has(key)) {
        // Deliberately checked after eviction: an expired entry no longer
        // matters, because verifyLeadProofOfWork already rejects a stale proof.
        return "replay";
      }
      if (seen.size >= MAX_REMEMBERED_PROOFS) return "capacity";
      seen.set(key, issuedAt + LEAD_POW_MAX_AGE_MS);
      return "claimed";
    },
  };
}
