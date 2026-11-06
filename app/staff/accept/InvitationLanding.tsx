"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { format, type Locale, type translations } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Copy = (typeof translations)[Locale]["staffInvite"];

/**
 * The way in from a staff invitation link, signed out (A6.1): create an account with the invited address, or sign
 * in to an existing one. Both lead back to the invitation, which checks the address again before accepting.
 */
export function InvitationLanding({
  t,
  email,
  inviter,
  next,
}: {
  t: Copy;
  email: string;
  inviter: string;
  /** This invitation's page, where both paths return. */
  next: string;
}) {
  const [existing, setExisting] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password });
      if (error) {
        setBusy(false);
        setMessage(error.status === 429 ? t.tooMany : t.wrongPassword);
        return;
      }
      // A full load lets the server read the new session cookies before routing back to the invitation.
      const home = `/auth/home?next=${encodeURIComponent(next)}`;
      window.location.assign(new URL(home, window.location.origin));
    } catch {
      setBusy(false);
      setMessage(t.failed);
    }
  }

  return (
    <section className="joinCard" aria-labelledby="invite-account-title">
      <div className="joinStack">
        <span className="joinEyebrow">{format(t.stepOfTwo, { step: 1 })}</span>
        <h2 id="invite-account-title">{existing ? t.signInTitle : t.createTitle}</h2>
        <p className="muted">{existing ? t.signInLead : t.createLead}</p>
      </div>
      <div className="inviteSwitch" role="group" aria-label={t.choose}>
        <button type="button" aria-pressed={!existing} onClick={() => setExisting(false)}>
          {t.newTab}
        </button>
        <button type="button" aria-pressed={existing} onClick={() => setExisting(true)}>
          {t.existingTab}
        </button>
      </div>
      {existing ? (
        <form onSubmit={signIn} className="authForm">
          <label>
            {t.email}
            <Input type="email" autoComplete="username" readOnly value={email} />
          </label>
          <label>
            {t.password}
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <Button size="lg" className="w-full" disabled={busy}>
            {busy ? t.signingIn : t.signInButton}
          </Button>
          {message && (
            <div className="notice" role="alert">
              {message}
            </div>
          )}
          <div className="authFooter">
            <Link href="/forgot-password">{t.forgot}</Link>
          </div>
        </form>
      ) : (
        <div className="authForm">
          <label>
            {t.email}
            <Input type="email" readOnly value={email} aria-describedby="invite-fixed-email" />
          </label>
          <p id="invite-fixed-email" className="microcopy muted">
            {format(t.fixedEmail, { inviter })}
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href={`/join?next=${encodeURIComponent(next)}`}>{t.createButton}</Link>
          </Button>
        </div>
      )}
      <p className="joinNotice">{format(t.onlyFor, { email })}</p>
      <p className="microcopy muted">{t.notExpecting}</p>
    </section>
  );
}
