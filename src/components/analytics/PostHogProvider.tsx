"use client";

import { useEffect } from "react";
import { getPostHogClient, setPostHogClient } from "@/lib/posthog-client";
import { subscribeAnalyticsReady } from "@/lib/analytics-readiness";

type LoadPostHog = () => Promise<Pick<typeof import("posthog-js"), "default">>;

async function initializePostHog(key: string, isCurrent: () => boolean, load: LoadPostHog): Promise<void> {
  try {
    const { default: posthog } = await load();
    if (!isCurrent()) return;
    const existing = getPostHogClient();
    if (existing) {
      if (existing.has_opted_out_capturing()) existing.opt_in_capturing({ captureEventName: false });
      return;
    }
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
      disable_session_recording: true,
    });
    setPostHogClient(posthog);
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing({ captureEventName: false });
  } catch (error: unknown) {
    console.error("PostHog analytics could not initialize", error);
  }
}

/** No sticky started flag: a cancelled import can never prevent reacceptance. */
export function startPostHogAnalytics(
  key: string,
  load: LoadPostHog = () => import("posthog-js"),
): () => void {
  return subscribeAnalyticsReady(
    (isCurrent) => { void initializePostHog(key, isCurrent, load); },
    () => { getPostHogClient()?.opt_out_capturing(); },
  );
}

/** Standard SDK loader, mounted only on the client with a provisioned public key. */
export function PostHogProvider(): null {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) return startPostHogAnalytics(key);
  }, []);
  return null;
}
