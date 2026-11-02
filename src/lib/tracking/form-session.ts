import type { TrackingEvent } from "./contract";

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

/**
 * State for one form on one page. Holds field names only, never values.
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
  private lastField = "";
  private readonly completed = new Set<string>();

  constructor(
    private readonly formKey: string,
    private readonly formPath = "",
  ) {}

  focus(field: string): TrackCall[] {
    this.lastField = field;
    if (this.started) return [];
    this.started = true;
    return [{ event: "form_started", properties: { form_key: this.formKey, field } }];
  }

  blur(field: string, hasValue: boolean): TrackCall[] {
    if (!hasValue || this.completed.has(field)) return [];
    this.completed.add(field);
    return [{ event: "form_field_completed", properties: { form_key: this.formKey, field } }];
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
    const properties: Record<string, string> = { form_key: this.formKey, last_field: this.lastField, reason };
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
