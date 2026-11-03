import assert from "node:assert/strict";
import test from "node:test";
import { siteConfig } from "../site.config.ts";
import { setConsentStatus } from "./consent.ts";
import { megaTagEvent } from "./megaTag.ts";
import { resetQueueForTests } from "./tracking/queue.ts";
import { storageDouble } from "./__fixtures__/storage-double.ts";

type Mode = "us-default" | "strict";
interface Case {
  name: string;
  mode: Mode;
  stored: string | null;
  getThrows?: boolean;
  setThrows?: boolean;
  /** A choice made on this page before the call. */
  choose?: "accepted" | "declined";
  expected: number;
}

// A fresh window per case: the consent store keeps its memory per window.
function callsUnder(c: Case): number {
  const originalMode = siteConfig.consentMode;
  const originalWindow = (globalThis as { window?: unknown }).window;
  const target = new EventTarget();
  const calls: string[] = [];
  siteConfig.consentMode = c.mode;
  resetQueueForTests();
  (globalThis as { window?: unknown }).window = {
    localStorage: storageDouble(c.stored, { getThrows: c.getThrows, setThrows: c.setThrows }),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    MegaTag: { trackEvent: (e: string) => calls.push(e) },
  };
  try {
    if (c.choose) setConsentStatus(c.choose);
    megaTagEvent("form_submit", { form: "lead" });
    return calls.length;
  } finally {
    siteConfig.consentMode = originalMode;
    (globalThis as { window?: unknown }).window = originalWindow;
    resetQueueForTests();
  }
}

test("megaTag: calls MegaTag only when consent allows analytics at that moment", () => {
  const cases: Case[] = [
    { name: "us-default, unset", mode: "us-default", stored: null, expected: 1 },
    { name: "us-default, accepted", mode: "us-default", stored: "accepted", expected: 1 },
    { name: "us-default, declined", mode: "us-default", stored: "declined", expected: 0 },
    { name: "us-default, unrecognised stored value", mode: "us-default", stored: "denied", expected: 0 },
    { name: "us-default, declined on this page", mode: "us-default", stored: null, choose: "declined", expected: 0 },
    // No store can be read or written here, so an earlier decline may have been lost: declined in every mode.
    { name: "us-default, storage unreadable, no choice", mode: "us-default", stored: null, getThrows: true, setThrows: true, expected: 0 },
    { name: "us-default, storage failing, declined on this page", mode: "us-default", stored: null, getThrows: true, setThrows: true, choose: "declined", expected: 0 },
    { name: "us-default, writes failing, declined on this page", mode: "us-default", stored: null, setThrows: true, choose: "declined", expected: 0 },
    { name: "us-default, storage failing, accepted on this page", mode: "us-default", stored: null, getThrows: true, setThrows: true, choose: "accepted", expected: 1 },
    { name: "strict, unset", mode: "strict", stored: null, expected: 0 },
    { name: "strict, accepted", mode: "strict", stored: "accepted", expected: 1 },
    { name: "strict, declined", mode: "strict", stored: "declined", expected: 0 },
    { name: "strict, storage unreadable, no choice", mode: "strict", stored: null, getThrows: true, expected: 0 },
  ];
  for (const c of cases) assert.equal(callsUnder(c), c.expected, c.name);
});

test("megaTag: a page without the tag is a no-op, and a throwing tag is not swallowed", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const target = new EventTarget();
  const win: Record<string, unknown> = {
    localStorage: storageDouble("accepted"),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  (globalThis as { window?: unknown }).window = win;
  try {
    assert.doesNotThrow(() => megaTagEvent("form_submit", { form: "lead" }));
    win.MegaTag = {};
    assert.doesNotThrow(() => megaTagEvent("form_submit", { form: "lead" }));
    win.MegaTag = { trackEvent: () => { throw new Error("tag failed"); } };
    assert.throws(() => megaTagEvent("form_submit", { form: "lead" }), /tag failed/);
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

test("megaTag: no site code calls window.MegaTag except through megaTagEvent", async () => {
  const { execFileSync } = await import("node:child_process");
  const root = new URL("../..", import.meta.url).pathname;
  const out = execFileSync("git", ["grep", "--untracked", "-n", "-E", "MegaTag\\??(\\.|\\[)", "--", "src", ":!*.test.ts"], { cwd: root, encoding: "utf8" });
  const hits = out.trim().split("\n").filter(Boolean);
  assert.deepEqual(hits.map((h) => h.split(":")[0]), ["src/lib/megaTag.ts"], hits.join("\n"));
});
