import { trackingEnabled } from "./contract";

/**
 * Resolved once per bundle. Each NEXT_PUBLIC_ name must stay a literal reference so Next inlines it.
 * NEXT_PUBLIC_VERCEL_ENV comes from next.config.ts (trackingClientEnv), derived from VERCEL_ENV.
 */
export const TRACKING_ENABLED: boolean = trackingEnabled({
  disabled: process.env.NEXT_PUBLIC_MEGA_TRACKING_DISABLED,
  vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
  preview: process.env.NEXT_PUBLIC_MEGA_TRACKING_PREVIEW,
});
