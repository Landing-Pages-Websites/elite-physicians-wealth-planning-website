import assert from "node:assert/strict";
import test from "node:test";
import { ModalOrder, watchModalHost, type DialogLike, type ModalObserver, type MutationRecordLike } from "./topLayer.ts";

/**
 * A small fake DOM with the semantics that decide where the bar can live,
 * each measured in Chromium:
 * - removing a dialog, or any ancestor of it, ends its modality (it stays open);
 * - moving a dialog is a removal then an insertion, so it comes back open but non-modal;
 * - removing the open attribute leaves the dialog modal, hidden, and still blocking the page;
 * - inert or hidden leaves it modal and blocking;
 * - a shadow tree is invisible to document queries and to a document MutationObserver.
 */
class FakeNode {
  parent: FakeNode | null = null;
  children: FakeNode[] = [];
  constructor(readonly dom: FakeDom, readonly name: string) {}
  get isConnected(): boolean {
    const top = rootOf(this);
    return top === this.dom.root || (top instanceof FakeShadowRoot && top.host.isConnected);
  }
  *walk(): Generator<FakeNode> {
    yield this;
    for (const child of this.children) yield* child.walk();
  }
}

function rootOf(node: FakeNode): FakeNode {
  return node.parent ? rootOf(node.parent) : node;
}

class FakeShadowRoot extends FakeNode {
  constructor(dom: FakeDom, readonly host: FakeNode) { super(dom, `#shadow(${host.name})`); }
}

class FakeDialog extends FakeNode implements DialogLike {
  open = false;
  modal = false;
  inert = false;
  hasAttribute(attr: string): boolean { return attr === "open" && this.open; }
  matches(selector: string): boolean {
    assert.equal(selector, ":modal");
    if (!this.dom.modalSupported) throw new SyntaxError("unknown pseudo-class");
    return this.modal && (this.dom.modalSurvivesRemoval || this.isConnected);
  }
}

class FakeDom {
  root: FakeNode;
  private observers: { cb: (records: MutationRecordLike[]) => void; target: FakeNode; options: MutationObserverInit }[] = [];
  private pending: MutationRecordLike[] = [];
  constructor(readonly modalSupported = true, readonly modalSurvivesRemoval = false) { this.root = new FakeNode(this, "html"); }

  get documentElement(): FakeNode { return this.root; }
  querySelectorAll(selector: string): FakeDialog[] {
    assert.equal(selector, "dialog[open]");
    return [...this.root.walk()].filter((n): n is FakeDialog => n instanceof FakeDialog && n.open);
  }

  /** Records reach an observer only if its options ask for them and the node is in its light tree. */
  private emit(record: MutationRecordLike & { node: FakeNode; attributeName?: string }): void {
    for (const o of this.observers) {
      const inTree = [...o.target.walk()].includes(record.node);
      const wanted = record.type === "childList"
        ? o.options.childList === true
        : o.options.attributes === true && (!o.options.attributeFilter || o.options.attributeFilter.includes(record.attributeName ?? ""));
      if (inTree && wanted) this.pending.push(record);
    }
  }

  /** Delivers queued records, as the microtask checkpoint at the end of a task does. */
  flush(): void {
    if (this.pending.length === 0) return;
    const records = this.pending;
    this.pending = [];
    for (const o of this.observers) o.cb(records);
  }

  readonly Observer = observerFor(this);

  addObserver(cb: (records: MutationRecordLike[]) => void, target: FakeNode, options: MutationObserverInit): void {
    this.observers.push({ cb, target, options });
  }
  removeObserver(cb: (records: MutationRecordLike[]) => void): void {
    this.observers = this.observers.filter((o) => o.cb !== cb);
  }

  append(parent: FakeNode, node: FakeNode): void {
    if (node.parent) this.remove(node);
    node.parent = parent;
    parent.children.push(node);
    this.emit({ type: "childList", target: parent, node: parent });
  }
  remove(node: FakeNode): void {
    const parent = node.parent;
    if (!parent) return;
    parent.children = parent.children.filter((c) => c !== node);
    node.parent = null;
    if (!this.modalSurvivesRemoval) for (const n of node.walk()) if (n instanceof FakeDialog) n.modal = false;
    this.emit({ type: "childList", target: parent, node: parent });
  }
  private setOpen(d: FakeDialog, open: boolean): void {
    d.open = open;
    this.emit({ type: "attributes", target: d, node: d, attributeName: "open" });
  }
  showModal(d: FakeDialog): void { if (d.open) throw new Error("InvalidStateError"); d.modal = d.isConnected; this.setOpen(d, true); }
  show(d: FakeDialog): void { if (!d.open) this.setOpen(d, true); }
  close(d: FakeDialog): void { if (!d.open) return; d.modal = false; this.setOpen(d, false); }
  removeOpenAttribute(d: FakeDialog): void { this.setOpen(d, false); }
  setInert(d: FakeDialog): void { d.inert = true; this.emit({ type: "attributes", target: d, node: d, attributeName: "inert" }); }
}

