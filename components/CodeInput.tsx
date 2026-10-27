"use client";

import { useId, useState } from "react";

export const CODE_LENGTH = 6;

/**
 * An emailed one-time code, shown as six boxes. Underneath is one ordinary input, so paste, the browser's
 * one-time-code autofill, the keyboard and screen readers all work as for any text field; the boxes only
 * draw its value. The boxes stay outside the <label>, so the digits never become part of its name.
 */
export function CodeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  // The box the next digit goes into; the last box once the code is complete.
  const current = Math.min(value.length, CODE_LENGTH - 1);
  return (
    <div className="codeField">
      <label htmlFor={id}>{label}</label>
      <div className="codeInput">
        <input
          id={id}
          className="codeInputField"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`[0-9]{${CODE_LENGTH}}`}
          spellCheck={false}
          value={value}
          // No maxLength: it would cut a pasted "123 456" before the spaces are removed.
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
        />
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <span
            key={i}
            className="codeBox"
            aria-hidden="true"
            data-current={focused && i === current ? "" : undefined}
          >
            {value[i]}
          </span>
        ))}
      </div>
    </div>
  );
}
