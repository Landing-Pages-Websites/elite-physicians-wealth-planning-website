import assert from "node:assert/strict";
import test from "node:test";
import { consentGate, gaConsentLevel } from "./consent-gate.ts";

test("consentGate by mode and status", () => {
  const cases: [Parameters<typeof consentGate>[0], Parameters<typeof consentGate>[1], boolean][] = [
    ["strict", "unset", false], ["strict", "declined", false], ["strict", "accepted", true],
    ["us-default", "unset", true], ["us-default", "declined", false], ["us-default", "accepted", true],
  ];
  for (const [mode, status, expected] of cases) assert.equal(consentGate(mode, status), expected, `${mode}/${status}`);
});

test("gaConsentLevel: ads only for an explicit accept, in both modes", () => {
  const cases: [Parameters<typeof gaConsentLevel>[0], Parameters<typeof gaConsentLevel>[1], ReturnType<typeof gaConsentLevel>][] = [
    ["strict", "unset", "none"], ["strict", "declined", "none"], ["strict", "accepted", "all"],
    ["us-default", "unset", "analytics"], ["us-default", "declined", "none"], ["us-default", "accepted", "all"],
  ];
  for (const [mode, status, expected] of cases) assert.equal(gaConsentLevel(mode, status), expected, `${mode}/${status}`);
  // A status outside the type (a JS caller, a corrupted value) never grants ads.
  for (const mode of ["strict", "us-default"] as const) {
    for (const bogus of ["Accepted", "granted", "", undefined]) {
      assert.notEqual(gaConsentLevel(mode, bogus as unknown as "unset"), "all", `${mode}/${String(bogus)}`);
    }
  }
});
