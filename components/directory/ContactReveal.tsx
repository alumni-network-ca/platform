"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { revealContact } from "@/app/profile/[id]/actions";

/**
 * A "Show email" or "Show phone" button (CON-02). The value is fetched only on click, one at a time, and then
 * offered as a mailto:/tel: link with a copy button.
 */
export function ContactReveal({
  profileId,
  channel,
  label,
  copyLabel,
  copiedLabel,
  failedLabel,
}: {
  profileId: string;
  channel: "email" | "phone";
  label: string;
  copyLabel: string;
  copiedLabel: string;
  failedLabel: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  if (value)
    return (
      <div className="profReveal">
        <a href={`${channel === "email" ? "mailto" : "tel"}:${value}`}>{value}</a>
        <button
          type="button"
          className="onbButton"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? copiedLabel : copyLabel}
        </button>
        <span className="srOnly" role="status">
          {copied ? copiedLabel : ""}
        </span>
      </div>
    );

  return (
    <>
      <button
        type="button"
        className="profShow"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            const result = await revealContact(profileId, channel);
            if ("value" in result) setValue(result.value);
            else setFailed(true);
          })
        }
      >
        {pending && (
          <Loader2 aria-hidden className="mr-1.5 inline-block size-4 animate-spin align-[-0.2em]" />
        )}
        {label}
      </button>
      {failed && (
        <p className="onbError" role="alert">
          {failedLabel}
        </p>
      )}
    </>
  );
}
