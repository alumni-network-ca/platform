"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { MIN_PASSWORD_LENGTH } from "@/config/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForwardArrow } from "@/components/icons";
import {
  Footer,
  fine,
  footerLink,
  form,
  label,
  muted,
  pageTitle,
  stack,
} from "@/components/auth/parts";
import { Alert } from "@/components/ui/alert";

// Also used after an email recovery link. Supabase requires a recent sign-in for a password change.

const TEXT = {
  en: {
    title: "Your password",
    intro: (email: string) => `Choose the password you will use to sign in as ${email}.`,
    password: "New password",
    hint: `At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words make a strong one.`,
    confirm: "Type it again",
    save: "Save my password",
    saving: "Saving…",
    saved: "Your password is saved. Use it the next time you sign in.",
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
      `Choisissez le mot de passe que vous utiliserez pour vous connecter en tant que ${email}.`,
    password: "Nouveau mot de passe",
    hint: `Au moins ${MIN_PASSWORD_LENGTH} caractères. Quelques mots sans lien entre eux en font un solide.`,
    confirm: "Tapez-le de nouveau",
    save: "Enregistrer mon mot de passe",
    saving: "Enregistrement…",
    saved: "Votre mot de passe est enregistré. Utilisez-le lors de votre prochaine connexion.",
    mismatch: "Les deux mots de passe sont différents.",
    weak: `Choisissez un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    same: "C'est déjà votre mot de passe.",
    reauth:
      "Par sécurité, déconnectez-vous et reconnectez-vous, puis choisissez votre mot de passe.",
    failed: "Une erreur est survenue. Veuillez réessayer.",
    email: "Changer votre adresse de connexion",
  },
};

export function PasswordForm({
  email,
  recovery = false,
  continueTo = "/auth/home",
}: {
  email: string;
  recovery?: boolean;
  continueTo?: string;
}) {
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
      <div className={stack()}>
        <h1 className={pageTitle}>
          {recovery
            ? locale === "fr"
              ? "Choisissez un nouveau mot de passe"
              : "Choose a new password"
            : t.title}
        </h1>
        <p className={muted}>{t.intro(email)}</p>
      </div>
      <form onSubmit={save} className={form()}>
        {/* Tells password managers which account the new password belongs to. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label className={label}>
          {t.password}
          <Input
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <p id="password-hint" className={cn(fine, "-mt-2")}>
          {t.hint}
        </p>
        <label className={label}>
          {t.confirm}
          <Input
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        <Button size="lg" className="w-full" loading={busy}>
          {busy ? t.saving : t.save}
        </Button>
      </form>
      {saved && (
        <Alert variant="success" role="status">
          {t.saved}
          {recovery && (
            <>
              {" "}
              <Link href={continueTo}>
                {locale === "fr" ? "Continuer" : "Continue"}
                <ForwardArrow />
              </Link>
            </>
          )}
        </Alert>
      )}
      {message && (
        <Alert variant="error" role="alert">
          {message}
        </Alert>
      )}
      {!recovery && (
        <Footer>
          <Link className={footerLink} href="/account/email">
            {t.email}
          </Link>
        </Footer>
      )}
    </>
  );
}
