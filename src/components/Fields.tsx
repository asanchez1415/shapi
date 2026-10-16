"use client";

import { useId } from "react";

type Common = {
  label: string;
  hint?: string;
  error?: string | null;
};

function Wrap({ label, hint, error, id, children }: Common & { id: string; children: React.ReactNode }) {
  return (
    <div className={`sh-field${error ? " sh-field-invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <div className="sh-field-hint">{hint}</div>}
      {error && <div className="sh-field-error">{error}</div>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  inputMode,
  maxLength,
  ...rest
}: Common & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  inputMode?: "text" | "numeric" | "decimal";
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Wrap label={label} id={id} {...rest}>
      <div className="sh-field-box">
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span className="sh-field-unit">{unit}</span>}
      </div>
    </Wrap>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  ...rest
}: Common & { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  const id = useId();
  return (
    <Wrap label={label} id={id} {...rest}>
      <div className="sh-field-box sh-field-area">
        <textarea
          id={id}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Wrap>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  ...rest
}: Common & { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <Wrap label={label} id={id} {...rest}>
      <div className="sh-field-box sh-select">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </Wrap>
  );
}
