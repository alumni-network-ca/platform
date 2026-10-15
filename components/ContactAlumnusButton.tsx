"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ContactAlumnusButton({ profileId }: { profileId: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function revealEmail() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc("reveal_contact_email", {
      p_profile_id: profileId,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEmail(data);
  }

  if (email) {
    return (
      <div>
        <a className="btn btnPrimary btnWide" href={`mailto:${email}`}>
          Email {email}
        </a>

        <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          Contact initiated through the Herzliah Alumni Network.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btnPrimary btnWide" onClick={revealEmail} disabled={loading}>
        {loading ? "Loading…" : "Contact alumnus"}
      </button>

      {error && (
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
