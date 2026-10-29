"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Ends this address's session only (DEC-13), then loads `to` so the server sees the signed-out state. */
export function SignOutButton({ to = "/", label = "Sign out" }: { to?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="textButton"
      disabled={busy}
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
