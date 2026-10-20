"use client";

import { EMAIL_PATTERN, formatPhone } from "@/lib/leadValidation";
import type { StrategyCallErrors, StrategyCallFields } from "@/lib/strategyCallValidation";

const PHONE_PATTERN = String.raw`(?:[0-9]{10}|\([0-9]{3}\) [0-9]{3}-[0-9]{4})`;

const CONTACT_FIELDS = [
  { name: "firstName", label: "First name", type: "text", autoComplete: "given-name" },
  { name: "lastName", label: "Last name", type: "text", autoComplete: "family-name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel-national" },
] as const;

/** Retains both existing visual tones while giving each required contact field its own key. */
export function StrategyCallContactFields({ values, errors, fieldClass, labelClass, errorClass, onChange }: {
  values: StrategyCallFields;
  errors: StrategyCallErrors;
  fieldClass: string;
  labelClass: string;
  errorClass: string;
  onChange: (key: keyof StrategyCallFields, value: string) => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {CONTACT_FIELDS.map(({ name, label, type, autoComplete }) => (
        <div key={name}>
          <label className={labelClass} htmlFor={name}>{label}</label>
          <input
            id={name}
            name={name}
            type={type}
            inputMode={type === "email" ? "email" : type === "tel" ? "tel" : "text"}
            className={fieldClass}
            value={values[name]}
            autoComplete={autoComplete}
            required
            pattern={name === "email" ? EMAIL_PATTERN : name === "phone" ? PHONE_PATTERN : undefined}
            maxLength={type === "text" ? 200 : undefined}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            onChange={(event) => onChange(name, name === "phone" ? formatPhone(event.target.value) : event.target.value)}
          />
          {errors[name] ? <span id={`${name}-error`} className={errorClass}>{errors[name]}</span> : null}
        </div>
      ))}
    </div>
  );
}
