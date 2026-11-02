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

/**
 * Call after a form's submission is confirmed (the server accepted it), from
 * any site form that handles its own submit. It tells the tracking listeners
 * the form is finished, so leaving the page is not reported as form_abandoned.
 */
export function markFormSubmitted(form: HTMLFormElement | null | undefined): void {
  form?.dispatchEvent(new Event(LEAD_SUBMITTED_EVENT, { bubbles: true }));
}
