"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/Nav";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/directory";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(
        error.message === "Invalid login credentials"
          ? "The email or password is incorrect."
          : error.message
      );
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function resetPassword() {
    if (!email) {
      setMessage("Enter your email first, then click Forgot password.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    setMessage(
      error
        ? error.message
        : "Password reset email sent. Check your inbox."
    );
  }

  return (
    <>
      <Nav />

      <main className="authPage">
        <section className="authCard">
          <div className="eyebrow">Member access</div>

          <h1>Welcome back.</h1>

          <p className="muted">
            Sign in to search the private directory, manage your profile and
            control how other alumni can contact you.
          </p>

          <form onSubmit={submit} className="authForm">
            <label>
              Email address
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button
              className="btn btnPrimary btnWide"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <button
              type="button"
              className="textButton"
              onClick={resetPassword}
            >
              Forgot password?
            </button>

            {message && (
              <div className="notice" role="alert">
                {message}
              </div>
            )}
          </form>

          <div className="authFooter">
            <Link href="/">← Home</Link>
            <Link href="/claim">First time here? Claim your profile</Link>
          </div>
        </section>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
