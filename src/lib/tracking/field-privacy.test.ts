import assert from "node:assert/strict";
import test from "node:test";
import {
  ANSWER_SELECTOR,
  classifyField,
  describesAnswerRegion,
  type FieldFacts,
  CHOICE_CONTROL_SELECTORS,
  FORM_SCOPE_SELECTOR,
  PRIVATE_SELECTOR,
  RECORDING_BLOCK_SELECTORS,
  UNCAPTURED_SELECTORS,
} from "./field-privacy.ts";

const facts = (over: Partial<FieldFacts>): FieldFacts => ({
  answer: false, private: false, type: "text", name: "", autocomplete: "", ...over,
});

// Every input type the HTML spec defines, plus the browser's fallbacks.
const ANSWER_TYPES = ["checkbox", "radio", "range", "file", "hidden", "color", "submit", "button", "reset", "image", "password", "select-one", "select-multiple", "CHECKBOX", "weird"];
const TEXT_TYPES = ["text", "email", "tel", "url", "search", "number", "date", "datetime-local", "month", "week", "time", "textarea", "TEXT"];

for (const type of ANSWER_TYPES) {
  test(`type ${type} is an answer control, whatever its name`, () => {
    for (const name of ["unableToWork", "email", "name", ""]) {
      assert.deepEqual(classifyField(facts({ type, name })), { kind: "answer" });
    }
  });
}

for (const type of TEXT_TYPES) {
  test(`type ${type} is text-like, and its own name never leaves`, () => {
    const out = classifyField(facts({ type, name: "hasDenialDetails" }));
    assert.equal(out.kind, "text");
    assert.ok(out.kind === "text" && ["other", "email", "phone"].includes(out.label ?? ""), JSON.stringify(out));
  });
}

test("a text field inside an answer scope (role=combobox, a radiogroup's 'Other') is an answer", () => {
  assert.deepEqual(classifyField(facts({ answer: true, type: "text", name: "email" })), { kind: "answer" });
});

test("inside data-mega-private every field is private, even a generic one or an answer", () => {
  for (const name of ["email", "phone", "denialReason"]) {
    assert.deepEqual(classifyField(facts({ private: true, name })), { kind: "private" });
  }
  assert.deepEqual(classifyField(facts({ private: true, answer: true })), { kind: "private" });
});

const LABELS: [Partial<FieldFacts>, string][] = [
  [{ name: "firstName" }, "name"], [{ name: "last_name" }, "name"], [{ name: "full-name" }, "name"],
  [{ name: "Email" }, "email"], [{ type: "email", name: "x1" }, "email"], [{ autocomplete: "section-a home email" }, "email"],
  [{ name: "phone" }, "phone"], [{ type: "tel", name: "q7" }, "phone"], [{ autocomplete: "tel-national" }, "phone"],
  [{ type: "textarea", name: "message" }, "message"], [{ type: "textarea", name: "comments" }, "message"],
  [{ autocomplete: "given-name", name: "injuryType" }, "name"],
  // Near misses and encoded choices: exact allowlist only.
  [{ name: "spouseEmail" }, "other"], [{ name: "emailOptIn" }, "other"], [{ name: "phoneIsMobile" }, "other"],
  [{ name: "nameOfInsurer" }, "other"], [{ name: "dateOfInjury", type: "date" }, "other"],
  [{ type: "textarea", name: "describeYourDisability" }, "other"], [{ name: "" }, "other"],
  [{ autocomplete: "off", name: "messageAboutDenial" }, "other"],
];
for (const [over, label] of LABELS) {
  test(`label for ${JSON.stringify(over)} is ${label}`, () => {
    assert.deepEqual(classifyField(facts(over)), { kind: "text", label });
  });
}

test("the answer selector covers native answer inputs, selects, and every ARIA choice role, case-insensitively", () => {
  for (const piece of ["input:not(", "[type=text i]", "[type=email i]", "input[list]", "select", "option", "datalist",
    "[role~=checkbox i]", "[role~=radio i]", "[role~=radiogroup i]", "[role~=switch i]", "[role~=combobox i]",
    "[role~=listbox i]", "[role~=option i]", "[role~=slider i]", "[aria-checked]", "[aria-pressed]"]) {
    assert.ok(ANSWER_SELECTOR.includes(piece), piece);
  }
  assert.equal(PRIVATE_SELECTOR, "[data-mega-private]");
  assert.equal(FORM_SCOPE_SELECTOR, "form, [role~=form i], fieldset");
});

