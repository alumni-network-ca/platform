"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { sendPasswordReset, type RecoveryResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackArrow } from "@/components/icons";

export function RecoveryForm({ expired }: { expired: boolean }) {
  const { locale } = useLanguage();
  const fr = locale === "fr";
  const [result, action, pending] = useActionState<RecoveryResult, FormData>(sendPasswordReset, {
    sent: false,
    error: null,
  });
  return (
    <>
      <h1>{fr ? "Choisissez un nouveau mot de passe" : "Set or reset your password"}</h1>
      <p className="muted">
        {fr
          ? "Utilisez cette option si vous avez oublié votre mot de passe ou si vous vous connectiez auparavant avec un code."
          : "Use this if you forgot your password or previously signed in with a code."}
      </p>
      {expired && (
        <p className="notice" role="alert">
          {fr
            ? "Ce lien est invalide ou a expiré. Demandez-en un nouveau."
            : "This reset link is invalid or expired. Request a new one."}
        </p>
      )}
      <form action={action} className="authForm">
        <label>
          {fr ? "Adresse courriel" : "Email address"}
          <Input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <Button size="lg" className="w-full" disabled={pending}>
          {pending
            ? fr
              ? "Envoi…"
              : "Sending…"
            : fr
              ? "Envoyer le lien de réinitialisation"
              : "Send password reset link"}
        </Button>
      </form>
      {result.sent && (
        <p className="notice noticeGood" role="status">
          {fr
            ? "Si un compte existe pour cette adresse, vous recevrez un lien pour choisir un mot de passe."
            : "If an account exists for this email, you'll receive a link to choose a password."}
        </p>
      )}
      {result.error && (
        <p className="notice" role="alert">
          {result.error === "email"
            ? fr
              ? "Entrez une adresse courriel valide."
              : "Enter a valid email address."
            : result.error === "tooMany"
              ? fr
                ? "Patientez quelques minutes avant de réessayer."
                : "Wait a few minutes before trying again."
              : fr
                ? "Impossible d'envoyer le courriel. Réessayez."
                : "We couldn't send the email. Please try again."}
        </p>
      )}
      <div className="authFooter">
        <Link href="/login">
          <BackArrow />
          {fr ? "Se connecter" : "Sign in"}
        </Link>
      </div>
    </>
  );
}
