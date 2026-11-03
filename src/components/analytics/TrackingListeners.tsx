"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/components/consent/useConsent";
import { trackEvent } from "@/lib/track";
import {
  classifyClick,
  ctaFor,
  labelFor,
  LEAD_SUBMITTED_EVENT,
  placementFrom,
} from "@/lib/tracking/contract";
import { TRACKING_ENABLED } from "@/lib/tracking/enabled";
import { ANSWER_SELECTOR, classifyField, type FieldClass } from "@/lib/tracking/field-privacy";
import { FormSession, leaveAll, type LeaveReason, type TrackCall } from "@/lib/tracking/form-session";
import {
  clickReportable,
  isPrivate,
  publicText,
  sectionHeading,
  sectionReportable,
} from "@/lib/tracking/private-scope";
import {
  FORM_SUBMIT_FAILED_EVENT,
  FORM_SUBMITTING_EVENT,
  submitCompletes,
} from "@/lib/tracking/form-submit";
import { sectionVisible } from "@/lib/tracking/sections";

const SECTION_SELECTOR = "section, [data-mega-section]";
const SECTION_THRESHOLDS = [0, 0.25, 0.5];
const SECTION_DWELL_MS = 1000;
// An abandon is often the last thing the page does, so it must not wait for a batch.
const ABANDON_OPTIONS = { send_instantly: true, transport: "sendBeacon" } as const;
const TOGGLE_ATTRIBUTES = ["aria-expanded", "aria-haspopup", "aria-controls"];

type FormSessions = Map<HTMLFormElement, FormSession>;

function ancestorTags(el: Element): string[] {
  const tags: string[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    tags.push(node.tagName.toLowerCase());
  }
  return tags;
}

function sectionLabel(section: Element) {
  return labelFor({
    label: section.getAttribute("data-mega-section"),
    id: section.id || null,
    heading: sectionHeading(section),
    text: null,
  });
}

function onClick(e: MouseEvent): void {
  const target = e.target instanceof Element ? e.target : null;
  const el = target?.closest("a, button, [data-mega-cta]");
  if (!target || !el || el.closest("[data-mega-ignore]")) return;
  const ctaScope = el.closest("[data-mega-cta]");
  if (!clickReportable(target, el, ctaScope)) return;
  const button = el.closest("button");
  // Never textContent: a private or answer descendant must not reach a label.
  const text = publicText(el);
  const cta = ctaFor({
    ctaAttr: ctaScope?.getAttribute("data-mega-cta") ?? null,
    insideCta: ctaScope !== null,
    isButton: button !== null,
    toggle: button !== null && TOGGLE_ATTRIBUTES.some((a) => button.hasAttribute(a)),
    ignored: false,
    text,
  });
  const result = classifyClick({
    href: el.closest("a")?.getAttribute("href") ?? null,
    pageHost: window.location.host,
    ctaLabel: cta?.label ?? null,
    text,
    placement: placementFrom(ancestorTags(el)),
  });
  if (!result) return;
  const section = el.closest(SECTION_SELECTOR);
  const label = section && sectionReportable(section) ? sectionLabel(section) : null;
  trackEvent(result.event, {
    ...result.properties,
    ...(label ? { section: label.label } : {}),
    mega_label_source: cta?.source ?? "fallback",
  });
}

function reportSection(el: Element): void {
  if (!sectionReportable(el)) return;
  const label = sectionLabel(el);
  if (!label) return;
  const index = Array.from(document.querySelectorAll(SECTION_SELECTOR)).indexOf(el);
  trackEvent("section_viewed", {
    section: label.label,
    index: String(index),
    mega_label_source: label.source,
  });
}

function watchSections(): () => void {
  const timers = new Map<Element, number>();
  const seen = new Set<Element>();
  const observed = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (seen.has(el)) continue;
        const visible = sectionVisible({
          intersectionRatio: entry.intersectionRatio,
          intersectionHeight: entry.intersectionRect.height,
          rootHeight: entry.rootBounds?.height ?? window.innerHeight,
        });
        if (!visible) {
          window.clearTimeout(timers.get(el));
          timers.delete(el);
          continue;
        }
        if (timers.has(el)) continue;
        timers.set(
          el,
          window.setTimeout(() => {
            seen.add(el);
            timers.delete(el);
            reportSection(el);
          }, SECTION_DWELL_MS),
        );
      }
    },
    { threshold: SECTION_THRESHOLDS },
  );
  const observeNew = (): void => {
    document.querySelectorAll(SECTION_SELECTOR).forEach((s) => {
      if (observed.has(s)) return;
      observed.add(s);
      observer.observe(s);
    });
  };
  observeNew();
  // Sections rendered after mount (client components, streamed content).
  const mutations = new MutationObserver(observeNew);
  mutations.observe(document.body, { childList: true, subtree: true });
  return () => {
    mutations.disconnect();
    observer.disconnect();
    timers.forEach((t) => window.clearTimeout(t));
  };
}

function formKeyOf(form: HTMLFormElement): string {
  return (
    form.getAttribute("data-mega-form") ||
    form.getAttribute("name") ||
    form.id ||
    "unnamed-form"
  );
}

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function fieldOf(t: EventTarget | null): FormField | null {
  return t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement
    ? t
    : null;
}

/** The field's name and value stay here; only its class leaves. */
function classOf(f: FormField): FieldClass {
  return classifyField({
    answer: f.closest(ANSWER_SELECTOR) !== null,
    private: isPrivate(f),
    type: f.type,
    name: f.name,
    autocomplete: f.getAttribute("autocomplete") ?? "",
  });
}

