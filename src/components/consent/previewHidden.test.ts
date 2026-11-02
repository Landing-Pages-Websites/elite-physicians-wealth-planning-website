import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { consentHiddenInPreview } from "./previewHidden";

test("hidden only when the preview flag is exactly 1", () => {
  assert.equal(consentHiddenInPreview("1"), true);
  for (const v of [undefined, "", "0", "true", " 1", "1 ", "11", "yes"]) {
    assert.equal(consentHiddenInPreview(v), false, String(v));
  }
});

test("the default reads the literal Next inlines", () => {
  const src = readFileSync(new URL("./previewHidden.ts", import.meta.url), "utf8");
  assert.match(src, /= process\.env\.NEXT_PUBLIC_MEGA_PREVIEW_MODE\b/);
});

test("the banner asks after its hook and carries the kit's hide marker", () => {
  const src = readFileSync(new URL("./ConsentBanner.tsx", import.meta.url), "utf8");
  assert.ok(src.indexOf("useConsent()") < src.indexOf("consentHiddenInPreview()"));
  assert.match(src, /data-mega-preview-hide/);
  assert.match(src, /aria-label="Cookie consent"/);
});

test("no live config sets the preview flag", () => {
  for (const f of [".env", ".env.example", ".env.production", "vercel.json"]) {
    try {
      const text = readFileSync(new URL(`../../../${f}`, import.meta.url), "utf8");
      assert.doesNotMatch(text, /NEXT_PUBLIC_MEGA_PREVIEW_MODE/, f);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
});
