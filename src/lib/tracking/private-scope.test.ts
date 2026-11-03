import assert from "node:assert/strict";
import test from "node:test";
import { classifyField, describesAnswerRegion, UNCAPTURED_SELECTORS } from "./field-privacy.ts";
import { FormSession } from "./form-session.ts";
import {
  clickReportable,
  type ElementLike,
  isPrivate,
  type NodeLike,
  publicText,
  sectionHeading,
  sectionReportable,
} from "./private-scope.ts";

/**
 * A small element tree with just enough selector support for the selectors
 * this module and field-privacy.ts generate: tag, [attr], [attr=v i],
 * [attr~=v i], and chained :not([attr=v i]), joined by ", ".
 */
class FakeText implements NodeLike {
  readonly nodeType = 3;
  constructor(readonly textContent: string) {}
}

class FakeElement implements ElementLike {
  readonly nodeType = 1;
  parentElement: FakeElement | null = null;
  readonly childNodes: (FakeElement | FakeText)[] = [];
  constructor(readonly tag: string, readonly attrs: Record<string, string> = {}, children: (FakeElement | string)[] = []) {
    for (const c of children) {
      if (typeof c === "string") this.childNodes.push(new FakeText(c));
      else { c.parentElement = this; this.childNodes.push(c); }
    }
  }
  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join("");
  }
  getAttribute(name: string): string | null {
    return name in this.attrs ? this.attrs[name] : null;
  }
  matches(selector: string): boolean {
    return selector.split(/\s*,\s*/).some((s) => this.matchesOne(s.trim()));
  }
  closest(selector: string): FakeElement | null {
    return this.matches(selector) ? this : (this.parentElement?.closest(selector) ?? null);
  }
  querySelectorAll(selector: string): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (e: FakeElement) => {
      for (const c of e.childNodes) if (c instanceof FakeElement) { if (c.matches(selector)) out.push(c); walk(c); }
    };
    walk(this);
    return out;
  }
  private matchesOne(simple: string): boolean {
    const m = /^([a-z0-9]*)((?:\[[^\]]+\])*)((?::not\(\[[^\]]+\]\))*)$/.exec(simple);
    if (!m) throw new Error(`fake DOM cannot parse ${simple}`);
    const [, tag, attrs, nots] = m;
    if (tag && tag !== this.tag) return false;
    const test = (expr: string) => {
      const a = /^([\w-]+)(?:(~?=)([^\s\]]+)( i)?)?$/.exec(expr);
      if (!a) throw new Error(`fake DOM cannot parse [${expr}]`);
      const [, name, op, want] = a;
      const have = this.getAttribute(name);
      if (have === null) return name === "type" && this.tag === "input" && op === "=" && want.toLowerCase() === "text";
      if (!op) return true;
      if (op === "=") return have.toLowerCase() === want.toLowerCase();
      return have.toLowerCase().split(/\s+/).includes(want.toLowerCase());
    };
    for (const [, expr] of attrs.matchAll(/\[([^\]]+)\]/g)) if (!test(expr)) return false;
    for (const [, expr] of nots.matchAll(/:not\(\[([^\]]+)\]\)/g)) if (test(expr)) return false;
    return true;
  }
}

const el = (tag: string, attrs: Record<string, string> = {}, ...children: (FakeElement | string)[]) => new FakeElement(tag, attrs, children);
const PRIV = { "data-mega-private": "" };
const SECRET = "Jane Doe denial 4471";

// Where the private marking sits relative to the element an emitter reads.
type Placement = "self" | "ancestor" | "descendant";
const PLACEMENTS: Placement[] = ["self", "ancestor", "descendant"];

function section(p: Placement): FakeElement {
  const heading = el("h2", {}, "Our process ", ...(p === "descendant" ? [el("span", PRIV, SECRET)] : []));
  const s = el("section", { "data-mega-section": "branch", ...(p === "self" ? PRIV : {}) }, heading);
  if (p === "ancestor") el("div", PRIV, s);
  else el("main", {}, s);
  return s;
}

