export type ConsentMode = "strict" | "us-default";
export type ConsentState = "unset" | "accepted" | "declined";

/**
 * What Google Consent Mode may grant:
 * - "none": nothing;
 * - "analytics": analytics storage only;
 * - "all": every consent type, ads included.
 */
export type GaConsentLevel = "none" | "analytics" | "all";

/**
 * Whether analytics may run. "strict" is opt-in (only after Accept);
 * "us-default" is opt-out (allowed unless declined).
 */
export function consentGate(mode: ConsentMode, status: ConsentState): boolean {
  return mode === "strict" ? status === "accepted" : status !== "declined";
}

/**
 * The Google consent level for a consent status. Ads are granted only for
 * "accepted", the store's canonical explicit Accept (a decline, an
 * unrecognised, conflicting or unreadable store, and a choice nothing here can
 * keep all read as "declined"; no choice is "unset"). Everything else follows
 * the analytics gate with ads denied.
 */
export function gaConsentLevel(mode: ConsentMode, status: ConsentState): GaConsentLevel {
  if (status === "accepted") return "all";
  return consentGate(mode, status) ? "analytics" : "none";
}
