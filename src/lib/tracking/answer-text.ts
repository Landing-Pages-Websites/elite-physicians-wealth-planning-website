import {
  ANSWER_TEXT_ATTRIBUTE,
  CHOICE_CONTROL_SELECTORS,
  PRIVATE_INSIDE_ATTRIBUTE,
  PRIVATE_SELECTOR,
} from "./field-privacy";

const CHOICE = CHOICE_CONTROL_SELECTORS.join(", ");
// Changes that can create or move a label-to-choice link, or a private region.
const LINK_ATTRIBUTES = ["for", "id", "aria-labelledby", "type", "role", "list", "aria-checked", "aria-pressed", "data-mega-private"];
// Elements whose posthog-js $el_text includes nested span text.
const TEXT_COPYING = new Set(["A", "BUTTON"]);

function idRefs(el: Element): Element[] {
  const ids = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  return ids.map((id) => el.ownerDocument.getElementById(id)).filter((t): t is HTMLElement => t !== null);
}

/** Everything whose text says which choice a control is: its labels, aria-labelledby targets and group legend. */
function namingElements(control: Element): Element[] {
  const named: Element[] = [];
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
    named.push(...Array.from(control.labels ?? []));
  }
  named.push(...idRefs(control));
  const wrapping = control.closest("label");
  if (wrapping) named.push(wrapping);
  const legend = control.closest("fieldset")?.querySelector(":scope > legend");
  if (legend) named.push(legend);
  return named;
}

function mark(el: Element, attribute: string): void {
  if (!el.hasAttribute(attribute)) el.setAttribute(attribute, "1");
}

/**
 * Marks, never unmarks: a label that once named a choice, or a button that
 * once held private text, may still show it in a replay or a late event.
 */
export function markAnswerText(doc: Document): void {
  for (const control of Array.from(doc.querySelectorAll(CHOICE))) {
    for (const el of namingElements(control)) mark(el, ANSWER_TEXT_ATTRIBUTE);
  }
  for (const region of Array.from(doc.querySelectorAll(PRIVATE_SELECTOR))) {
    for (let node = region.parentElement; node; node = node.parentElement) {
      if (TEXT_COPYING.has(node.tagName)) mark(node, PRIVATE_INSIDE_ATTRIBUTE);
    }
  }
}

/**
 * Keeps choice labels marked for the recording's blockSelector. Started
 * before posthog-js init, so the first snapshot sees the marks, and its
 * observer is created before the recorder's, so a label added later is
 * marked before the recorder serialises it.
 */
export function startAnswerTextMarking(doc: Document): () => void {
  markAnswerText(doc);
  const observer = new MutationObserver(() => markAnswerText(doc));
  observer.observe(doc.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: LINK_ATTRIBUTES,
  });
  return () => observer.disconnect();
}
