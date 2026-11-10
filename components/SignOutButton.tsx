"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Ends this address's session only (DEC-13), then loads `to` so the server sees the signed-out state. Drawn as a text
 * link unless `className` gives it another look.
 */
export function SignOutButton({
  to = "/",
  label = "Sign out",
  className = "textButton",
}: {
  to?: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut({ scope: "local" });
        window.location.assign(to);
      }}
    >
      {label}
    </button>
  );
}
