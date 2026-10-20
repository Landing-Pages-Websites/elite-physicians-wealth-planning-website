"use client";

import { useEffect } from "react";
import { setPostHogClient } from "@/lib/posthog-client";
import { useConsent } from "@/components/consent/useConsent";

let started = false;

/** Standard SDK loader. Never renders or initializes without the public key. */
export function PostHogProvider(): null {
  const { analyticsAllowed } = useConsent();
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || !analyticsAllowed || started) return;
    started = true;
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: "identified_only",
        disable_session_recording: true,
      });
      setPostHogClient(posthog);
    }).catch((error: unknown) => {
      started = false;
      console.error("Analytics could not initialize", error);
    });
  }, [analyticsAllowed]);
  return null;
}
