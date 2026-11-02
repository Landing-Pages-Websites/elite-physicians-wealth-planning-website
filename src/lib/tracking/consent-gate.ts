export type ConsentMode = "strict" | "us-default";
export type ConsentState = "unset" | "accepted" | "declined";

/**
 * Whether analytics may run. "strict" is opt-in (only after Accept);
 * "us-default" is opt-out (allowed unless declined).
 */
export function consentGate(mode: ConsentMode, status: ConsentState): boolean {
  return mode === "strict" ? status === "accepted" : status !== "declined";
}
