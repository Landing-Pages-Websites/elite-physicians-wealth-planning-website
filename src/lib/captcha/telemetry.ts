import { megaTagEvent } from "@/lib/megaTag";
import { trackEvent } from "@/lib/track";

/** Captcha-only telemetry adapter for this legacy site's existing trackers. */
export type CaptchaUnavailableReason =
  | "unconfigured"
  | "script_blocked"
  | "render_failed"
  | "runtime_error"
  | "expired"
  | "execute_timeout"
  | "execute_failed";

/** Best-effort and PII-free. Does not install or initialize any analytics. */
export function reportCaptchaUnavailable(
  reason: CaptchaUnavailableReason,
  provider: "recaptcha" | "turnstile",
): void {
  if (typeof window === "undefined") return;
  try {
    megaTagEvent("captcha_unavailable", { reason, provider });
    // GA4 and PostHog only through the consent-gated path.
    trackEvent("captcha_unavailable", { reason, provider });
  } catch {
    // Analytics failure must never cost the visitor their enquiry or retry.
  }
}
