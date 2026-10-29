// src/mega-preview/preview_identity.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readMegaPreviewIdentity } from "./preview_identity.mjs";

const SHA = "a".repeat(40);
const reading = (text) => async () => {
  if (text instanceof Error) throw text;
  return text;
};

describe("readMegaPreviewIdentity", () => {
  const rows = [
    ["a recorded commit", JSON.stringify({ commitSha: SHA }), SHA],
    ["a move in progress", JSON.stringify({ commitSha: null }), null],
    ["no file", Object.assign(new Error("ENOENT"), { code: "ENOENT" }), null],
    ["not JSON", "{", null],
    ["an uppercase sha", JSON.stringify({ commitSha: SHA.toUpperCase() }), null],
    ["a short sha", JSON.stringify({ commitSha: "a".repeat(39) }), null],
    ["a sha with a newline", JSON.stringify({ commitSha: `${SHA}\n` }), null],
    ["a number", JSON.stringify({ commitSha: 1 }), null],
    ["an array", JSON.stringify([SHA]), null],
    ["JSON null", "null", null],
  ];
  for (const [name, text, expected] of rows) {
    it(`${name} reads ${expected}`, async () => {
      assert.equal(await readMegaPreviewIdentity("/w", reading(text)), expected);
    });
  }
});
