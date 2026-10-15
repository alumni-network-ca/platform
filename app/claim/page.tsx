"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

export default function ClaimPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [found, setFound] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/onboarding");
      }
    });
  }, [router]);

  async function checkClaim() {
    setLoading(true);
    setStatus("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc("find_claimable_profile", {
      p_email: email,
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (!data || data.length === 0) {
      setFound(false);
      setStatus("NO_MATCH");
      return;
    }

    setFound(true);
    setStatus("Match found. Create a password to activate your account.");
  }

  async function createAccount() {
    if (password.length < 8) {
      setStatus("Choose a password with at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setStatus("The two passwords don't match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setStatus(
      "Account created. Check your email to verify your address, then you'll continue to onboarding.",
    );
  }

  return (
    <>
      <Nav />

      <main className="page claimPage">
        <div className="claimIntro">
          <div className="eyebrow">First-time alumni access</div>

          <h1>Claim your profile.</h1>

          <p className="muted">
            Herzliah can start with a private alumni record. You verify that the email belongs to
            you, create your account, then decide what appears in the directory.
          </p>

          <div className="stepList">
            <span>1</span>
            <div>
              <strong>Match your record</strong>
              <p>Use the email Herzliah has on file.</p>
            </div>

            <span>2</span>
            <div>
              <strong>Verify your account</strong>
              <p>Create a password and confirm your email.</p>
            </div>

            <span>3</span>
            <div>
              <strong>Complete your profile</strong>
              <p>Add career information, privacy settings and what you&apos;re open to.</p>
            </div>
          </div>
        </div>

        <section className="authCard">
          <h2>{found ? "Create your account" : "Find your alumni record"}</h2>

          {!found ? (
            <>
              <label className="fieldLabel">
                Email address
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setStatus("");
                  }}
                  placeholder="you@example.com"
                />
              </label>

              <button
                className="btn btnPrimary btnWide"
                disabled={loading || !email}
                onClick={checkClaim}
              >
                {loading ? "Checking…" : "Find my record"}
              </button>
            </>
          ) : (
            <>
              <div className="matchCard">
                ✓ Alumni record matched to <strong>{email}</strong>
              </div>

              <label className="fieldLabel">
                Create password
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <label className="fieldLabel">
                Confirm password
                <input
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>

              <button className="btn btnPrimary btnWide" disabled={loading} onClick={createAccount}>
                {loading ? "Creating account…" : "Create account & continue"}
              </button>

              <button
                className="textButton"
                onClick={() => {
                  setFound(false);
                  setPassword("");
                  setConfirm("");
                  setStatus("");
                }}
              >
                Use a different email
              </button>
            </>
          )}

          {status === "NO_MATCH" ? (
            <div className="notice">
              <strong>We couldn’t automatically match your email.</strong>

              <p>
                Your email may be different from the one Herzliah has on file, or your alumni record
                may need to be reviewed.
              </p>

              <button
                type="button"
                className="btn btnPrimary btnWide"
                onClick={() => router.push(`/request-access?email=${encodeURIComponent(email)}`)}
              >
                Request verification
              </button>
            </div>
          ) : status ? (
            <div className="notice">{status}</div>
          ) : null}

          <div className="authFooter">
            <Link href="/">← Home</Link>
            <Link href="/login">Already have an account?</Link>
          </div>
        </section>
      </main>
    </>
  );
}