/** A MutationObserver bound to one fake document. */
function observerFor(dom: FakeDom): new (cb: (records: MutationRecordLike[]) => void) => ModalObserver {
  return class {
    constructor(private cb: (records: MutationRecordLike[]) => void) {}
    observe(target: unknown, options: MutationObserverInit): void { dom.addObserver(this.cb, target as FakeNode, options); }
    disconnect(): void { dom.removeObserver(this.cb); }
  };
}

type World = { dom: FakeDom; body: FakeNode; n: Record<string, FakeNode> };
type Step = [label: string, act: (w: World) => void, host: string | null];

function world(modalSupported = true, modalSurvivesRemoval = false): World {
  const dom = new FakeDom(modalSupported, modalSurvivesRemoval);
  const body = new FakeNode(dom, "body");
  dom.append(dom.root, body);
  const n: Record<string, FakeNode> = {};
  for (const name of ["a", "b", "c"]) n[name] = new FakeDialog(dom, name);
  n.wrap = new FakeNode(dom, "wrap");
  n.other = new FakeNode(dom, "other");
  n.shadowHost = new FakeNode(dom, "shadowHost");
  n.shadow = new FakeShadowRoot(dom, n.shadowHost);
  n.s = new FakeDialog(dom, "s");
  dom.append(body, n.wrap);
  dom.append(n.wrap, n.a);
  dom.append(body, n.b);
  dom.append(body, n.c);
  dom.append(body, n.other);
  dom.append(body, n.shadowHost);
  n.shadow.children.push(n.s);
  n.s.parent = n.shadow;
  return { dom, body, n };
}

const d = (w: World, name: string): FakeDialog => w.n[name] as FakeDialog;
const modal = (name: string): Step[1] => (w) => w.dom.showModal(d(w, name));

/**
 * React renders the bar where the snapshot read at the last notification said.
 * So after every step, that snapshot must equal the live answer: a host change
 * nobody was told about is the stranded bar.
 */
function run(steps: Step[], modalSupported = true, modalSurvivesRemoval = false): { label: string; rendered: string | null; live: string | null }[] {
  const w = world(modalSupported, modalSurvivesRemoval);
  const order = new ModalOrder<FakeDialog>();
  w.dom.flush();
  let rendered: string | null = null;
  const unsubscribe = watchModalHost(
    w.dom,
    order,
    (node): node is FakeDialog => node instanceof FakeDialog,
    () => { rendered = order.top()?.name ?? null; },
    w.dom.Observer,
  );
  rendered = order.top()?.name ?? null;
  const seen = steps.map(([label, act]) => {
    act(w);
    w.dom.flush();
    return { label, rendered, live: order.top()?.name ?? null };
  });
  unsubscribe();
  return seen;
}

