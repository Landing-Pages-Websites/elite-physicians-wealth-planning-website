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
 */

export interface DialogLike {
  matches(selector: string): boolean;
  hasAttribute(name: string): boolean;
}

export interface PopoverLike {
  matches(selector: string): boolean;
  showPopover?(): void;
  hidePopover?(): void;
}

function isModal(dialog: DialogLike): boolean {
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

  /** A dialog's open attribute changed: an opening modal goes on top, a closing one leaves. */
  record(dialog: T): void {
    this.opened = this.opened.filter((d) => d !== dialog && isModal(d));
    if (dialog.hasAttribute("open") && isModal(dialog)) this.opened.push(dialog);
  }

  /** The modal on top, skipping any that closed or left the DOM since. */
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