function emit(calls: TrackCall[]): void {
  for (const c of calls) {
    trackEvent(c.event, c.properties, c.event === "form_abandoned" ? ABANDON_OPTIONS : undefined);
  }
}

/** Read once the submit's dispatch is over, so every handler has had its say. */
function nativeSubmitCompleted(e: Event, form: HTMLFormElement): boolean {
  const defaultPrevented = e.defaultPrevented;
  // checkValidity fires `invalid` events, so it runs only for a submit the browser performs.
  const valid = !defaultPrevented && form.checkValidity();
  return submitCompletes({ kind: "native", defaultPrevented, valid, dialog: form.method === "dialog" });
}

/**
 * Registered once and reading the live sessions, so leaving the page by tab
 * close, reload, or a client-side route change all find the same state.
 */
function watchForms(sessions: FormSessions): () => void {
  const sessionFor = (form: HTMLFormElement): FormSession => {
    let s = sessions.get(form);
    if (!s) {
      s = new FormSession(formKeyOf(form), window.location.pathname);
      sessions.set(form, s);
    }
    return s;
  };
  // A text field's value is read only to learn whether it is empty; an
  // answer control's state is never read.
  const onFocus = (e: FocusEvent) => {
    const f = fieldOf(e.target);
    if (!f?.form) return;
    const c = classOf(f);
    // A private field contributes nothing at all: no start, no count, no name.
    if (c.kind === "private") return;
    const session = sessionFor(f.form);
    emit(c.kind === "answer" ? session.touchAnswer() : session.focus(c.label));
  };
  const onBlur = (e: FocusEvent) => {
    const f = fieldOf(e.target);
    if (!f?.form) return;
    const c = classOf(f);
    if (c.kind !== "text") return;
    emit(sessionFor(f.form).blur(f, c.label, f.value.trim() !== ""));
  };
  // A submit event is only an attempt. Whether it finished the form is read
  // after the whole dispatch, so a handler anywhere (React's root listener, a
  // window listener) that cancels it to reject or fetch is seen; such forms
  // report success themselves (markFormSubmitted). The browser's own
  // navigation for an uncancelled submit waits on the network, so this runs
  // before the page can hide.
  const pending = new Set<number>();
  const onNativeSubmit = (e: Event) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const timer = window.setTimeout(() => {
      pending.delete(timer);
      if (nativeSubmitCompleted(e, form)) sessionFor(form).submitted();
    }, 0);
    pending.add(timer);
  };
  const onLeadSubmitted = (e: Event) => {
    if (e.target instanceof HTMLFormElement) sessionFor(e.target).submitted();
  };
  const onSubmitting = (e: Event) => {
    if (e.target instanceof HTMLFormElement) sessionFor(e.target).submitting();
  };
  const onSubmitFailed = (e: Event) => {
    if (e.target instanceof HTMLFormElement) emit(sessionFor(e.target).submitFailed());
  };
  const leave = (reason: LeaveReason) => emit(leaveAll(sessions.values(), reason));
  // Hiding the tab reports the abandon once, because the page may never come
  // back (notably on mobile). Returning does not take it back.
  const onVisibility = () => {
    if (document.visibilityState === "hidden") leave("hidden");
  };
  const onPageHide = () => leave("left");
  document.addEventListener("focusin", onFocus);
  document.addEventListener("focusout", onBlur);
  document.addEventListener("submit", onNativeSubmit, { capture: true });
  document.addEventListener(LEAD_SUBMITTED_EVENT, onLeadSubmitted);
  document.addEventListener(FORM_SUBMITTING_EVENT, onSubmitting);
  document.addEventListener(FORM_SUBMIT_FAILED_EVENT, onSubmitFailed);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide, { capture: true });
  return () => {
    pending.forEach((t) => window.clearTimeout(t));
    document.removeEventListener("focusin", onFocus);
    document.removeEventListener("focusout", onBlur);
    document.removeEventListener("submit", onNativeSubmit, { capture: true });
    document.removeEventListener(LEAD_SUBMITTED_EVENT, onLeadSubmitted);
    document.removeEventListener(FORM_SUBMITTING_EVENT, onSubmitting);
    document.removeEventListener(FORM_SUBMIT_FAILED_EVENT, onSubmitFailed);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide, { capture: true });
  };
}

/**
 * Site-wide tracking listeners. They exist only while tracking is enabled for
 * this deploy and analytics consent is allowed; values typed into forms are
 * never read beyond "is it empty", and no event names a field, an option or
 * an answer (src/lib/tracking/field-privacy.ts).
 */
export function TrackingListeners(): null {
  const pathname = usePathname();
  const { analyticsAllowed } = useConsent();
  const active = TRACKING_ENABLED && analyticsAllowed;
  const sessions = useRef<FormSessions>(new Map());

  useEffect(() => {
    if (!active) return;
    const openSessions = sessions.current;
    document.addEventListener("click", onClick, { capture: true });
    const stopForms = watchForms(openSessions);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      stopForms();
      openSessions.clear();
    };
  }, [active]);

  // Sections and form sessions are per page view, and the App Router keeps the
  // layout mounted across navigations: leaving a path closes its form sessions.
  useEffect(() => {
    if (!active) return;
    const openSessions = sessions.current;
    const stopSections = watchSections();
    return () => {
      stopSections();
      emit(leaveAll(openSessions.values()));
      openSessions.clear();
    };
  }, [active, pathname]);

  return null;
}
