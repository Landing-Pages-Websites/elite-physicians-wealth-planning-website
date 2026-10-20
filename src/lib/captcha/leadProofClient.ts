/**
 * Browser half of the proof-of-work fallback: fetch the server's timestamp,
 * then solve over the exact fields about to be sent.
 *
 * Never throws and never blocks a submission. If the timestamp request or the
 * solve fails (no Web Crypto in an old webview), the lead is sent without a
 * proof and still goes through whenever reCAPTCHA vouches for it.
 */

import { solveLeadProofOfWork } from "./proofOfWork";

export interface LeadProof {
  powIssuedAt: string;
  powNonce: string;
}

/** The server's clock, falling back to the device's if the request fails. */
async function fetchIssuedAt(): Promise<string> {
  try {
    const response = await fetch("/api/lead", { cache: "no-store" });
    const issuedAt = ((await response.json()) as { issuedAt?: unknown })
      .issuedAt;
    if (typeof issuedAt === "string") return issuedAt;
  } catch {
    // Fall through: a same-origin failure here usually fails the POST too.
  }
  return String(Date.now());
}

export async function solveLeadProof(
  fields: Readonly<Record<string, unknown>>,
  issuedAt: () => Promise<string> = fetchIssuedAt,
): Promise<LeadProof | null> {
  try {
    const powIssuedAt = await issuedAt();
    // Solved over the JSON round trip of what is sent, because that is exactly
    // what the server parses: a Date, a NaN or an undefined field would
    // otherwise bind differently on each side.
    const sent = JSON.parse(
      JSON.stringify({ ...fields, powIssuedAt }),
    ) as Record<string, unknown>;
    const powNonce = await solveLeadProofOfWork(sent);
    return { powIssuedAt, powNonce };
  } catch (error) {
    console.warn("Could not attach the lead fallback proof", error);
    return null;
  }
}
