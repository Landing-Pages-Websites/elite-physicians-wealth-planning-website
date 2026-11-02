import assert from "node:assert/strict";
import test from "node:test";
import { FormSession, leaveAll } from "./form-session.ts";
import { submitCompletes, type SubmitSignal } from "./form-submit.ts";

/**
 * What TrackingListeners hears, step by step. A native submit carries the
 * state read after every handler ran: whether one cancelled the browser's own
 * submission, and whether the form's constraints pass. A form that fails
 * browser validation (no noValidate) fires no submit event at all, so it
 * produces no step.
 */
type Step = "focus" | "hide" | SubmitSignal;

const nativeSubmit = (defaultPrevented: boolean, valid: boolean): SubmitSignal => ({ kind: "native", defaultPrevented, valid, dialog: false });
const LEAD_SUBMITTED: SubmitSignal = { kind: "lead-submitted" };

function abandons(steps: Step[]): string[] {
  const session = new FormSession("f", "/contact");
  const reasons: string[] = [];
  for (const step of steps) {
    if (step === "focus") session.focus("email");
    else if (step === "hide") reasons.push(...leaveAll([session], "hidden").map((c) => c.properties.reason));
    else if (submitCompletes(step)) session.submitted();
  }
  return reasons;
}

const cases: [name: string, steps: Step[], abandoned: boolean][] = [
  ["native valid submit that the browser performs is finished", ["focus", nativeSubmit(false, true), "hide"], false],
  ["native invalid submit stopped by browser validation fires no submit and still abandons", ["focus", "hide"], true],
  ["noValidate form whose JS validation rejects (preventDefault) still abandons", ["focus", nativeSubmit(true, false), "hide"], true],
  ["noValidate form whose JS rejects a constraint-valid value still abandons", ["focus", nativeSubmit(true, true), "hide"], true],
  ["noValidate form posting natively with invalid values is not finished", ["focus", nativeSubmit(false, false), "hide"], true],
  ["noValidate form that accepts, preventDefaults and fetches is finished only by its success signal", ["focus", nativeSubmit(true, true), LEAD_SUBMITTED, "hide"], false],
  ["JS form that accepts and fetches but never confirms success still abandons", ["focus", nativeSubmit(true, true), "hide"], true],
  ["Enter-key submit of an invalid noValidate form, then leaving, abandons", ["focus", nativeSubmit(true, false), "hide"], true],
  ["Enter-key submit of a valid form the browser performs is finished", ["focus", nativeSubmit(false, true), "hide"], false],
  ["LeadForm success: prevented native submit then mega:lead-submitted is finished", ["focus", nativeSubmit(true, true), LEAD_SUBMITTED, "hide"], false],
  ["LeadForm failure: prevented native submit with no success event abandons", ["focus", nativeSubmit(true, true), "hide"], true],
  ["double submit, first rejected then accepted, is finished", ["focus", nativeSubmit(true, false), nativeSubmit(true, true), LEAD_SUBMITTED, "hide"], false],
  ["double submit, both rejected, abandons once", ["focus", nativeSubmit(true, false), nativeSubmit(true, false), "hide", "hide"], true],
  ["submit then hide: success before the tab hides sends nothing", ["focus", LEAD_SUBMITTED, "hide"], false],
  ["submit attempt then hide: an attempt alone must still abandon", ["focus", nativeSubmit(true, true), "hide"], true],
  ["a method=dialog form only closes its dialog, so leaving still abandons", ["focus", { kind: "native", defaultPrevented: false, valid: true, dialog: true }, "hide"], true],
  ["success arriving after the tab already hid does not take the abandon back", ["focus", nativeSubmit(true, true), "hide", LEAD_SUBMITTED, "hide"], true],
];

for (const [name, steps, abandoned] of cases) {
  test(`form submit: ${name}`, () => {
    const reasons = abandons(steps);
    assert.deepEqual(reasons, abandoned ? ["hidden"] : [], name);
  });
}

test("form submit: only a performed, constraint-valid native submit or the success event completes", () => {
  assert.equal(submitCompletes(nativeSubmit(false, true)), true);
  assert.equal(submitCompletes(nativeSubmit(false, false)), false);
  assert.equal(submitCompletes(nativeSubmit(true, true)), false);
  assert.equal(submitCompletes(nativeSubmit(true, false)), false);
  assert.equal(submitCompletes({ kind: "native", defaultPrevented: false, valid: true, dialog: true }), false);
  assert.equal(submitCompletes(LEAD_SUBMITTED), true);
});
