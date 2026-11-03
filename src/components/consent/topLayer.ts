/**
 * Keeping the consent bar reachable over every overlay.
 *
 * A modal <dialog> (showModal) sits in the browser's top layer and makes
 * everything outside its subtree inert, popovers included, so no z-index can
 * keep the bar clickable. The bar is therefore:
 * - a `popover="manual"` element, so it is in the top layer itself, above any
 *   z-index (fixed headers, non-modal dialogs, menus) and positioned against
 *   the viewport whatever its ancestors' transform or overflow; and
 * - rendered inside the topmost open modal dialog while one is open, so it is
 *   not inert, then re-shown so it lands above that dialog in the top layer.
 *
 * "Topmost" is the most recently opened modal that is still modal, not the
 * last one in document order: a modal earlier in the DOM opened after another
 * is the one on top. ModalOrder records the order dialogs open in.
 *
 * The host is derived from the live DOM on every read, never cached: a dialog
 * hosts the bar only while it is connected and the browser still treats it as
 * modal (`:modal`). Removing it or any ancestor, moving it, or closing it
 * (close(), form method=dialog, Escape) ends that, and watchModalHost tells
 * React on every one of those paths, so the bar re-homes to the next modal down
 * or back to the document's top layer in the same task.
 *
 * A modal that is inert, display:none, or has had its open attribute removed
 * still blocks the whole page (measured in Chromium: nothing outside it, the
 * modals under it included, is clickable), so no host could make the bar
 * reachable; it stays with that modal and is usable the moment the site shows
 * it again. A modal inside a shadow root is invisible to a document observer
 * and is not supported: the bar stays in the document top layer, inert until
 * that modal closes.
 */

export interface DialogLike {
  readonly isConnected: boolean;
  matches(selector: string): boolean;
  hasAttribute(name: string): boolean;
}

export interface PopoverLike {
  matches(selector: string): boolean;
  showPopover?(): void;
  hidePopover?(): void;
}

/** Whether the browser is blocking the page with this dialog right now. */
function isModal(dialog: DialogLike): boolean {
  if (!dialog.isConnected) return false;
  try {
    return dialog.matches(":modal");
  } catch {
    // Without :modal support the bar stays where it is.
    return false;
  }
}

/** Open modal dialogs in the order they opened; the last one still modal is on top. */
export class ModalOrder<T extends DialogLike> {
  private opened: T[] = [];

  /** Modals already open before we started watching: document order is all there is. */
  seed(doc: { querySelectorAll(selector: string): ArrayLike<T> }): void {
    for (const dialog of Array.from(doc.querySelectorAll("dialog[open]"))) {
      if (!this.opened.includes(dialog) && isModal(dialog)) this.opened.push(dialog);
    }
  }

  /**
   * A dialog's open attribute changed. An opening modal goes on top. Anything
   * no longer modal is dropped: it can only become modal again by opening,
   * which records it afresh. A dialog whose open attribute was removed but is
   * still modal keeps its place, because it still blocks the page.
   */
  record(dialog: T): void {
    const opening = dialog.hasAttribute("open") && isModal(dialog);
    this.opened = this.opened.filter((d) => isModal(d) && !(opening && d === dialog));
    if (opening) this.opened.push(dialog);
  }

  /** The modal on top, skipping any that closed, left the DOM or moved since. */
  top(): T | null {
    for (let i = this.opened.length - 1; i >= 0; i--) {
      if (isModal(this.opened[i])) return this.opened[i];
    }
    return null;
  }
}

/**
 * Shows the bar as a top-layer popover, or re-shows it so it moves above
 * anything that entered the top layer since. Returns false where popovers are
 * unsupported or showing fails; the bar then stays a fixed bar with a very
 * high z-index.
 */
export function raiseToTopLayer(el: PopoverLike): boolean {
  if (typeof el.showPopover !== "function") return false;
  try {
    if (el.matches(":popover-open")) el.hidePopover?.();
    el.showPopover();
    return true;
  } catch {
    return false;
  }
}

/**
 * A popover or dialog that opens after the bar lands above it in the top
 * layer, so the bar is raised again whenever something else opens.
 */
export function shouldReraiseAfter(event: { target: unknown; newState?: string }, bar: unknown): boolean {
  return event.target !== bar && event.newState === "open";
}

export interface MutationRecordLike {
  type: string;
  target: unknown;
}

export interface ModalObserver {
  observe(target: unknown, options: MutationObserverInit): void;
  disconnect(): void;
}

/**
 * Opening and closing change the open attribute; removing or moving a dialog,
 * or any ancestor of it, changes a child list. Those are the only ways a light
 * DOM dialog starts or stops being modal, so both are observed.
 */
export const MODAL_HOST_MUTATIONS: MutationObserverInit = {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["open"],
};

/**
 * Keeps `order` current and calls onChange after every batch of mutations
 * that could move the host; the caller re-reads order.top(), which checks the
 * live DOM. MutationObserver delivers in the microtask checkpoint of the task
 * that made the change, so the bar re-homes before the next frame.
 */
export function watchModalHost<T extends DialogLike>(
  doc: { documentElement: unknown; querySelectorAll(selector: string): ArrayLike<T> },
  order: ModalOrder<T>,
  isDialog: (node: unknown) => node is T,
  onChange: () => void,
  Observer: new (callback: (records: MutationRecordLike[]) => void) => ModalObserver,
): () => void {
  order.seed(doc);
  const observer = new Observer((records) => {
    // Records arrive in the order the changes happened, which is the order
    // the dialogs opened and closed in.
    for (const record of records) {
      if (record.type === "attributes" && isDialog(record.target)) order.record(record.target);
    }
    onChange();
  });
  observer.observe(doc.documentElement, MODAL_HOST_MUTATIONS);
  return () => observer.disconnect();
}
