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
  s.focus("email");
  assert.deepEqual(s.blur("email", false), []);
  assert.deepEqual(s.blur("email", true), [{ event: "form_field_completed", properties: { form_key: "contact-form", field: "email" } }]);
  assert.deepEqual(s.blur("email", true), []);
});

test("leaving after start abandons, naming the last field", () => {
  const s = new FormSession("contact-form");
  s.focus("firstName"); s.blur("firstName", true); s.focus("email");
  assert.deepEqual(s.leave(), [{ event: "form_abandoned", properties: { form_key: "contact-form", last_field: "email", reason: "left" } }]);
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
  assert.deepEqual(s.leave(), [{ event: "form_abandoned", properties: { form_key: "contact-form", last_field: "email", reason: "left", form_path: "/contact" } }]);
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
