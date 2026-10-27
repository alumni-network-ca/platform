"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
// Legacy schema until ONB-03 (#106) rewires it.
import { createLegacyClient as createClient } from "@/lib/supabase/client";

function RequestAccessContent() {
  const params = useSearchParams();

  const [email, setEmail] = useState(params.get("email") || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  async function submitRequest(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("request_alumni_access", {
      p_email: email,
      p_first_name: firstName,
      p_last_name: lastName,
      p_grad_year: gradYear ? Number(gradYear) : null,
      p_note: note || null,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSubmitted(true);
  }

  return (
    <>
      <Nav />

      <main className="authPage">
        <section className="authCard">
          <div className="eyebrow">Alumni verification</div>

          {submitted ? (
            <>
              <h1>Request received.</h1>

              <p className="muted">
                Your information has been sent to the Herzliah alumni team for review.
              </p>

              <p>
                Once your alumni record is verified, you can be given access to claim and complete
                your profile.
              </p>

              <div className="authFooter">
                <Link href="/">← Home</Link>
                <Link href="/login">Sign in</Link>
              </div>
            </>
          ) : (
            <>
              <h1>Request verification.</h1>

              <p className="muted">
                We couldn&apos;t automatically match your email to an alumni record. Give us a few
                details so the Herzliah alumni team can verify your information.
              </p>

              <form onSubmit={submitRequest} className="authForm">
                <label>
                  First name
                  <input
                    className="input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Last name
                  <input
                    className="input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Email address
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Herzliah graduation year
                  <input
                    className="input"
                    type="number"
                    min="1950"
                    max="2100"
                    placeholder="Example: 2022"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                  />
                </label>

                <label>
                  Anything else that can help us verify you?
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="For example: previous email address, maiden name, class information..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>

                <button className="btn btnPrimary btnWide" disabled={loading}>
                  {loading ? "Sending…" : "Submit verification request"}
                </button>

                {message && (
                  <div className="notice" role="alert">
                    {message}
                  </div>
                )}
              </form>

              <div className="authFooter">
                <Link href="/claim">← Back to claim profile</Link>
                <Link href="/login">Already have an account?</Link>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default function RequestAccessPage() {
  return (
    <Suspense fallback={null}>
      <RequestAccessContent />
    </Suspense>
  );
}
