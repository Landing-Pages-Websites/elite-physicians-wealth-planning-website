import { getConsentStatus, isAnalyticsAllowed, subscribeToConsent } from "./consent";

const MAX_WAIT_MS = 2500;
const IDLE_TIMEOUT_MS = 500;
type Cancel = () => void;
type Pending = { stopped: boolean; frame?: number; idle?: number; timer?: number; deadline?: number };

function cancelPending(pending: Pending, interaction: EventListener): void {
  pending.stopped = true;
  window.clearTimeout(pending.deadline);
  window.clearTimeout(pending.timer);
  if (pending.frame !== undefined) window.cancelAnimationFrame(pending.frame);
  if (pending.idle !== undefined) window.cancelIdleCallback(pending.idle);
  window.removeEventListener("pointerdown", interaction, true);
  window.removeEventListener("keydown", interaction, true);
}

function afterFontPaint(pending: Pending, run: () => void): void {
  if (pending.stopped) return;
  pending.frame = window.requestAnimationFrame(() => {
    pending.frame = window.requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === "function") {
        pending.idle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
      } else {
        pending.timer = window.setTimeout(run, 0);
      }
    });
  });
}

/** Fonts → two paint frames → idle; interaction/deadline also release stalled tabs. */
export function scheduleAnalyticsReady(callback: () => void): Cancel {
  const pending: Pending = { stopped: false };
  const interaction: EventListener = (event) => { if (event.isTrusted) run(); };
  const cancel = () => cancelPending(pending, interaction);
  const run = () => {
    if (pending.stopped) return;
    cancel();
    callback();
  };
  pending.deadline = window.setTimeout(run, MAX_WAIT_MS);
  window.addEventListener("pointerdown", interaction, { capture: true, passive: true });
  window.addEventListener("keydown", interaction, { capture: true, passive: true });
  // Font failure must not suppress analytics; the deadline also covers a hung promise.
  void Promise.resolve(document.fonts?.ready).then(
    () => afterFontPaint(pending, run),
    () => afterFontPaint(pending, run),
  );
  return cancel;
}

/** Each consent epoch invalidates its pending gate AND any in-flight SDK import. */
export function subscribeAnalyticsReady(
  ready: (isCurrent: () => boolean) => void,
  declined: () => void,
): Cancel {
  let cancel: Cancel = () => {};
  const sync = () => {
    cancel();
    if (!isAnalyticsAllowed(getConsentStatus())) { declined(); return; }
    let active = true;
    const isCurrent = () => active && isAnalyticsAllowed(getConsentStatus());
    const stop = scheduleAnalyticsReady(() => {
      if (isCurrent()) ready(isCurrent);
      else declined();
    });
    cancel = () => { active = false; stop(); };
  };
  const unsubscribe = subscribeToConsent(sync);
  sync();
  return () => { cancel(); unsubscribe(); };
}
