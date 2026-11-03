import assert from "node:assert/strict";
import test from "node:test";
import { FormSession, leaveAll } from "./form-session.ts";

test("first focus starts the form once", () => {
  const s = new FormSession("contact-form");
  assert.deepEqual(s.focus("email").map((c) => c.event), ["form_started"]);
  assert.deepEqual(s.focus("phone"), []);
});

test("a field is completed once, only with a value", () => {
  const s = new FormSession("contact-form");
  const email = {};
  s.focus("email");
  assert.deepEqual(s.blur(email, "email", false), []);
  assert.deepEqual(s.blur(email, "email", true), [{ event: "form_field_completed", properties: { form_key: "contact-form", field: "email" } }]);
  assert.deepEqual(s.blur(email, "email", true), []);
});

test("leaving after start abandons, naming the last field's label and the completed count", () => {
  const s = new FormSession("contact-form");
  s.focus("name"); s.blur("firstName", "name", true); s.focus("email");
  assert.deepEqual(s.leave(), [{ event: "form_abandoned", properties: { form_key: "contact-form", reason: "left", fields_completed: "1", last_field: "email" } }]);
  assert.deepEqual(s.leave(), []);
});

test("leaving after a successful submit is not an abandon", () => {
  const s = new FormSession("contact-form");
  s.focus("email"); s.submitted();
  assert.deepEqual(s.leave(), []);
});

test("leaving without ever starting sends nothing", () => {
  assert.deepEqual(new FormSession("contact-form").leave(), []);
});

test("leaveAll reports each open form once, and visibility then pagehide do not repeat it", () => {
  const a = new FormSession("a"); const b = new FormSession("b"); const c = new FormSession("c");
  a.focus("x"); b.focus("y"); b.submitted();
  const first = leaveAll([a, b, c]);
  assert.deepEqual(first.map((x) => x.properties.form_key), ["a"]);
  assert.deepEqual(leaveAll([a, b, c]), []);
});

test("an abandon names the page that held the form, not the page left for", () => {
  const s = new FormSession("contact-form", "/contact");
  s.focus("email");
  assert.deepEqual(s.leave(), [{ event: "form_abandoned", properties: { form_key: "contact-form", reason: "left", fields_completed: "0", last_field: "email", form_path: "/contact" } }]);
});

test("hiding the tab abandons tagged hidden", () => {
  const s = new FormSession("f");
  s.focus("email");
  assert.deepEqual(s.leave("hidden").map((c) => c.properties.reason), ["hidden"]);
});

test("hide, show, hide, pagehide sends exactly one abandon, the first", () => {
  const s = new FormSession("f");
  s.focus("email");
  const calls = [...s.leave("hidden"), ...s.leave("hidden"), ...s.leave("left")];
  assert.deepEqual(calls.map((c) => c.properties.reason), ["hidden"]);
});

test("hide, show, then submit keeps the abandon already sent and adds nothing", () => {
  const s = new FormSession("f");
  s.focus("email");
  const calls = [...s.leave("hidden")];
  s.submitted();
  calls.push(...s.leave("left"));
  assert.equal(calls.length, 1);
});

test("submit then hide sends nothing", () => {
  const s = new FormSession("f");
  s.focus("x");
  s.submitted();
  assert.deepEqual(s.leave("hidden"), []);
  assert.deepEqual(s.leave("left"), []);
});

test("leaveAll applies the reason to every open session and reports each once", () => {
  const a = new FormSession("a"); const b = new FormSession("b");
  a.focus("x"); b.focus("y");
  assert.deepEqual(leaveAll([a, b], "hidden").map((c) => c.properties.reason), ["hidden", "hidden"]);
  assert.deepEqual(leaveAll([a, b], "left"), []);
});

// The answer a visitor gave to a checkbox, radio or select must be
// unrecoverable from every event a session sends: the same sequence with the
// answer step removed sends the same events, apart from whether the form
// started (which never names a field when an answer starts it).
type Step = (s: FormSession, answer: () => void) => unknown[];
const ANSWER_SEQUENCES: Record<string, Step> = {
  "text, answer, text again": (s, answer) => [...s.focus("other"), ...(answer(), []), ...s.focus("other"), ...s.blur("o", "other", true)],
  "text, then answer": (s, answer) => [...s.focus("email"), ...s.blur("e", "email", true), ...(answer(), [])],
  "answer between two text fields": (s, answer) => [...s.focus("name"), ...s.blur("n", "name", true), ...(answer(), []), ...s.focus("phone")],
  "answer touched twice after an unnamed field": (s, answer) => [...s.focus("other"), ...(answer(), []), ...(answer(), [])],
  "answer after a private field": (s, answer) => [...s.focus("email"), ...s.focus(null), ...s.blur("p", null, true), ...(answer(), [])],
};

function eventsOf(step: Step, withAnswer: boolean): string {
  const s = new FormSession("f", "/contact");
  const out: unknown[] = [];
  out.push(...step(s, () => { if (withAnswer) out.push(...s.touchAnswer()); }));
  out.push(...s.leave());
  return JSON.stringify(out.filter((c) => (c as { event: string }).event !== "form_started"));
}

for (const [name, step] of Object.entries(ANSWER_SEQUENCES)) {
  test(`an answer control leaves no trace in any event: ${name}`, () => {
    assert.equal(eventsOf(step, true), eventsOf(step, false));
  });
}

test("a field with no label (private) contributes nothing: no start, no completion, no count", () => {
  const s = new FormSession("f");
  assert.deepEqual(s.focus(null), []);
  assert.deepEqual(s.blur("k", null, true), []);
  assert.deepEqual(s.leave(), []);
});

test("a private field focused last leaves the last field as it was", () => {
  const s = new FormSession("f");
  s.focus("email"); s.focus(null); s.blur("p", null, true);
  assert.deepEqual(s.leave()[0].properties, { form_key: "f", reason: "left", fields_completed: "0", last_field: "email" });
});

test("an answer-first form starts and abandons with no field", () => {
  const s = new FormSession("f");
  assert.deepEqual(s.touchAnswer(), [{ event: "form_started", properties: { form_key: "f" } }]);
  assert.deepEqual(s.leave(), [{ event: "form_abandoned", properties: { form_key: "f", reason: "left", fields_completed: "0" } }]);
});

test("fields are deduplicated by identity, not by label", () => {
  const s = new FormSession("f");
  const a = {}; const b = {};
  s.focus("other");
  assert.equal(s.blur(a, "other", true).length, 1);
  assert.equal(s.blur(b, "other", true).length, 1);
  assert.equal(s.blur(a, "other", true).length, 0);
  assert.equal(s.leave()[0].properties.fields_completed, "2");
});
