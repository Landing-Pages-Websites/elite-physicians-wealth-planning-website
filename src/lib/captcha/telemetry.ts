/** Captcha-only telemetry adapter for this legacy site's existing trackers. */
export type CaptchaUnavailableReason =
  | "unconfigured"
  | "script_blocked"
  | "render_failed"
  | "runtime_error"
  | "expired"
  | "execute_timeout"
  | "execute_failed";

interface CaptchaTrackers {
  MegaTag?: {
    trackEvent?: (name: string, properties: Record<string, unknown>) => void;
  };
  posthog?: {
    capture: (name: string, properties: Record<string, unknown>) => void;
  };
}

/** Best-effort and PII-free. Does not install or initialize any analytics. */
export function reportCaptchaUnavailable(
  reason: CaptchaUnavailableReason,
  provider: "recaptcha" | "turnstile",
): void {
  if (typeof window === "undefined") return;
  try {
    const trackers = window as Window & CaptchaTrackers;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "captcha_unavailable", reason, provider });
    trackers.MegaTag?.trackEvent?.("captcha_unavailable", { reason, provider });
    trackers.posthog?.capture("captcha_unavailable", { reason, provider });
  } catch {
    // Analytics failure must never cost the visitor their enquiry or retry.
  }
}
