"use client";

import { useId, useState } from "react";
import { CODE_LENGTH } from "@/config/auth";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-[7px] text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      <div className="relative grid max-w-[340px] grid-cols-6 gap-2">
        <input
          id={id}
          // Invisible over the boxes; 16px, or iOS zooms in on focus.
          className="absolute inset-0 z-1 w-full cursor-text bg-transparent p-0 text-[1rem] text-transparent caret-transparent outline-none selection:bg-transparent"
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
            className={cn(
              "grid h-[54px] place-items-center rounded-lg border border-input bg-card text-2xl font-bold text-foreground tabular-nums",
              // The box the next digit goes into: the field's focus ring, and a blinking caret while it is empty.
              "data-current:border-ring data-current:ring-[3px] data-current:ring-ring/25",
              "data-current:empty:after:h-[26px] data-current:empty:after:w-0.5 data-current:empty:after:animate-caret data-current:empty:after:bg-ring data-current:empty:after:content-['']",
            )}
            aria-hidden="true"
            data-code-box=""
            data-current={focused && i === current ? "" : undefined}
          >
            {value[i]}
          </span>
        ))}
      </div>
    </div>
  );
}
