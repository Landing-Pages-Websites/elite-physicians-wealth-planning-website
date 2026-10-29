import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MEGA_PREVIEW_CSP, withMegaPreview } from "./preview_config.mjs";

const site = () => ({
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: "frame-ancestors 'none'" }, { key: "X-Site", value: "kept" }] }];
  },
  async rewrites() {
    return [{ source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" }, { source: "/old", destination: "/new" }];
  },
});
const flat = async (config) => (await config.headers()).flatMap((rule) => rule.headers.map((h) => `${h.key}: ${h.value}`));

describe("withMegaPreview", () => {
  it("returns the same object for a production build without preview mode", () => {
    const config = site();
    assert.equal(withMegaPreview(config, { NODE_ENV: "production" }), config);
  });

  it("adds the megabuild.ai dev origin only in development preview mode, keeping existing entries", () => {
    const dev = withMegaPreview({ ...site(), allowedDevOrigins: ["local.test"] }, { NODE_ENV: "development", MEGA_PREVIEW_MODE: "1" });
    assert.deepEqual(dev.allowedDevOrigins, ["local.test", "*.megabuild.ai"]);
    assert.equal(withMegaPreview(site(), { NODE_ENV: "production", MEGA_PREVIEW_MODE: "1" }).allowedDevOrigins, undefined);
  });

  it("returns the same object in development without preview mode", () => {
    const config = { ...site(), allowedDevOrigins: ["local.test"] };
    assert.equal(withMegaPreview(config, { NODE_ENV: "development" }), config);
    assert.equal(withMegaPreview(config, { NODE_ENV: "development", MEGA_PREVIEW_MODE: " 1" }), config);
  });

  it("sets the preview headers and removes the site's framing headers in preview mode", async () => {
    const lines = await flat(withMegaPreview(site(), { NODE_ENV: "development", MEGA_PREVIEW_MODE: "1" }));
    assert.ok(lines.includes(`Content-Security-Policy: ${MEGA_PREVIEW_CSP}`));
    assert.ok(lines.includes("Cache-Control: no-store"));
    assert.ok(lines.some((line) => line.startsWith("Permissions-Policy: camera=()")));
    assert.ok(lines.includes("X-Site: kept"));
    assert.ok(!lines.some((line) => line.startsWith("X-Frame-Options")));
    assert.equal(lines.filter((line) => line.startsWith("Content-Security-Policy")).length, 1);
    assert.ok(!MEGA_PREVIEW_CSP.includes("frame-ancestors"));
  });

  for (const [name, rewrites] of [
    ["the array form", async () => [{ source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" }, { source: "/old", destination: "/new" }]],
    ["the object form", async () => ({ beforeFiles: [{ source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" }], afterFiles: [{ source: "/old", destination: "/new" }], fallback: [] })],
  ]) {
    it(`drops external rewrites in preview mode (${name})`, async () => {
      const result = await withMegaPreview({ ...site(), rewrites }, { NODE_ENV: "development", MEGA_PREVIEW_MODE: "1" }).rewrites();
      const all = Array.isArray(result) ? result : [...result.beforeFiles, ...result.afterFiles, ...result.fallback];
      assert.deepEqual(all.map((rule) => rule.destination), ["/new"]);
    });
  }

  it("works for a config with no headers or rewrites", async () => {
    const config = withMegaPreview({}, { NODE_ENV: "development", MEGA_PREVIEW_MODE: "1" });
    assert.ok((await flat(config)).includes("Cache-Control: no-store"));
    assert.deepEqual(await config.rewrites(), []);
  });
});
