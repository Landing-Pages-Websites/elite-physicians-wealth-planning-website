import assert from "node:assert/strict";
import test from "node:test";
import { siteConfig } from "./consent.ts";
import { reportCaptchaUnavailable } from "./captcha/telemetry.ts";
import { pushDataLayer, trackEvent } from "./track.ts";

type Entry = Record<string, unknown>;

// Every analytics destination write, run under one consent state.
function writesUnder(mode: "us-default" | "strict", stored: string | null) {
  const originalMode = siteConfig.consentMode;
  const originalWindow = (globalThis as { window?: unknown }).window;
  const dataLayer: Entry[] = [];
  const megaTag: string[] = [];
  siteConfig.consentMode = mode;
  (globalThis as { window?: unknown }).window = {
    dataLayer,
    localStorage: { getItem: () => stored },
    MegaTag: { trackEvent: (e: string) => megaTag.push(e) },
  };
  try {
    trackEvent("contact_click", { channel: "call" });
    pushDataLayer({ event: "form_submission" });
    reportCaptchaUnavailable("script_blocked", "turnstile");
    return { events: dataLayer.map((e) => e.event), megaTag };
  } finally {
    siteConfig.consentMode = originalMode;
    (globalThis as { window?: unknown }).window = originalWindow;
  }
}

const ALL = ["contact_click", "form_submission", "captcha_unavailable"];

test("no analytics destination is written without consent at that moment", () => {
  const cases: [string, "us-default" | "strict", string | null, string[]][] = [
    ["strict, unset", "strict", null, []],
    ["strict, declined", "strict", "declined", []],
    ["strict, accepted", "strict", "accepted", ALL],
    ["us-default, unset", "us-default", null, ALL],
    ["us-default, declined", "us-default", "declined", []],
    ["us-default, accepted", "us-default", "accepted", ALL],
  ];
  for (const [name, mode, stored, expected] of cases) {
    assert.deepEqual(writesUnder(mode, stored).events, expected, name);
  }
});

test("an event made before consent is not delivered when consent comes later", () => {
  const before = writesUnder("strict", null);
  const after = writesUnder("strict", "accepted");
  assert.deepEqual(before.events, []);
  assert.deepEqual(after.events, ALL, "only events made after accepting arrive");
});

test("MegaTag stays first-party and is not consent-gated", () => {
  assert.deepEqual(writesUnder("strict", "declined").megaTag, ["captcha_unavailable"]);
});
