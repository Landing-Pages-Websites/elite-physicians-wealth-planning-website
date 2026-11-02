import { scrubUrl } from "./scrub";

export interface QueueCaptureOptions {
  send_instantly?: boolean;
  transport?: "XHR" | "fetch" | "sendBeacon";
  timestamp?: Date;
}

export type Capture = (
  event: string,
  properties: Record<string, unknown>,
  options?: QueueCaptureOptions,
) => void;

interface Queued {
  event: string;
  properties: Record<string, unknown>;
  options?: QueueCaptureOptions;
  timestamp: Date;
}

export const QUEUE_LIMIT = 50;

let pending: Queued[] = [];
let live: Capture | null = null;
let revoked = false;

function currentPage(): { url: string; pathname: string } | null {
  const loc = (globalThis as { location?: { href: string; pathname: string } }).location;
  return loc ? { url: scrubUrl(loc.href), pathname: loc.pathname } : null;
}

/**
 * Sends now if PostHog is up; otherwise holds the event until init (lazy init
 * would drop it). Nothing is kept or sent while consent is revoked. The
 * caller passes already-scrubbed page info; the default reads the location.
 */
export function enqueueOrCapture(
  event: string,
  properties: Record<string, unknown> = {},
  options?: QueueCaptureOptions,
  page?: { url: string; pathname: string },
): void {
  if (revoked) return;
  if (live) {
    live(event, properties, options);
    return;
  }
  if (pending.length >= QUEUE_LIMIT) return;
  const where = page ?? currentPage();
  pending.push({
    event,
    options,
    timestamp: new Date(),
    properties: where ? { ...properties, $current_url: where.url, $pathname: where.pathname } : properties,
  });
}

/** Installs the live sender and delivers queued events with their original time. */
export function flushQueue(capture: Capture): number {
  if (live || revoked) return 0;
  live = capture;
  const drained = pending;
  pending = [];
  for (const item of drained) {
    capture(item.event, item.properties, { ...item.options, timestamp: item.timestamp });
  }
  return drained.length;
}

/** A decline: drop everything held and refuse more until consent is granted again. */
export function revokeConsent(): void {
  revoked = true;
  pending = [];
}

export function grantConsent(): void {
  revoked = false;
}

export function isConsentRevoked(): boolean {
  return revoked;
}

export function resetQueueForTests(): void {
  pending = [];
  live = null;
  revoked = false;
}