function cta(p: Placement): { target: FakeElement; button: FakeElement } {
  const target = el("span", {}, "Book now");
  const button = el("button", p === "self" ? PRIV : {}, target, ...(p === "descendant" ? [" ", el("span", PRIV, SECRET)] : []));
  el("section", p === "ancestor" ? PRIV : { "data-mega-section": "hero" }, button);
  return { target, button };
}

for (const p of PLACEMENTS) {
  test(`section_viewed: private ${p} -> ${p === "descendant" ? "reported, without the private text" : "not reported"}`, () => {
    const s = section(p);
    assert.equal(sectionReportable(s), p === "descendant");
    if (p === "descendant") assert.equal(sectionHeading(s), "Our process");
  });

  test(`CTA / contact / outbound click: private ${p} -> ${p === "descendant" ? "label from public text only" : "not reported"}`, () => {
    const { target, button } = cta(p);
    assert.equal(clickReportable(target, button, null), p === "descendant");
    if (p === "descendant") assert.equal(publicText(button).trim(), "Book now");
  });

  test(`form field: private ${p} contributes nothing at all, not even a count`, () => {
    if (p === "descendant") return; // an input has no descendants
    const input = el("input", { type: "email", name: "email", ...(p === "self" ? PRIV : {}) });
    el("form", {}, p === "ancestor" ? el("div", PRIV, input) : input);
    assert.equal(isPrivate(input), true);
    const c = classifyField({ answer: false, private: isPrivate(input), type: "email", name: "email", autocomplete: "" });
    assert.deepEqual(c, { kind: "private" });
  });
}

test("an answer control inside a private region is private, not an answer: it does not even start the form", () => {
  assert.deepEqual(classifyField({ answer: true, private: true, type: "checkbox", name: "x", autocomplete: "" }), { kind: "private" });
});

test("form session: a field with no label never starts, completes or counts", () => {
  const s = new FormSession("f");
  assert.deepEqual(s.focus(null), []);
  assert.deepEqual(s.blur("p", null, true), []);
  assert.deepEqual(s.leave(), []);
  s.focus("email"); s.blur("e", "email", true); s.blur("p", null, true);
  assert.equal(s.leave()[0].properties.fields_completed, "1");
});

test("public text leaves out answer controls, labels, forms and marked choice text, not only private regions", () => {
  const b = el("a", { href: "/x" }, "Start ",
    el("span", { role: "radio" }, "Yes I was denied"),
    el("label", {}, "Unable to work"),
    el("span", { "data-mega-answer-text": "1" }, "Back injury"),
    el("form", {}, "nested"),
    el("b", {}, "here"));
  assert.equal(publicText(b), "Start here");
});

test("a heading that is itself private is skipped for the next public one", () => {
  const s = el("section", { "data-mega-section": "x" }, el("h2", PRIV, SECRET), el("h3", {}, "Public"));
  el("main", {}, s);
  assert.equal(sectionHeading(s), "Public");
});

test("a section inside a form is not reported; a section that holds a form is", () => {
  const step = el("section", { "data-mega-section": "denial-step" });
  el("form", {}, step);
  assert.equal(sectionReportable(step), false);
  const holder = el("section", { "data-mega-section": "contact" }, el("form", {}, el("input", { name: "email" })));
  el("main", {}, holder);
  assert.equal(sectionReportable(holder), true);
});

test("posthog-js: a link or button holding private text is never autocaptured, and the backstop drops it too", () => {
  assert.ok(UNCAPTURED_SELECTORS.includes("[data-mega-private-inside]"));
  assert.equal(describesAnswerRegion({ $elements_chain: 'button:attr__data-mega-private-inside="1"text="Book now Jane"' }), true);
  assert.equal(describesAnswerRegion({ $elements: [{ tag_name: "a", "attr__data-mega-private-inside": "1" }] }), true);
});
