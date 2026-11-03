import type { TrackingEvent } from "./contract";
import type { FieldLabel } from "./field-privacy";

export type LeaveReason = "hidden" | "left";

export interface TrackCall {
  event: TrackingEvent;
  properties: Record<string, string>;
}

/**
 * How long a form's own submission may stay unanswered before leaving counts
 * as an abandon again. Only a site form that announces a submission and never
 * reports its outcome reaches it; LeadForm always reports one.
 */
export const FORM_IN_FLIGHT_MAX_MS = 60_000;

/** Who a field is, inside the page only: compared, never sent. */
export type FieldKey = object | string;


/**
 * State for one form on one page. Holds no values and sends no field names:
 * a field is reported only by the label the caller derived for it
 * (classifyField), and answer controls (checkboxes, radios, selects) are
 * never reported individually, so neither "last field" nor "completed" can
 * reveal a choice.
 *
 * The outcome of a submission the form handles itself is decided by the
 * server's answer, never by a navigation the form started: while one is in
 * flight, leaving is neither an abandon nor a submit. A leave held back that
 * way is reported if the answer turns out to be a failure.
 */
export class FormSession {
  private started = false;
  private done = false;
  private abandonSent = false;
  private inFlight = 0;
  private inFlightUntil = 0;
  private heldLeave: LeaveReason | null = null;
  private lastLabel: FieldLabel = null;
  private readonly completed = new Set<FieldKey>();

  constructor(
    private readonly formKey: string,
    private readonly formPath = "",
  ) {}

  /**
   * A text-like field took focus. A field with no label (private, or one the
   * caller could not classify) contributes nothing: no start, no last field.
   */
  focus(label: FieldLabel): TrackCall[] {
    if (label === null) return [];
    this.lastLabel = label;
    return this.start(label);
  }

  /**
   * An answer control took focus. It starts the form and changes nothing
   * else: the last field stays the last text field.
   */
  touchAnswer(): TrackCall[] {
    return this.start(null);
  }

  /** A field with no label is never completed, so it never reaches fields_completed either. */
  blur(key: FieldKey, label: FieldLabel, hasValue: boolean): TrackCall[] {
    if (label === null || !hasValue || this.completed.has(key)) return [];
    this.completed.add(key);
    return [{ event: "form_field_completed", properties: { form_key: this.formKey, field: label } }];
  }

  private start(label: FieldLabel): TrackCall[] {
    if (this.started) return [];
    this.started = true;
    const properties: Record<string, string> = { form_key: this.formKey };
    if (label !== null) properties.field = label;
    return [{ event: "form_started", properties }];
  }

  submitted(): void {
    this.done = true;
    this.inFlight = 0;
    this.heldLeave = null;
  }

  /** The form sent its own submission and is waiting on the server. */
  submitting(now: number = Date.now()): void {
    if (this.done) return;
    this.inFlight += 1;
    this.inFlightUntil = now + FORM_IN_FLIGHT_MAX_MS;
  }

  /**
   * The server rejected one submission, or it failed. Once none is left in
   * flight, a leave held back while waiting is reported now.
   */
  submitFailed(now: number = Date.now()): TrackCall[] {
    if (this.done || this.inFlight === 0) return [];
    this.inFlight -= 1;
    if (this.inFlight > 0 || this.heldLeave === null) return [];
    const reason = this.heldLeave;
    this.heldLeave = null;
    return this.leave(reason, now);
  }

  leave(reason: LeaveReason = "left", now: number = Date.now()): TrackCall[] {
    if (!this.started || this.done || this.abandonSent) return [];
    if (this.awaitingAnswer(now)) {
      this.heldLeave ??= reason;
      return [];
    }
    this.abandonSent = true;
    const properties: Record<string, string> = {
      form_key: this.formKey,
      reason,
      fields_completed: String(this.completed.size),
    };
    if (this.lastLabel !== null) properties.last_field = this.lastLabel;
    // A client-side route change sends this after the URL already moved on.
    if (this.formPath) properties.form_path = this.formPath;
    return [{ event: "form_abandoned", properties }];
  }

  private awaitingAnswer(now: number): boolean {
    if (this.inFlight === 0) return false;
    if (now < this.inFlightUntil) return true;
    // Nobody reported an outcome in time: the session is open again.
    this.inFlight = 0;
    this.heldLeave = null;
    return false;
  }
}

/** Everything still open across a page's forms; each session reports at most once. */
export function leaveAll(
  sessions: Iterable<FormSession>,
  reason: LeaveReason = "left",
  now: number = Date.now(),
): TrackCall[] {
  const calls: TrackCall[] = [];
  for (const session of sessions) calls.push(...session.leave(reason, now));
  return calls;
}
