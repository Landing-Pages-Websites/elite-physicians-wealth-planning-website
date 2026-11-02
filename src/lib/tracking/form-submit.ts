import { LEAD_SUBMITTED_EVENT } from "./contract";

/**
 * What a form tells the tracking listeners when a visitor submits it.
 * `native` is the browser's submit event, read only after every handler ran;
 * `lead-submitted` is the form's own report of confirmed success.
 */
export type SubmitSignal =
  | { kind: "native"; defaultPrevented: boolean; valid: boolean; dialog: boolean }
  | { kind: "lead-submitted" };

/**
 * A form session is finished only on confirmed success, never on an attempt.
 *
 * A native submit nobody cancelled is the browser handing a constraint-valid
 * form to its action: the page cannot observe anything after that, so it is
 * the last signal it gets. A cancelled one (preventDefault) means page code
 * took over, which is how noValidate forms reject invalid input and how
 * fetch-based forms submit, so it proves nothing: that code reports success
 * itself with markFormSubmitted. A submit with failing constraints (a
 * noValidate form posting natively) is not a success either. Browser
 * validation that blocks a submit fires no event at all, and form.submit()
 * fires none either. A method="dialog" form only closes its dialog, so it
 * sends nothing anywhere.
 */
export function submitCompletes(signal: SubmitSignal): boolean {
  if (signal.kind === "lead-submitted") return true;
  return !signal.defaultPrevented && signal.valid && !signal.dialog;
}

/** A site form's own submission is waiting on the server. */
export const FORM_SUBMITTING_EVENT = "mega:lead-submitting";
/** The server rejected it, or it failed: the session is open again. */
export const FORM_SUBMIT_FAILED_EVENT = "mega:lead-submit-failed";

function signal(form: HTMLFormElement | null | undefined, type: string): void {
  form?.dispatchEvent(new Event(type, { bubbles: true }));
}

/**
 * Call when a site form that handles its own submit sends it, before any
 * navigation it starts itself (a redirect, a mailto: handoff). Until
 * markFormSubmitted or markFormSubmitFailed, or FORM_IN_FLIGHT_MAX_MS without
 * either, leaving the page is neither form_abandoned nor a submit.
 */
export function markFormSubmitting(form: HTMLFormElement | null | undefined): void {
  signal(form, FORM_SUBMITTING_EVENT);
}

/**
 * Call when the server rejects the submission or the request fails. A leave
 * held back while it was in flight is then reported as form_abandoned.
 */
export function markFormSubmitFailed(form: HTMLFormElement | null | undefined): void {
  signal(form, FORM_SUBMIT_FAILED_EVENT);
}

/**
 * Call after a form's submission is confirmed (the server accepted it), from
 * any site form that handles its own submit. It tells the tracking listeners
 * the form is finished, so leaving the page is not reported as form_abandoned.
 */
export function markFormSubmitted(form: HTMLFormElement | null | undefined): void {
  signal(form, LEAD_SUBMITTED_EVENT);
}
