"use client";

import { useRef, useState } from "react";
import { BRAND , telHref } from "@/lib/content";
import type { FormField } from "@/lib/pages";
import CaptchaWidget, { type CaptchaHandle } from "@/components/CaptchaWidget";
import { StrategyCallContactFields } from "./strategy-call-contact-fields";
import { useMegaLeadForm, HONEYPOT_FIELD_NAME } from "@/hooks/useMegaLeadForm";
import { clientVerificationRoute } from "@/lib/captcha/client-route";
import { forwardExistingLeadEndpoint } from "@/lib/legacyLeadHandoff";
import {
  EMPTY_STRATEGY_CALL as EMPTY,
  validateStrategyCall as validate,
  type StrategyCallFields as Fields,
  type StrategyCallErrors,
} from "@/lib/strategyCallValidation";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Lead capture for both homepage directions.
 *
 * One component with a tone switch rather than a per-variant copy: the two
 * directions differ only in surface colour, and two separate form
 * implementations would drift apart the moment either is edited.
 */
export type FormTone = "ledger" | "atlas";

type Status = "idle" | "invalid" | "sending" | "sent" | "ignored" | "failed";

/** What a form hands the visitor once it is submitted — the guide PDF. */
export type FormDelivery = { readonly href: string; readonly label: string };

const SELECT_STYLE: React.CSSProperties = {
  // Native chevron removed: an OS-drawn arrow is the one control that would
  // not match the rest of the field set.
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23c8a65a' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 1rem center",
};

/** Career stage drives what a first conversation is actually about. */
const CAREER_STAGES = [
  "Resident or fellow",
  "Early-career physician",
  "Established physician",
  "Practice owner",
  "Approaching retirement",
] as const;

