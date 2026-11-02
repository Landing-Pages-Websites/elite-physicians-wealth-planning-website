import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { trackingClientEnv, trackingBuildWarning } from "./client-env.ts";
import { trackingEnabled } from "./contract.ts";

/** The gate exactly as src/lib/tracking/enabled.ts evaluates it in the bundle. */
const gate = (env: Record<string, string | undefined>): boolean =>
  trackingEnabled({
    disabled: env.NEXT_PUBLIC_MEGA_TRACKING_DISABLED,
    vercelEnv: trackingClientEnv(env).NEXT_PUBLIC_VERCEL_ENV,
    preview: env.NEXT_PUBLIC_MEGA_TRACKING_PREVIEW,
  });

const cases: [name: string, env: Record<string, string | undefined>, enabled: boolean][] = [
  ["production build without the public alias tracks", { VERCEL_ENV: "production" }, true],
  ["production build with the alias too tracks", { VERCEL_ENV: "production", NEXT_PUBLIC_VERCEL_ENV: "production" }, true],
  ["preview build does not track", { VERCEL_ENV: "preview" }, false],
  ["development build does not track", { VERCEL_ENV: "development" }, false],
  ["local build with no VERCEL_ENV does not track", {}, false],
  ["a stray public alias cannot promote a preview build", { VERCEL_ENV: "preview", NEXT_PUBLIC_VERCEL_ENV: "production" }, false],
  ["a stray public alias cannot promote a local build", { NEXT_PUBLIC_VERCEL_ENV: "production" }, false],
  ["unknown casing fails closed", { VERCEL_ENV: "Production" }, false],
  ["padded value fails closed", { VERCEL_ENV: " production" }, false],
  ["empty value fails closed", { VERCEL_ENV: "" }, false],
  ["disabled wins over production", { VERCEL_ENV: "production", NEXT_PUBLIC_MEGA_TRACKING_DISABLED: "1" }, false],
  ["disabled wins over preview opt-in", { NEXT_PUBLIC_MEGA_TRACKING_PREVIEW: "1", NEXT_PUBLIC_MEGA_TRACKING_DISABLED: "1" }, false],
  ["preview opt-in tracks on a local build", { NEXT_PUBLIC_MEGA_TRACKING_PREVIEW: "1" }, true],
];

for (const [name, env, enabled] of cases) {
  test(`tracking client env: ${name}`, () => {
    assert.equal(gate(env), enabled, name);
  });
}

test("tracking client env: the release is derived from VERCEL_GIT_COMMIT_SHA, never the alias", () => {
  assert.equal(trackingClientEnv({ VERCEL_GIT_COMMIT_SHA: "abc123" }).NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA, "abc123");
  assert.equal(trackingClientEnv({ NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "stray" }).NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA, "");
});

test("tracking client env: a build that fails closed without being told to says so", () => {
  assert.match(trackingBuildWarning({}) ?? "", /VERCEL_ENV is not set/);
  assert.match(trackingBuildWarning({ VERCEL_ENV: "Production" }) ?? "", /not a Vercel environment/);
  for (const env of [
    { VERCEL_ENV: "production" },
    { VERCEL_ENV: "preview" },
    { NEXT_PUBLIC_MEGA_TRACKING_PREVIEW: "1" },
    { NEXT_PUBLIC_MEGA_TRACKING_DISABLED: "1" },
  ]) {
    assert.equal(trackingBuildWarning(env), null, JSON.stringify(env));
  }
});

test("tracking client env: next.config.ts inlines the derived values", () => {
  const src = readFileSync(new URL("../../../next.config.ts", import.meta.url), "utf8");
  assert.match(src, /\.\.\.trackingClientEnv\(\)/);
  assert.match(src, /trackingBuildWarning\(\)/);
});
