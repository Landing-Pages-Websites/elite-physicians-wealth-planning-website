import {
  ANSWER_SELECTOR,
  ANSWER_TEXT_ATTRIBUTE,
  FORM_SCOPE_SELECTOR,
  PRIVATE_SELECTOR,
} from "./field-privacy";

/**
 * The one place the listeners decide what is private. An element is silent
 * when it, or any ancestor, is private or an answer control: nothing about it
 * is reported. Text an event carries is built only from descendants that are
 * not private, not an answer, not inside a form and not text naming a choice;
 * a private descendant never reaches a label.
 *
 * Written against the few DOM members it needs, so it runs on a real page
 * and on the small fake tree its tests build.
 */
export interface NodeLike {
  readonly nodeType: number;
  readonly textContent: string | null;
}

export interface ElementLike extends NodeLike {
  readonly parentElement: ElementLike | null;
  readonly childNodes: ArrayLike<NodeLike>;
  matches(selector: string): boolean;
  closest(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
  getAttribute(name: string): string | null;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

export const SILENT_SELECTOR = `${PRIVATE_SELECTOR}, ${ANSWER_SELECTOR}`;

/** Subtrees whose text never becomes part of an event's label. */
const TEXT_EXCLUDED_SELECTOR = [
  SILENT_SELECTOR,
  FORM_SCOPE_SELECTOR,
  "label",
  `[${ANSWER_TEXT_ATTRIBUTE}]`,
  "script",
  "style",
  "template",
].join(", ");

const HEADING_SELECTOR = "h1,h2,h3";

function isElement(node: NodeLike): node is ElementLike {
  return node.nodeType === ELEMENT_NODE;
}

/** The element itself or an ancestor is private or an answer control. */
export function isSilent(el: ElementLike): boolean {
  return el.closest(SILENT_SELECTOR) !== null;
}

/** The element itself or an ancestor carries data-mega-private. */
export function isPrivate(el: ElementLike): boolean {
  return el.closest(PRIVATE_SELECTOR) !== null;
}

/**
 * Text of an element, leaving out every excluded descendant subtree. The
 * element's own ancestry is the caller's guard (isSilent, clickReportable).
 */
export function publicText(el: ElementLike): string {
  let text = "";
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === TEXT_NODE) text += child.textContent ?? "";
    else if (isElement(child) && !child.matches(TEXT_EXCLUDED_SELECTOR)) text += publicText(child);
  }
  return text;
}

/**
 * A section reports unless it, or an ancestor, is silent, or it sits inside
 * a form (a step shown because of an earlier answer). A section that is
 * itself the form's container still reports.
 */
export function sectionReportable(section: ElementLike): boolean {
  if (isSilent(section)) return false;
  return section.parentElement?.closest(FORM_SCOPE_SELECTOR) == null;
}

/** The first heading the page wrote, by its public text only. */
export function sectionHeading(section: ElementLike): string | null {
  for (const h of Array.from(section.querySelectorAll(HEADING_SELECTOR))) {
    if (isSilent(h)) continue;
    const text = publicText(h).trim();
    if (text) return text;
  }
  return null;
}

/**
 * Nothing in, or holding, an answer control or a private region reports by
 * its own name. Inside a form a button's or link's text can be an option, so
 * only an explicit, non-empty data-mega-cta reports there.
 */
export function clickReportable(target: ElementLike, el: ElementLike, ctaScope: ElementLike | null): boolean {
  if (isSilent(target) || isSilent(el)) return false;
  if (el.closest(FORM_SCOPE_SELECTOR) === null) return true;
  return (ctaScope?.getAttribute("data-mega-cta") ?? "").trim() !== "";
}
