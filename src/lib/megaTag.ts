import { analyticsAllowedNow } from "@/lib/consent";

declare global {
  interface Window {
    MegaTag?: {
      trackEvent?: (event: string, data: Record<string, string>) => void;
    };
  }
}

/**
 * The only way site code calls the MEGA optimizer tag. It sends nothing unless
 * the consent store allows analytics at the moment of the call, the same gate
 * as every other destination (src/lib/track.ts). A missing tag is a no-op.
 *
 * Whether the optimizer loader script itself loads before consent is not
 * decided here (src/app/layout.tsx).
 */
export function megaTagEvent(event: string, data: Record<string, string>): void {
  if (typeof window === "undefined" || !analyticsAllowedNow()) return;
  window.MegaTag?.trackEvent?.(event, data);
}