const CASES: [string, Step[]][] = [
  ["one modal opened then closed", [["open A", modal("a"), "a"], ["close A", (w) => w.dom.close(d(w, "a")), null]]],
  ["the host removed from the DOM", [["open B", modal("b"), "b"], ["remove B", (w) => w.dom.remove(d(w, "b")), null]]],
  ["an ancestor of the host removed (React unmounting a subtree)", [["open A", modal("a"), "a"], ["remove wrap", (w) => w.dom.remove(w.n.wrap), null]]],
  ["the host moved to another parent: open but no longer modal", [["open B", modal("b"), "b"], ["move B", (w) => w.dom.append(w.n.other, d(w, "b")), null]]],
  ["a removed host put back is open, non-modal, never the host", [["open B", modal("b"), "b"], ["remove B", (w) => w.dom.remove(d(w, "b")), null], ["reinsert B", (w) => w.dom.append(w.body, d(w, "b")), null]]],
  ["two modals, the top one removed: back to the one under it", [["open A", modal("a"), "a"], ["open B", modal("b"), "b"], ["remove B", (w) => w.dom.remove(d(w, "b")), "a"]]],
  ["two modals, the lower one removed: the top keeps the bar", [["open A", modal("a"), "a"], ["open B", modal("b"), "b"], ["remove wrap", (w) => w.dom.remove(w.n.wrap), "b"], ["close B", (w) => w.dom.close(d(w, "b")), null]]],
  ["three modals, the middle one's subtree removed, then the top closed", [["open B", modal("b"), "b"], ["open A", modal("a"), "a"], ["open C", modal("c"), "c"], ["remove wrap", (w) => w.dom.remove(w.n.wrap), "c"], ["close C", (w) => w.dom.close(d(w, "c")), "b"]]],
  ["removing the top host and opening another in the same task", [["open A", modal("a"), "a"], ["remove A, open C", (w) => { w.dom.remove(d(w, "a")); w.dom.showModal(d(w, "c")); }, "c"]]],
  ["closed via close(), form method=dialog or Escape (all close the dialog)", [["open A", modal("a"), "a"], ["open B", modal("b"), "b"], ["Escape on B", (w) => w.dom.close(d(w, "b")), "a"], ["submit A's form", (w) => w.dom.close(d(w, "a")), null]]],
  // The open attribute removed: Chromium keeps the dialog modal and blocking, so it stays the host.
  ["the open attribute removed: still the blocking modal", [["open A", modal("a"), "a"], ["open B", modal("b"), "b"], ["remove B's open", (w) => w.dom.removeOpenAttribute(d(w, "b")), "b"], ["remove B", (w) => w.dom.remove(d(w, "b")), "a"]]],
  ["the host made inert: still blocking, so it keeps the bar", [["open A", modal("a"), "a"], ["open B", modal("b"), "b"], ["inert B", (w) => w.dom.setInert(d(w, "b")), "b"], ["close B", (w) => w.dom.close(d(w, "b")), "a"]]],
  ["a non-modal dialog never becomes the host", [["show B", (w) => w.dom.show(d(w, "b")), null], ["open A", modal("a"), "a"], ["show C", (w) => w.dom.show(d(w, "c")), "a"], ["remove A", (w) => w.dom.remove(d(w, "a")), null]]],
  ["out of document order: B opened first, then A", [["open B", modal("b"), "b"], ["open A", modal("a"), "a"], ["close A", (w) => w.dom.close(d(w, "a")), "b"]]],
  ["reopening a lower modal puts it on top", [["open A", modal("a"), "a"], ["open B", modal("b"), "b"], ["close A", (w) => w.dom.close(d(w, "a")), "b"], ["reopen A", modal("a"), "a"]]],
  // Unsupported, and stated: a document observer cannot see a shadow tree, so the
  // bar stays in the document top layer (inert while that modal is open) and is
  // reachable again the moment it closes; it is never left in a stale host.
  ["a modal inside a shadow root is not a host", [["open S", modal("s"), null], ["open A over it", modal("a"), "a"], ["remove A", (w) => w.dom.remove(d(w, "a")), null]]],
];

test("the bar's host is re-derived, and React told, on every path a host can stop being one", () => {
  // Collect every miss, so one run reports the whole table rather than the first case.
  const misses: string[] = [];
  for (const [name, steps] of CASES) {
    const seen = run(steps);
    for (const [i, [label, , expected]] of steps.entries()) {
      if (seen[i].live !== expected) misses.push(`${name} / ${label}: live host ${seen[i].live}, expected ${expected}`);
      if (seen[i].rendered !== expected) misses.push(`${name} / ${label}: rendered in ${seen[i].rendered} (stranded), expected ${expected}`);
    }
  }
  assert.deepEqual(misses, []);
});

test("modals already open when watching starts are seeded in document order", () => {
  const w = world();
  w.dom.showModal(d(w, "b"));
  w.dom.showModal(d(w, "a"));
  w.dom.flush();
  const order = new ModalOrder<FakeDialog>();
  let notified = 0;
  const stop = watchModalHost(w.dom, order, (x): x is FakeDialog => x instanceof FakeDialog, () => { notified++; }, w.dom.Observer);
  assert.equal(order.top()?.name, "b", "document order is all there is for pre-existing modals");
  w.dom.remove(d(w, "b"));
  w.dom.flush();
  assert.equal(order.top()?.name, "a");
  assert.equal(notified, 1);
  stop();
  w.dom.remove(w.n.wrap);
  w.dom.flush();
  assert.equal(notified, 1, "no notifications after unsubscribe");
});

test("without :modal support the bar stays in the document top layer", () => {
  const seen = run([["open A", modal("a"), null], ["remove A", (w) => w.dom.remove(d(w, "a")), null]], false);
  assert.deepEqual(seen.map((s) => [s.live, s.rendered]), [[null, null], [null, null]]);
});

test("a detached dialog is never the host, even where a browser still reports it :modal", () => {
  const seen = run([["open A", modal("a"), "a"], ["open B", modal("b"), "b"], ["remove B", (w) => w.dom.remove(d(w, "b")), "a"], ["remove wrap", (w) => w.dom.remove(w.n.wrap), null]], true, true);
  assert.deepEqual(seen.map((s) => [s.live, s.rendered]), [["a", "a"], ["b", "b"], ["a", "a"], [null, null]]);
});
