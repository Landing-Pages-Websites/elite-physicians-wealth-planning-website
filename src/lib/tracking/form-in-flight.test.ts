import assert from "node:assert/strict";
import test from "node:test";
import { FORM_IN_FLIGHT_MAX_MS, FormSession, leaveAll } from "./form-session.ts";

/**
 * A form that handles its own submit, step by step, on a fake clock:
 * "submitting" / "succeeded" / "failed" are markFormSubmitting /
 * markFormSubmitted / markFormSubmitFailed; "hide" and "leave" are the tab
 * hiding and pagehide (or a route change); a number advances the clock.
 */
type Step = "focus" | "submitting" | "succeeded" | "failed" | "hide" | "leave" | number;

/** Every abandon reported, in order, as its reason. */
function run(steps: Step[]): string[] {
  const session = new FormSession("f", "/contact");
  let now = 1_000;
  const reasons: string[] = [];
  const record = (calls: { properties: Record<string, string> }[]) =>
    reasons.push(...calls.map((c) => c.properties.reason));
  for (const step of steps) {
    if (typeof step === "number") now += step;
    else if (step === "focus") session.focus("email");
    else if (step === "submitting") session.submitting(now);
    else if (step === "succeeded") session.submitted();
    else if (step === "failed") record(session.submitFailed(now));
    else record(leaveAll([session], step === "hide" ? "hidden" : "left", now));
  }
  return reasons;
}

const JUST_UNDER = FORM_IN_FLIGHT_MAX_MS - 1;

const cases: [name: string, steps: Step[], abandons: string[]][] = [
  ["in flight then leave (form navigates itself) is neither abandon nor submit", ["focus", "submitting", "leave"], []],
  ["in flight then hide is neither abandon nor submit", ["focus", "submitting", "hide"], []],
  ["success then leave sends nothing", ["focus", "submitting", "succeeded", "leave"], []],
  ["in flight, leave, then success sends nothing", ["focus", "submitting", "leave", "succeeded", "leave"], []],
  ["failure then leave abandons", ["focus", "submitting", "failed", "leave"], ["left"]],
  ["hide while in flight, then failure, reports the held abandon once", ["focus", "submitting", "hide", "failed", "leave"], ["hidden"]],
  ["hide then pagehide while in flight, then failure, reports the first reason", ["focus", "submitting", "hide", "leave", "failed"], ["hidden"]],
  ["failure with no held leave sends nothing until the visitor leaves", ["focus", "submitting", "failed"], []],
  ["failure then a retry that succeeds sends nothing", ["focus", "submitting", "failed", "submitting", "succeeded", "leave"], []],
  ["two submissions in flight: one failing keeps the other's leave held", ["focus", "submitting", "submitting", "hide", "failed"], []],
  ["two submissions in flight: both failing report the held abandon", ["focus", "submitting", "submitting", "hide", "failed", "failed"], ["hidden"]],
  ["a failure reported twice for one submission cannot go negative", ["focus", "submitting", "failed", "failed", "submitting", "leave"], []],
  ["a failure with nothing in flight is ignored", ["focus", "failed", "submitting", "leave"], []],
  ["a failure after success does not reopen the session", ["focus", "submitting", "succeeded", "failed", "leave"], []],
  ["submitting after success is ignored", ["focus", "succeeded", "submitting", "leave"], []],
  ["timeout: no answer within the limit, then leave, abandons", ["focus", "submitting", FORM_IN_FLIGHT_MAX_MS, "leave"], ["left"]],
  ["timeout: leaving just under the limit is still held", ["focus", "submitting", JUST_UNDER, "leave"], []],
  ["timeout: a held leave is dropped at expiry, a later leave abandons", ["focus", "submitting", "hide", FORM_IN_FLIGHT_MAX_MS, "leave"], ["left"]],
  ["timeout: a late failure after expiry sends nothing extra", ["focus", "submitting", FORM_IN_FLIGHT_MAX_MS, "leave", "failed"], ["left"]],
  ["timeout: a late success after expiry still finishes an open session", ["focus", "submitting", FORM_IN_FLIGHT_MAX_MS, "succeeded", "leave"], []],
  ["timeout: a second submission restarts the limit", ["focus", "submitting", JUST_UNDER, "submitting", JUST_UNDER, "leave"], []],
  ["never started: in flight and failure send nothing", ["submitting", "hide", "failed"], []],
];

for (const [name, steps, abandons] of cases) {
  test(`form in flight: ${name}`, () => {
    assert.deepEqual(run(steps), abandons, name);
  });
}
