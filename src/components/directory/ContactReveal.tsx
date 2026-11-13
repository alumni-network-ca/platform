"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { revealContact } from "@/app/profile/[id]/actions";
import { textLink } from "@/components/alumni/parts";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-wrap items-center gap-2 wrap-anywhere">
        <a className={textLink} href={`${channel === "email" ? "mailto" : "tel"}:${value}`}>
          {value}
        </a>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? copiedLabel : copyLabel}
        </Button>
        <span className="sr-only" role="status">
          {copied ? copiedLabel : ""}
        </span>
      </div>
    );

  return (
    <>
      <Button
        type="button"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await revealContact(profileId, channel);
            if ("value" in result) setValue(result.value);
            else setFailed(true);
          })
        }
      >
        {label}
      </Button>
      {failed && (
        <p className="text-xs font-semibold text-destructive" role="alert">
          {failedLabel}
        </p>
      )}
    </>
  );
}
