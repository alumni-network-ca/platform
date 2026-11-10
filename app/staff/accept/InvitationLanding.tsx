"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { format, type Locale, type translations } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AuthCard,
  Callout,
  Footer,
  cardTitle,
  eyebrow,
  fine,
  footerLink,
  form,
  label,
  muted,
  stack,
} from "@/components/auth/parts";
import { Alert } from "@/components/ui/alert";

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
    <AuthCard size="compact" aria-labelledby="invite-account-title">
      <div className={stack({ compact: true })}>
        <span className={eyebrow}>{format(t.stepOfTwo, { step: 1 })}</span>
        <h2 id="invite-account-title" className={cardTitle}>
          {existing ? t.signInTitle : t.createTitle}
        </h2>
        <p className={muted}>{existing ? t.signInLead : t.createLead}</p>
      </div>
      {/* Two buttons that work as one switch: new account or existing one. */}
      <div
        className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
        role="group"
        aria-label={t.choose}
      >
        {(
          [
            [false, t.newTab],
            [true, t.existingTab],
          ] as const
        ).map(([value, text]) => (
          <button
            key={text}
            type="button"
            aria-pressed={existing === value}
            onClick={() => setExisting(value)}
            className="min-h-[42px] cursor-pointer rounded-sm text-base font-bold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/45 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {text}
          </button>
        ))}
      </div>
      {existing ? (
        <form onSubmit={signIn} className={form({ compact: true })}>
          <label className={label}>
            {t.email}
            <Input type="email" autoComplete="username" readOnly value={email} />
          </label>
          <label className={label}>
            {t.password}
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <Button size="lg" className="w-full" loading={busy}>
            {busy ? t.signingIn : t.signInButton}
          </Button>
          {message && (
            <Alert variant="error" role="alert">
              {message}
            </Alert>
          )}
          <Footer>
            <Link className={footerLink} href="/forgot-password">
              {t.forgot}
            </Link>
          </Footer>
        </form>
      ) : (
        <div className={form({ compact: true })}>
          <label className={label}>
            {t.email}
            <Input type="email" readOnly value={email} aria-describedby="invite-fixed-email" />
          </label>
          <p id="invite-fixed-email" className={fine}>
            {format(t.fixedEmail, { inviter })}
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href={`/join?next=${encodeURIComponent(next)}`}>{t.createButton}</Link>
          </Button>
        </div>
      )}
      <Callout as="p" compact>
        {format(t.onlyFor, { email })}
      </Callout>
      <p className={fine}>{t.notExpecting}</p>
    </AuthCard>
  );
}
