// src/mega-preview/preview_sink.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MEGA_PREVIEW_SINK_BODY, megaPreviewSink } from "./preview_sink.mjs";

const PREVIEW = { MEGA_PREVIEW_MODE: "1" };
const req = (method, path, headers = {}) => new Request(`https://saved-0123456789abcdef0123456789abcdef.megabuild.ai${path}`, { method, headers });

describe("megaPreviewSink", () => {
  const sunk = [
    ["POST", "/api/lead"], ["POST", "/api/lead/"], ["PUT", "/api/lead"], ["POST", "/api/contact"], ["POST", "/invented-route"],
    ["POST", "/get-a-quote", { "next-action": "abc" }], ["PATCH", "/api/booking"], ["DELETE", "/api/anything"],
    ["POST", "/ingest/e/"], ["GET", "/ingest/static/array.js"], ["GET", "/ingest"], ["POST", "/API/LEAD"],
    ["GET", "/%69ngest/e/"], ["GET", "//ingest/e/"], ["POST", "//api//lead"], ["POST", "/api/%6Cead"], ["GET", "/%E0%A4%A"],
    ["POST", "/_next/%2e%2e/api/lead"], ["POST", "/_next/..%2Fapi/lead"], ["POST", "/__nextjs/../api/lead"],
    ["PROPFIND", "/"],
    ["POST", "/_NEXT/x", { "next-action": "abc" }], ["POST", "/%5Fnext/x", { "next-action": "abc" }], ["POST", "/__nextjsfoo", { "next-action": "abc" }],
    ["POST", "/_next%2Fx", { "next-action": "abc" }], ["POST", "/__NEXTJS_x"], ["POST", "/"],
  ];
  for (const [method, path, headers] of sunk) {
    it(`sinks ${method} ${path}`, async () => {
      const response = megaPreviewSink(req(method, path, headers), PREVIEW);
      assert.ok(response);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-mega-preview-sink"), "1");
      assert.equal(await response.text(), MEGA_PREVIEW_SINK_BODY);
    });
  }

  const passed = [["GET", "/"], ["GET", "/services"], ["HEAD", "/"], ["OPTIONS", "/api/lead"], ["GET", "/api/mega-preview/identity"], ["POST", "/_next/data/x.json"], ["POST", "/__nextjs_original-stack-frames"], ["POST", "/__nextjs_source-map"], ["GET", "/ingestion-guide"]];
  for (const [method, path] of passed) {
    it(`passes ${method} ${path} through`, () => {
      assert.equal(megaPreviewSink(req(method, path), PREVIEW), null);
    });
  }

  for (const env of [{}, { MEGA_PREVIEW_MODE: "0" }, { MEGA_PREVIEW_MODE: "true" }, { MEGA_PREVIEW_MODE: "TRUE" }, { MEGA_PREVIEW_MODE: " 1" }, { MEGA_PREVIEW_MODE: "1 " }, { MEGA_PREVIEW_MODE: "1\n" }]) {
    it(`does nothing outside preview mode (${JSON.stringify(env)})`, () => {
      assert.equal(megaPreviewSink(req("POST", "/api/lead"), env), null);
    });
  }
});
