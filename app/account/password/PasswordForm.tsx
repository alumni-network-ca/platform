"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

// A password is optional (ADR 0015): it saves an email on each sign-in. A forgotten one is replaced the same way,
// after signing in with a code, so there is no reset link. Supabase checks the length (minimum_password_length)
// and, with secure_password_change, asks for a recent sign-in before a change.

export const MIN_PASSWORD_LENGTH = 10;

const TEXT = {
  en: {
    title: "Your password",
    intro: (email: string) =>
      `Set a password to sign in as ${email} without waiting for a code. You can still use a code at any time.`,
    password: "New password",
    hint: `At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words make a strong one.`,
    confirm: "Type it again",
    save: "Save my password",
    saving: "Saving…",
    saved: "Your password is saved. Next time, choose “Sign in with a password”.",
    mismatch: "The two passwords are different.",
    weak: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    same: "That is already your password.",
    reauth: "For your security, sign out and sign in again, then set your password.",
    failed: "Something went wrong. Please try again.",
    email: "Change your sign-in email",
  },
  fr: {
    title: "Votre mot de passe",
    intro: (email: string) =>
      `Choisissez un mot de passe pour vous connecter en tant que ${email} sans attendre de code. Vous pouvez toujours utiliser un code.`,
    password: "Nouveau mot de passe",
    hint: `Au moins ${MIN_PASSWORD_LENGTH} caractères. Quelques mots sans lien entre eux en font un solide.`,
    confirm: "Tapez-le de nouveau",
    save: "Enregistrer mon mot de passe",
    saving: "Enregistrement…",
    saved:
      "Votre mot de passe est enregistré. La prochaine fois, choisissez « Se connecter avec un mot de passe ».",
    mismatch: "Les deux mots de passe sont différents.",
    weak: `Choisissez un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    same: "C'est déjà votre mot de passe.",
    reauth:
      "Par sécurité, déconnectez-vous et reconnectez-vous, puis choisissez votre mot de passe.",
    failed: "Une erreur est survenue. Veuillez réessayer.",
    email: "Changer votre adresse de connexion",
  },
};

export function PasswordForm({ email }: { email: string }) {
  const { locale } = useLanguage();
  const t = TEXT[locale];
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setSaved(false);
    if (password !== confirm) return setMessage(t.mismatch);
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const messages: Record<string, string> = {
        weak_password: t.weak,
        same_password: t.same,
        reauthentication_needed: t.reauth,
      };
      return setMessage(messages[error.code ?? ""] ?? t.failed);
    }
    setPassword("");
    setConfirm("");
    setSaved(true);
  }

  return (
    <>
      <h1>{t.title}</h1>
      <p className="muted">{t.intro(email)}</p>
      <form onSubmit={save} className="authForm">
        {/* Tells password managers which account the new password belongs to. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label>
          {t.password}
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <p id="password-hint" className="muted microcopy">
          {t.hint}
        </p>
        <label>
          {t.confirm}
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        <button className="btn btnPrimary btnWide" disabled={busy}>
          {busy ? t.saving : t.save}
        </button>
      </form>
      {saved && (
        <p className="notice" role="status">
          {t.saved}
        </p>
      )}
      {message && (
        <div className="notice" role="alert">
          {message}
        </div>
      )}
      <div className="authFooter">
        <Link href="/account/email">{t.email}</Link>
      </div>
    </>
  );
}
