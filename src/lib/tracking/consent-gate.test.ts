import assert from "node:assert/strict";
import test from "node:test";
import { consentGate } from "./consent-gate.ts";

test("consentGate by mode and status", () => {
  const cases: [Parameters<typeof consentGate>[0], Parameters<typeof consentGate>[1], boolean][] = [
    ["strict", "unset", false], ["strict", "declined", false], ["strict", "accepted", true],
    ["us-default", "unset", true], ["us-default", "declined", false], ["us-default", "accepted", true],
  ];
  for (const [mode, status, expected] of cases) assert.equal(consentGate(mode, status), expected, `${mode}/${status}`);
});