test("posthog-js never describes forms, fields, labels, answer controls or private regions", () => {
  for (const s of ["form", "fieldset", "label", "input", "textarea", "select", "option", "[role~=checkbox i]", "[role~=switch i]", "[data-mega-private]", "[aria-checked]", "[contenteditable]"]) {
    assert.ok(UNCAPTURED_SELECTORS.includes(s), s);
  }
});

const chain = (...segments: string[]) => segments.join(";");
const REGION_EVENTS: [string, Record<string, unknown>, boolean][] = [
  ["a link click", { $elements: [{ tag_name: "a", attr__href: "/x" }, { tag_name: "body" }], $elements_chain: chain('a:attr__href="/x"nth-child="1"', 'body:nth-child="1"') }, false],
  ["a button outside forms", { $elements_chain: chain('button.cta:nth-child="2"', 'section:attr__data-mega-section="hero"') }, false],
  ["a checkbox (array)", { $elements: [{ tag_name: "input", attr__name: "unableToWork", attr__type: "checkbox" }] }, true],
  ["a checkbox (chain only)", { $elements_chain: 'input:attr__name="hasDenial"attr__type="checkbox"nth-child="1"' }, true],
  ["a label's text", { $elements_chain: chain('label:text="I cannot work"', 'div:nth-child="1"') }, true],
  ["a click inside a form", { $elements_chain: chain('span:text="Back injury"', 'div.card:nth-child="1"', 'form:attr__id="intake"') }, true],
  ["an ARIA radio", { $elements: [{ tag_name: "div", attr__role: "radio", $el_text: "Yes" }] }, true],
  ["an ARIA switch in the chain, mixed case", { $elements_chain: 'button:attr__role="Switch"text="On"' }, true],
  ["a role token list", { $elements: [{ tag_name: "div", attr__role: "button checkbox" }] }, true],
  ["an aria-pressed toggle", { $elements_chain: 'button:attr__aria-pressed="true"text="Yes"' }, true],
  ["a custom option", { $elements: [{ tag_name: "li", attr__role: "option", $el_text: "Denied" }] }, true],
  ["a private ancestor", { $elements: [{ tag_name: "span" }, { tag_name: "div", "attr__data-mega-private": "" }] }, true],
  ["a select change", { $elements_chain: 'select:attr__name="claimStatus"' }, true],
  ["uppercase tags", { $elements_chain: 'INPUT:attr__type="radio"' }, true],
  ["a value with ; cannot hide the real tag", { $elements_chain: chain('div:attr__style="a;b"', 'input:nth-child="1"') }, true],
  ["unreadable $elements fails closed", { $elements: "input" }, true],
  ["a non-object entry fails closed", { $elements: [null] }, true],
  ["unreadable chain fails closed", { $elements_chain: 7 }, true],
  ["a class named like a tag is not a tag", { $elements_chain: 'div.form-wrapper.input-group:nth-child="1"' }, false],
  ["no elements at all", { $current_url: "https://x.com/" }, false],
];
for (const [name, props, expected] of REGION_EVENTS) {
  test(`element event: ${name} -> ${expected ? "dropped" : "kept"}`, () => {
    assert.equal(describesAnswerRegion(props), expected);
  });
}

test("choice controls block every non-text, non-button input type, by chained :not() a browser can always parse", () => {
  const input = CHOICE_CONTROL_SELECTORS[0];
  for (const t of ["text", "email", "tel", "date", "submit", "button", "reset", "image"]) assert.ok(input.includes(`:not([type=${t} i])`), t);
  for (const t of ["checkbox", "radio", "range", "file", "hidden"]) assert.ok(!input.includes(`[type=${t} i]`), t);
  assert.ok(!input.includes(","), "no selector list inside :not()");
  assert.ok(!ANSWER_SELECTOR.split(", ")[0].includes(","), "no selector list inside :not()");
});

test("the recording block list is the choice controls plus private regions, marked choice text and contenteditable", () => {
  assert.deepEqual(RECORDING_BLOCK_SELECTORS, [...CHOICE_CONTROL_SELECTORS, "[data-mega-private]", "[data-mega-answer-text]", "[contenteditable]:not([contenteditable=false i])"]);
  for (const s of RECORDING_BLOCK_SELECTORS) assert.ok(!s.includes(":has("), `${s}: :has() is not parseable everywhere`);
});
