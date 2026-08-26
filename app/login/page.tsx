"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/Nav";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message === "Invalid login credentials" ? "The email or password is incorrect." : error.message);
      return;
    }
    router.push("/directory");
    router.refresh();
  }

  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <div className="eyebrow">Member access</div>
          <h1>Welcome back.</h1>
          <p className="muted">Sign in with the email and password attached to your Herzliah Alumni Network account.</p>
          <form onSubmit={submit} className="authForm">
            <label>Email address<input className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>Password<input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
            <button className="btn btnPrimary btnWide" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
            {message && <div className="notice" role="alert">{message}</div>}
          </form>
          <div className="authFooter"><Link href="/">← Back to home</Link><Link href="/claim">Need to claim your profile?</Link></div>
        </section>
      </main>
    </>
  );
}
