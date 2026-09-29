"use client";

import { useRef, useState } from "react";
import { BRAND , telHref } from "@/lib/content";

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

type Status = "idle" | "invalid" | "sending" | "sent" | "failed";

/** Career stage drives what a first conversation is actually about. */
const CAREER_STAGES = [
  "Resident or fellow",
  "Early-career physician",
  "Established physician",
  "Practice owner",
  "Approaching retirement",
] as const;

type Fields = {
  fullName: string;
  email: string;
  careerStage: string;
  notes: string;
};

const EMPTY: Fields = { fullName: "", email: "", careerStage: "", notes: "" };

/** Endpoint is injected at build time; absent in the review builds. */
const ENDPOINT = process.env.NEXT_PUBLIC_LEAD_ENDPOINT;

function validate(values: Fields): Partial<Record<keyof Fields, string>> {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (!values.fullName.trim()) errors.fullName = "Enter your name.";
  if (!values.email.trim()) {
    errors.email = "Enter an email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = "That email address looks incomplete.";
  }
  if (!values.careerStage) errors.careerStage = "Choose a career stage.";
  return errors;
}

/** Falls back to the practice's inbox so a message is never silently lost. */
function mailtoHandoff(values: Fields, intent: string): string {
  const body = [
    `Name: ${values.fullName}`,
    `Email: ${values.email}`,
    `Career stage: ${values.careerStage}`,
    values.notes.trim() ? `\n${values.notes.trim()}` : "",
  ].join("\n");
  return `mailto:${BRAND.email}?subject=${encodeURIComponent(
    intent,
  )}&body=${encodeURIComponent(body)}`;
}

export function StrategyCallForm({
  tone,
  intent = "Strategy call request",
  submitLabel = "Request a strategy call",
}: {
  tone: FormTone;
  /** The button's own words. Defaults to the homepage's. */
  submitLabel?: string;
  /**
   * What this submission is for. Four pages now share this form — the strategy
   * call, the contact page, the consultation request and the gated guide — and
   * an enquiry that reaches the practice's inbox subject-lined "Strategy call
   * request" when it was a guide request is a lead misrouted at the first step.
   * Carried into the mailto subject and the dataLayer event.
   */
  intent?: string;
}): React.JSX.Element {
  const isLedger = tone === "ledger";
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<Status>("idle");

  const field = isLedger
    ? "w-full rounded-sm border border-ivory/25 bg-ink/40 px-4 py-3 font-body text-[15px] text-ivory placeholder:text-ivory/40 transition-colors duration-150 hover:border-ivory/40 focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    : "w-full rounded-sm border border-ink/20 bg-white px-4 py-3 font-body text-[15px] text-ink placeholder:text-charcoal/50 transition-colors duration-150 hover:border-ink/40 focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold";
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
  function handleRequest(): void {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus("invalid");
      const firstKey = Object.keys(found)[0] as keyof Fields;
      formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      return;
    }
    formRef.current?.requestSubmit();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!ENDPOINT) {
      // No endpoint wired yet. Hand off to email rather than report a success
      // that never happened.
      window.location.href = mailtoHandoff(values, intent);
      setStatus("failed");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(`Lead endpoint returned ${response.status}`);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "form_submission", formIntent: intent });
      setStatus("sent");
      setValues(EMPTY);
    } catch {
      setStatus("failed");
    }
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        aria-live="polite"
        className={`font-body text-[15px] leading-relaxed ${
          isLedger ? "text-ivory" : "text-ink"
        }`}
      >
        Request received. {BRAND.name} will reply within one business day, usually
        sooner. If it is urgent, call{" "}
        <a className="underline underline-offset-4" href={telHref()}>
          {BRAND.phone}
        </a>
        .
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-5">
      {/* Spam trap. Positioned off-screen rather than display:none so bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="company-website">Company website</label>
        <input id="company-website" name="companyWebsite" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="fullName">
            Name
          </label>
          <input
            id="fullName"
            name="fullName"
            className={field}
            value={values.fullName}
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            onChange={(event) => update("fullName", event.target.value)}
          />
          {errors.fullName ? (
            <span id="fullName-error" className={errorText}>
              {errors.fullName}
            </span>
          ) : null}
        </div>

        <div>
          <label className={label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className={field}
            value={values.email}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            onChange={(event) => update("email", event.target.value)}
          />
          {errors.email ? (
            <span id="email-error" className={errorText}>
              {errors.email}
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="careerStage">
          Where are you now?
        </label>
        <select
          id="careerStage"
          name="careerStage"
          // Native chevron removed: an OS-drawn arrow is the one control that
          // would not match the rest of the field set.
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23c8a65a' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 1rem center",
          }}
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

      <div>
        <label className={label} htmlFor="notes">
          What would you like to cover?{" "}
          <span className={isLedger ? "text-ivory/45" : "text-charcoal/60"}>Optional</span>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleRequest}
          disabled={status === "sending"}
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
          No obligation. {BRAND.hours}.
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
          This form opens your email app to send the request. If nothing opened,
          email{" "}
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