export function StrategyCallForm({
  tone,
  intent = "Strategy call request",
  submitLabel = "Request a strategy call",
  extraFields: pageFields = [],
  delivery,
}: {
  /** Optional page-specific questions — the practice pages' handoff lists them. */
  extraFields?: readonly FormField[];
  delivery?: FormDelivery;
  tone: FormTone;
  /** The button's own words. Defaults to the homepage's. */
  submitLabel?: string;
  /**
   * What this submission is for. Four pages now share this form — the strategy
   * call, the contact page, the consultation request and the gated guide — and
   * an enquiry that reaches the practice's inbox subject-lined "Strategy call
   * request" when it was a guide request is a lead misrouted at the first step.
   * Carried into the lead payload and the dataLayer event.
   */
  intent?: string;
}): React.JSX.Element {
  const isLedger = tone === "ledger";
  // Some existing pages ask for optional phone. The required contact field now
  // owns that key, so never render a second input with a conflicting value.
  const extraFields = pageFields.filter((question) => !Object.hasOwn(EMPTY, question.name));
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Fields>(EMPTY);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<StrategyCallErrors>({});
  const captchaRef = useRef<CaptchaHandle>(null);
  const inFlightRef = useRef(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const { submit } = useMegaLeadForm();
  const [status, setStatus] = useState<Status>("idle");

  const field = isLedger
    ? "w-full rounded-sm border border-ivory/25 bg-ink/40 px-4 py-3 font-body text-[15px] text-ivory placeholder:text-ivory/40 transition-colors duration-150 hover:border-ivory/40 focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    : "w-full rounded-sm border border-ink/20 bg-white px-4 py-3 font-body text-[15px] text-ink placeholder:text-charcoal/50 transition-colors duration-150 hover:border-ink/40 focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink";
  const label = `mb-1.5 block font-body text-[13px] font-medium ${
    isLedger ? "text-ivory/80" : "text-charcoal"
  }`;
  const errorText = `mt-1.5 block font-body text-[12px] ${
    isLedger ? "text-gold" : "text-danger"
  }`;

  function update<K extends keyof Fields>(key: K, value: string): void {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /** Validate first, then hand the browser a real submit event. */
  function validateBeforeSubmit(): boolean {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus("invalid");
      const firstKey = Object.keys(found)[0] as keyof Fields;
      // After React commits, not during the click: focusing synchronously lands
      // the reader on a field whose aria-invalid and aria-describedby have not
      // rendered yet, so the error is never announced.
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      });
      return false;
    }
    return true;
  }

  function handleRequest(): void {
    if (inFlightRef.current || !validateBeforeSubmit()) return;
    formRef.current?.requestSubmit();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (inFlightRef.current || !validateBeforeSubmit()) return;
    inFlightRef.current = true;
    setStatus("sending");
    try {
      const minted = await captchaRef.current?.getToken("lead_submit");
      const captchaToken = typeof minted === "string" && minted.length > 0
        ? minted : clientVerificationRoute() === "recaptcha" ? "" : null;
      if (captchaToken === null) throw new Error("Security check is not ready.");
      const honeypot = formRef.current?.elements.namedItem(HONEYPOT_FIELD_NAME);
      const result = await submit({
        ...extras, ...values, intent, formKey: "contact-form", captchaToken,
        [HONEYPOT_FIELD_NAME]: honeypot instanceof HTMLInputElement ? honeypot.value : "",
      });
      if (result.ok !== true) throw new Error("Submission not confirmed.");
      if (result.ignored) { setStatus("ignored"); return; }
      confirmSuccess();
    } catch (error) {
      console.error("Protected lead submission failed", error);
      setStatus("failed");
      captchaRef.current?.reset();
    } finally {
      inFlightRef.current = false;
    }
  }

  function confirmSuccess(): void {
    void forwardExistingLeadEndpoint(values, extras, intent);
    setStatus("sent");
    setValues(EMPTY);
    setExtras({});
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "form_submission", formIntent: intent });
    } catch {
      console.warn("Conversion tracking failed after confirmed lead delivery");
    }
  }

  if (status === "sent" || status === "ignored") {
    return (
      <div role="status" aria-live="polite">
        <p
          className={`font-body text-[15px] leading-relaxed ${
            isLedger ? "text-ivory" : "text-ink"
          }`}
        >
          {status === "ignored" ? (
            "Request received."
          ) : delivery ? (
            "Request received. Your guide is ready."
          ) : (
            <>
              Request received. {BRAND.name} will reply within one business day, usually
              sooner. If it is urgent, call{" "}
              <a className="underline underline-offset-4" href={telHref()}>
                {BRAND.phone}
              </a>
              .
            </>
          )}
        </p>
        {delivery && status === "sent" ? <DeliveryLink delivery={delivery} /> : null}
      </div>
    );
  }

  return (
    <form ref={formRef} method="post" action="/api/lead" onSubmit={handleSubmit} noValidate className="grid gap-5">
      {/* Spam trap. Positioned off-screen rather than display:none so bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="company-website">Company website</label>
        <input id="company-website" name={HONEYPOT_FIELD_NAME} tabIndex={-1} autoComplete="off" />
      </div>

      <StrategyCallContactFields
        values={values}
        errors={errors}
        fieldClass={field}
        labelClass={label}
        errorClass={errorText}
        onChange={update}
      />

      <div>
        <label className={label} htmlFor="careerStage">
          Where are you now?
        </label>
        <select
          id="careerStage"
          name="careerStage"
          required
          style={SELECT_STYLE}
          className={`${field} appearance-none pr-11`}
          value={values.careerStage}
          aria-invalid={Boolean(errors.careerStage)}
          aria-describedby={errors.careerStage ? "careerStage-error" : undefined}
          onChange={(event) => update("careerStage", event.target.value)}
        >
          <option value="">Select a career stage</option>
          {CAREER_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        {errors.careerStage ? (
          <span id="careerStage-error" className={errorText}>
            {errors.careerStage}
          </span>
        ) : null}
      </div>

      {extraFields.length ? (
        // items-end: a label that wraps to two lines must not push its field
        // below its neighbour's. An odd last field takes the whole row.
        <div className="grid gap-5 sm:grid-cols-2 sm:items-end sm:[&>*:last-child:nth-child(odd)]:col-span-2">
          {extraFields.map((f) => (
            <ExtraFieldInput
              key={f.name}
              field={f}
              value={extras[f.name] ?? ""}
              inputClass={field}
              labelClass={label}
              optionalClass={isLedger ? "text-ivory/60" : "text-charcoal/75"}
              onChange={(value) => setExtras((prev) => ({ ...prev, [f.name]: value }))}
            />
          ))}
        </div>
      ) : null}

      <div>
        <label className={label} htmlFor="notes">
          What would you like to cover?{" "}
          <span className={isLedger ? "text-ivory/60" : "text-charcoal/75"}>Optional</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={`${field} resize-y`}
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </div>

      <CaptchaWidget ref={captchaRef} onReady={setCaptchaReady} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleRequest}
          disabled={status === "sending" || !captchaReady}
          className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm px-6 py-3 font-body text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            isLedger
              ? "bg-gold text-ink hover:bg-gold-hover focus-visible:ring-gold focus-visible:ring-offset-ink"
              : "bg-ink text-ivory hover:bg-ink-hover focus-visible:ring-ink focus-visible:ring-offset-white"
          }`}
        >
          {status === "sending" ? "Sending…" : submitLabel}
        </button>
        <p
          className={`font-body text-[12px] leading-relaxed ${
            isLedger ? "text-ivory/55" : "text-charcoal/70"
          }`}
        >
          {delivery ? "The guide downloads as soon as you send the request." : `No obligation. ${BRAND.hours}.`}
        </p>
      </div>

      {status === "invalid" ? (
        <p role="alert" aria-live="assertive" className={errorText}>
          Check the highlighted fields and request again.
        </p>
      ) : null}

      {status === "failed" ? (
        <p
          role="alert"
          aria-live="assertive"
          className={`font-body text-[13px] leading-relaxed ${
            isLedger ? "text-ivory/80" : "text-charcoal"
          }`}
        >
          We couldn’t send your request. Please try again, email{" "}
          <a className="underline underline-offset-4" href={`mailto:${BRAND.email}`}>
            {BRAND.email}
          </a>{" "}
          or call{" "}
          <a className="underline underline-offset-4" href={telHref()}>
            {BRAND.phone}
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}

/** One optional page-specific question: a select where the source lists choices. */
function ExtraFieldInput({
  field,
  value,
  inputClass,
  labelClass,
  optionalClass,
  onChange,
}: {
  field: FormField;
  value: string;
  inputClass: string;
  labelClass: string;
  optionalClass: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const id = `extra-${field.name}`;
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {field.label} <span className={optionalClass}>Optional</span>
      </label>
      {field.options ? (
        <select
          id={id}
          name={field.name}
          style={SELECT_STYLE}
          className={`${inputClass} appearance-none pr-11`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={field.name}
          type={field.type ?? "text"}
          className={inputClass}
          value={value}
          autoComplete={field.type === "tel" ? "tel" : "off"}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

/** The guide itself. The download is the conversion the blueprint asks to track. */
function DeliveryLink({ delivery }: { delivery: FormDelivery }): React.JSX.Element {
  return (
    <a
      href={delivery.href}
      download
      onClick={() => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "guide_download", guideTitle: delivery.label });
      }}
      className="mt-5 inline-flex min-h-12 items-center rounded-sm bg-gold px-6 font-body text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-gold-hover focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
    >
      {delivery.label}
    </a>
  );
}
