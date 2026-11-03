/**
 * What tracking may say about a form field. The invariant: no event lets
 * anyone infer what a visitor chose or typed.
 *
 * A control whose completion IS the answer (a checkbox, radio, switch,
 * select, slider, file picker, or anything ARIA marks as one) is never
 * identified, by name, label, position or completion. A text-like field may
 * be identified only by one of a few generic contact labels, or "other";
 * its own name never leaves the page. A field inside `data-mega-private`
 * contributes nothing at all, not even to a count.
 *
 * Every rule here is stated once, as data, and turned into both the CSS
 * selectors the DOM and posthog-js evaluate and the checks over the element
 * descriptions posthog-js puts in its events.
 */

/** Input types the browser renders as typed text. Every other type is an answer control. */
const TEXT_INPUT_TYPES = [
  "text", "email", "tel", "url", "search", "number", "date", "datetime-local", "month", "week", "time",
];

/** ARIA roles that make an element, or everything inside it, a choice. */
const ANSWER_ROLES = [
  "checkbox", "radio", "radiogroup", "switch", "combobox", "listbox", "option",
  "menuitemcheckbox", "menuitemradio", "slider", "spinbutton", "treeitem",
];

/** Elements whose state is a choice, whatever their role. */
const ANSWER_TAGS = ["select", "option", "datalist"];
const ANSWER_STATE_ATTRIBUTES = ["aria-checked", "aria-pressed"];

/** Input types that render as buttons: visible in recordings, never tracked as fields. */
const BUTTON_INPUT_TYPES = ["submit", "button", "reset", "image"];

const role = (r: string): string => `[role~=${r} i]`;
const attribute = (a: string): string => `[${a}]`;
// Chained :not() rather than a selector list inside one :not(): a browser that
// cannot parse a selector makes posthog-js's recorder skip blocking entirely.
const inputExcept = (types: string[]): string => `input${types.map((t) => `:not([type=${t} i])`).join("")}`;

export const PRIVATE_SELECTOR = attribute("data-mega-private");

/**
 * An answer control, or anything inside one. Test with closest(), so a text
 * box inside a radiogroup ("Other: ___") counts too. An input with no type,
 * or an unknown one, is matched here (fail closed) unless it is one of the
 * typed-text types.
 */
export const ANSWER_SELECTOR = [
  inputExcept(TEXT_INPUT_TYPES),
  "input[list]",
  ...ANSWER_TAGS,
  ...ANSWER_ROLES.map(role),
  ...ANSWER_STATE_ATTRIBUTES.map(attribute),
].join(", ");

/** A form, or a group of fields that behaves like one. */
export const FORM_SCOPE_SELECTOR = ["form", role("form"), "fieldset"].join(", ");

/**
 * Regions posthog-js autocapture must never describe: no autocapture, no
 * dead or rage click. Every form field, label and form, every answer control
 * outside a form, and every private region. The site's own form events
 * cover the funnel there.
 */
const UNCAPTURED = {
  tags: ["form", "fieldset", "label", "input", "textarea", ...ANSWER_TAGS],
  roles: ["form", ...ANSWER_ROLES],
  attributes: ["data-mega-private", "data-mega-private-inside", "contenteditable", ...ANSWER_STATE_ATTRIBUTES],
};

export const UNCAPTURED_SELECTORS: string[] = [
  ...UNCAPTURED.tags,
  ...UNCAPTURED.roles.map(role),
  ...UNCAPTURED.attributes.map(attribute),
];

/**
 * A control whose state is a choice: every answer control except inputs that
 * render as buttons.
 */
export const CHOICE_CONTROL_SELECTORS: string[] = [
  inputExcept([...TEXT_INPUT_TYPES, ...BUTTON_INPUT_TYPES]),
  "input[list]",
  ...ANSWER_TAGS,
  ...ANSWER_ROLES.map(role),
  ...ANSWER_STATE_ATTRIBUTES.map(attribute),
];

/**
 * Set at runtime (answer-text.ts) on text that names a choice: a choice
 * control's labels (label[for], a wrapping label), its aria-labelledby
 * targets, and the legend of a fieldset holding choices. No static selector
 * can follow a for= or aria-labelledby reference.
 */
export const ANSWER_TEXT_ATTRIBUTE = "data-mega-answer-text";

/**
 * Set at runtime (answer-text.ts) on every link or button that holds a
 * data-mega-private descendant: posthog-js copies the text of nested spans
 * into a link's or button's $el_text, and no ancestor-only ignore list can
 * see a private descendant.
 */
export const PRIVATE_INSIDE_ATTRIBUTE = "data-mega-private-inside";

/**
 * What a session recording blocks (a placeholder, no state): every choice
 * control and the text naming it, and every private region. Text fields,
 * textareas, buttons, headings and layout stay visible, with typed values
 * masked by maskAllInputs, so form friction can still be watched.
 * contenteditable is blocked because maskAllInputs does not mask it.
 */
