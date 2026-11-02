import { trackingEnabled } from "./contract";

/** The values Vercel itself puts in VERCEL_ENV. Anything else is unknown. */
const VERCEL_ENVIRONMENTS = new Set(["production", "preview", "development"]);

export interface TrackingClientEnv {
  NEXT_PUBLIC_VERCEL_ENV: string;
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: string;
}

/**
 * The deployment values the browser bundle reads, inlined by next.config.ts
 * from the server-side VERCEL_* names Vercel sets on every build. Vercel's
 * NEXT_PUBLIC_ aliases exist only while the project has "Automatically expose
 * System Environment Variables" on, so they are never trusted: a stray or
 * hand-set NEXT_PUBLIC_VERCEL_ENV is overwritten, and a preview can never pass
 * itself off as production. Absent stays "", which the gate treats as off.
 */
export function trackingClientEnv(
  env: Record<string, string | undefined> = process.env,
): TrackingClientEnv {
  return {
    NEXT_PUBLIC_VERCEL_ENV: env.VERCEL_ENV ?? "",
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: env.VERCEL_GIT_COMMIT_SHA ?? "",
  };
}

/**
 * Why this build ships with tracking off, or null when it is on or was turned
 * off on purpose. next.config.ts prints it so a fail-closed build says so in
 * the build log instead of silently sending nothing.
 */
export function trackingBuildWarning(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const vercelEnv = trackingClientEnv(env).NEXT_PUBLIC_VERCEL_ENV;
  const enabled = trackingEnabled({
    disabled: env.NEXT_PUBLIC_MEGA_TRACKING_DISABLED,
    vercelEnv,
    preview: env.NEXT_PUBLIC_MEGA_TRACKING_PREVIEW,
  });
  if (enabled || env.NEXT_PUBLIC_MEGA_TRACKING_DISABLED === "1") return null;
  if (vercelEnv === "") {
    return "[tracking] VERCEL_ENV is not set, so this build ships with PostHog tracking OFF. Expected on a local build; on Vercel it means production will send nothing.";
  }
  if (!VERCEL_ENVIRONMENTS.has(vercelEnv)) {
    return `[tracking] VERCEL_ENV is "${vercelEnv}", which is not a Vercel environment, so this build ships with PostHog tracking OFF.`;
  }
  return null;
}
