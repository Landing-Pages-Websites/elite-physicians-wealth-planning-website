"use client";

import Script from "next/script";
import { useEffect, useState, type ReactElement } from "react";
import { subscribeAnalyticsReady } from "@/lib/analytics-readiness";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const configured = new Set<string>();

// This queue exists before SDK readiness so successful early leads remain queued.
const QUEUE_BOOTSTRAP = `window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};`;

function prepareQueue(): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    // gtag uses Arguments objects, alongside the site's plain-object form events.
    // eslint-disable-next-line prefer-rest-params -- Google requires its standard Arguments queue format.
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>);
  };
}

export function startGoogleAnalytics(id: string, setReady: (ready: boolean) => void): () => void {
  prepareQueue();
  return subscribeAnalyticsReady(() => {
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    if (!configured.has(id)) {
      configured.add(id);
      window.gtag?.("js", new Date());
      window.gtag?.("config", id);
    }
    setReady(true);
  }, () => {
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
    setReady(false);
  });
}

/** Keep the standard gtag URL/ID and bootstrap; defer only SDK execution. */
export function GoogleAnalytics(): ReactElement | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (GA4_ID) return startGoogleAnalytics(GA4_ID, setReady);
  }, []);
  if (!GA4_ID || !ready) return null;
  return (
    <>
      <Script id="ga4-init" strategy="afterInteractive">{QUEUE_BOOTSTRAP}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
    </>
  );
}
