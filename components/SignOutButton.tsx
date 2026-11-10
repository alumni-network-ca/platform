"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Ends this address's session only (DEC-13), then loads `to` so the server sees the signed-out state. A text link
 * unless `variant` gives it a button's look.
 */
export function SignOutButton({
  to = "/",
  label = "Sign out",
  variant = "link",
  size,
  className,
}: {
  to?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut({ scope: "local" });
        window.location.assign(to);
      }}
    >
      {label}
    </Button>
  );
}
