import type { TrackingEvent } from "./contract";

export type LeaveReason = "hidden" | "left";

export interface TrackCall {
  event: TrackingEvent;
  properties: Record<string, string>;
}

/** State for one form on one page. Holds field names only, never values. */
export class FormSession {
  private started = false;
  private done = false;
  private abandonSent = false;
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
  }

  leave(reason: LeaveReason = "left"): TrackCall[] {
    if (!this.started || this.done || this.abandonSent) return [];
    this.abandonSent = true;
    const properties: Record<string, string> = { form_key: this.formKey, last_field: this.lastField, reason };
    // A client-side route change sends this after the URL already moved on.
    if (this.formPath) properties.form_path = this.formPath;
    return [{ event: "form_abandoned", properties }];
  }
}

/** Everything still open across a page's forms; each session reports at most once. */
export function leaveAll(sessions: Iterable<FormSession>, reason: LeaveReason = "left"): TrackCall[] {
  const calls: TrackCall[] = [];
  for (const session of sessions) calls.push(...session.leave(reason));
  return calls;
}
