import assert from "node:assert/strict";
import test from "node:test";
import { ModalOrder, raiseToTopLayer, shouldReraiseAfter, type DialogLike, type PopoverLike } from "./topLayer.ts";

/** A fake <dialog>: show() is non-modal, showModal() is modal, remove() leaves the top layer. */
class FakeDialog implements DialogLike {
  open = false;
  modal = false;
  connected = true;
  constructor(readonly name: string, readonly modalSupported = true) {}
  get isConnected(): boolean { return this.connected; }
  hasAttribute(attr: string): boolean { return attr === "open" && this.open; }
  matches(selector: string): boolean {
    assert.equal(selector, ":modal");
    if (!this.modalSupported) throw new SyntaxError("unknown pseudo-class");
    return this.open && this.modal && this.connected;
  }
  showModal(): void { this.open = true; this.modal = true; }
  show(): void { this.open = true; this.modal = false; }
  close(): void { this.open = false; this.modal = false; }
}

/** Drives dialogs the way the page does and feeds ModalOrder the "open" attribute changes. */
function scenario(docOrder: FakeDialog[], seededOpen: FakeDialog[] = []): { order: ModalOrder<FakeDialog>; act(d: FakeDialog, how: "showModal" | "show" | "close" | "remove"): void; top(): string | null } {
  for (const d of seededOpen) d.showModal();
  const order = new ModalOrder<FakeDialog>();
  order.seed({ querySelectorAll: (sel: string) => { assert.equal(sel, "dialog[open]"); return docOrder.filter((d) => d.open); } });
  return {
    order,
    act(d, how) {
      if (how === "remove") { d.connected = false; return; }
      d[how]();
      order.record(d);
    },
    top: () => order.top()?.name ?? null,
  };
}

test("the bar goes inside the modal that is actually on top, by opening order", () => {
  const cases: [string, (f: Record<string, FakeDialog>) => [FakeDialog[], FakeDialog[]], [string, "showModal" | "show" | "close" | "remove"][], (string | null)[]][] = [
    ["nothing open", (f) => [[f.a], []], [], []],
    ["one modal", (f) => [[f.a], []], [["a", "showModal"]], ["a"]],
    ["nested: A then B, close B, close A", (f) => [[f.a, f.b], []], [["a", "showModal"], ["b", "showModal"], ["b", "close"], ["a", "close"]], ["a", "b", "a", null]],
    ["out of document order: B (later in DOM) opened first, then A", (f) => [[f.a, f.b], []], [["b", "showModal"], ["a", "showModal"]], ["b", "a"]],
    ["modal opened while the bar is already inside another", (f) => [[f.a, f.b, f.c], []], [["a", "showModal"], ["c", "showModal"], ["b", "showModal"]], ["a", "c", "b"]],
    ["closing a modal under the top one keeps the top", (f) => [[f.a, f.b], []], [["a", "showModal"], ["b", "showModal"], ["a", "close"]], ["a", "b", "b"]],
    ["reopening a lower modal puts it on top", (f) => [[f.a, f.b], []], [["a", "showModal"], ["b", "showModal"], ["a", "close"], ["a", "showModal"]], ["a", "b", "b", "a"]],
    ["a non-modal dialog opened later does not take the bar", (f) => [[f.a, f.b], []], [["a", "showModal"], ["b", "show"]], ["a", "a"]],
    ["the top modal removed from the DOM: back to the one under it", (f) => [[f.a, f.b], []], [["a", "showModal"], ["b", "showModal"], ["b", "remove"]], ["a", "b", "a"]],
    ["already open at load (seeded in document order), then a later one on top", (f) => [[f.a, f.b, f.c], [f.a, f.b]], [["c", "showModal"], ["c", "close"]], ["c", "b"]],
  ];
  for (const [label, setup, steps, tops] of cases) {
    const f = { a: new FakeDialog("a"), b: new FakeDialog("b"), c: new FakeDialog("c") };
    const [docOrder, seeded] = setup(f);
    const s = scenario(docOrder, seeded);
    const seen = steps.map(([name, how]) => { s.act(f[name as keyof typeof f], how); return s.top(); });
    assert.deepEqual(seen, tops, label);
  }
});

test("without :modal support the bar stays where it is", () => {
  const d = new FakeDialog("a", false);
  const s = scenario([d]);
  s.act(d, "showModal");
  assert.equal(s.top(), null);
});

function popover(open: boolean, opts: { supported?: boolean; showThrows?: boolean } = {}): PopoverLike & { log: string[] } {
  const log: string[] = [];
  let isOpen = open;
  const el: PopoverLike & { log: string[] } = {
    log,
    matches: (selector: string) => selector === ":popover-open" && isOpen,
  };
  if (opts.supported !== false) {
    el.showPopover = () => { if (opts.showThrows) throw new DOMException("not connected", "InvalidStateError"); log.push("show"); isOpen = true; };
    el.hidePopover = () => { log.push("hide"); isOpen = false; };
  }
  return el;
}

test("raising the bar puts it at the top of the top layer, re-showing it when already open", () => {
  const cases: [string, ReturnType<typeof popover>, boolean, string[]][] = [
    ["closed: shown once", popover(false), true, ["show"]],
    ["already open under a later modal: hidden then shown again", popover(true), true, ["hide", "show"]],
    ["no popover support: stays a fixed, high z-index bar", popover(false, { supported: false }), false, []],
    ["showPopover throws: no crash", popover(false, { showThrows: true }), false, []],
  ];
  for (const [label, el, raised, log] of cases) {
    assert.equal(raiseToTopLayer(el), raised, label);
    assert.deepEqual(el.log, log, label);
  }
});

test("the bar re-raises after anything else opens in the top layer, never after its own toggles", () => {
  const bar = {};
  const other = {};
  const cases: [string, { target: unknown; newState?: string }, boolean][] = [
    ["a popover menu opened", { target: other, newState: "open" }, true],
    ["a modal dialog opened", { target: other, newState: "open" }, true],
    ["something closed", { target: other, newState: "closed" }, false],
    ["the bar's own show", { target: bar, newState: "open" }, false],
    ["an old browser's toggle without newState", { target: other }, false],
  ];
  for (const [label, event, expected] of cases) assert.equal(shouldReraiseAfter(event, bar), expected, label);
});
