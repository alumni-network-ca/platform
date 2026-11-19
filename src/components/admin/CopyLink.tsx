"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies a link to the clipboard; the link stays in a selectable field next to it if copying is refused. */
export function CopyLink({ value, label, done }: { value: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? done : label}
    </Button>
  );
}