export const RECORDING_BLOCK_SELECTORS: string[] = [
  ...CHOICE_CONTROL_SELECTORS,
  PRIVATE_SELECTOR,
  attribute(ANSWER_TEXT_ATTRIBUTE),
  "[contenteditable]:not([contenteditable=false i])",
];

export type GenericField = "name" | "email" | "phone" | "message";
/** What an event may call a field: a generic label, "other", or nothing at all. */
export type FieldLabel = GenericField | "other" | null;

/** A field as the listener sees it, after the DOM questions are answered. */
export interface FieldFacts {
  /** The field, or an ancestor, matches ANSWER_SELECTOR. */
  answer: boolean;
  /** The field is inside PRIVATE_SELECTOR. */
  private: boolean;
  /** The element's normalised `type` property ("textarea" for a textarea). */
  type: string;
  name: string;
  autocomplete: string;
}

export type FieldClass =
  /** Inside data-mega-private: contributes nothing to any event, not even a count. */
  | { kind: "private" }
  | { kind: "answer" }
  | { kind: "text"; label: GenericField | "other" };

const BY_AUTOCOMPLETE: Record<string, GenericField> = {
  name: "name", "given-name": "name", "family-name": "name", "additional-name": "name",
  email: "email", tel: "phone", "tel-national": "phone",
};
const BY_TYPE: Record<string, GenericField> = { email: "email", tel: "phone" };
const BY_NAME: Record<string, GenericField> = {
  name: "name", fullname: "name", yourname: "name", firstname: "name", lastname: "name",
  email: "email", emailaddress: "email", youremail: "email",
  phone: "phone", phonenumber: "phone", telephone: "phone", tel: "phone", mobile: "phone",
  message: "message", comments: "message", comment: "message", yourmessage: "message",
};

/** An allowlist: a name that is not exactly a generic contact field is "other". */
function genericLabel(facts: FieldFacts): GenericField | "other" {
  const token = facts.autocomplete.trim().toLowerCase().split(/\s+/).pop() ?? "";
  const name = facts.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BY_AUTOCOMPLETE[token] ?? BY_TYPE[facts.type.toLowerCase()] ?? BY_NAME[name] ?? "other";
}

export function classifyField(facts: FieldFacts): FieldClass {
  if (facts.private) return { kind: "private" };
  if (facts.answer) return { kind: "answer" };
  const type = facts.type.toLowerCase();
  if (type !== "textarea" && !TEXT_INPUT_TYPES.includes(type)) return { kind: "answer" };
  return { kind: "text", label: genericLabel(facts) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roleTokens(value: unknown): string[] {
  return typeof value === "string" ? value.toLowerCase().split(/\s+/) : [];
}

/** One entry of posthog-js `$elements`. */
function describesUncaptured(el: Record<string, unknown>): boolean {
  const tag = typeof el.tag_name === "string" ? el.tag_name.toLowerCase() : "";
  if (UNCAPTURED.tags.includes(tag)) return true;
  if (roleTokens(el.attr__role).some((r) => UNCAPTURED.roles.includes(r))) return true;
  return UNCAPTURED.attributes.some((a) => `attr__${a}` in el);
}

/**
 * `$elements_chain` is `tag.class:attr="v"...;parent...`. A value holding a
 * `;` can only add a false segment start, never hide a real one, so every
 * test here can over-match (and drop) but never miss.
 */
function chainDescribesUncaptured(chain: string): boolean {
  const lower = chain.toLowerCase();
  if (UNCAPTURED.tags.some((t) => new RegExp(`(^|;)${t}[.:]`).test(lower))) return true;
  const roles = [...lower.matchAll(/attr__role="([^"]*)"/g)].flatMap((m) => roleTokens(m[1]));
  if (roles.some((r) => UNCAPTURED.roles.includes(r))) return true;
  return UNCAPTURED.attributes.some((a) => lower.includes(`attr__${a}=`));
}

/**
 * True when an event describes an element (posthog-js autocapture, rage and
 * dead clicks, copy) inside a region posthog-js must not describe. Decided
 * from the event's own element description, by shape rather than event name,
 * so any element-carrying event is covered. Anything unreadable fails closed.
 */
export function describesAnswerRegion(properties: Record<string, unknown>): boolean {
  const elements = properties.$elements;
  const chain = properties.$elements_chain;
  if (elements === undefined && chain === undefined) return false;
  if (elements !== undefined) {
    if (!Array.isArray(elements)) return true;
    if (elements.some((el) => !isRecord(el) || describesUncaptured(el))) return true;
  }
  if (chain !== undefined) {
    if (typeof chain !== "string") return true;
    if (chainDescribesUncaptured(chain)) return true;
  }
  return false;
}
