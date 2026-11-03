"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { MIN_PASSWORD_LENGTH } from "@/config/auth";
import { createAccount, type SignupResult } from "./signup-actions";

export function SignupForm({
  shortName,
  expired,
  destination,
}: {
  shortName: string;
  expired: boolean;
  destination: string;
}) {
  const { locale } = useLanguage();
  const fr = locale === "fr";
  const [result, action, pending] = useActionState<SignupResult, FormData>(
    async (previous, form) => {
      const result = await createAccount(previous, form);
      // A full load lets the proxy resolve the school's host with the newly written auth cookies.
      if (result.next) window.location.assign(result.next);
      return result;
    },
    {
      error: null,
    },
  );
  const errors = fr
    ? {
        email: "Veuillez entrer une adresse courriel valide.",
        weak: `Choisissez un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères.`,
        mismatch: "Les deux mots de passe sont différents.",
        tooMany: "Trop de tentatives. Patientez quelques minutes et réessayez.",
        failed: "Impossible de créer le compte pour le moment. Veuillez réessayer.",
      }
    : {
        email: "Please enter a valid email address.",
        weak: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
        mismatch: "The two passwords are different.",
        tooMany: "Too many attempts. Wait a few minutes and try again.",
        failed: "We couldn't create the account right now. Please try again.",
      };
  return (
    <section className="joinCard" aria-labelledby="create-account-title">
      <div className="joinStack">
        <span className="joinEyebrow">{fr ? "Étape 1 de 3" : "Step 1 of 3"}</span>
        <h2 id="create-account-title">{fr ? "Créez votre compte" : "Create your account"}</h2>
        <p className="muted">
          {destination !== "/join"
            ? fr
              ? "Utilisez l'adresse courriel invitée par l'école."
              : "Use the email address the school invited."
            : fr
              ? `Pour les nouveaux candidats au réseau des anciens de ${shortName}.`
              : `For new applicants to the ${shortName} Alumni Network.`}
        </p>
      </div>
      {expired && (
        <p className="notice" role="alert">
          {fr
            ? "Ce lien est invalide ou a expiré. Demandez un nouveau courriel de confirmation ou connectez-vous si votre adresse est déjà confirmée."
            : "This confirmation link is invalid or expired. Request a new confirmation email, or sign in if you have already confirmed your email."}{" "}
          <Link href="/join/verify">{fr ? "Renvoyer le courriel" : "Resend confirmation"}</Link>
        </p>
      )}
      <form action={action} className="authForm">
        <input type="hidden" name="next" value={destination} />
        <div className="signupField">
          <label>
            {fr ? "Adresse courriel" : "Email address"}
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              aria-describedby="signup-email-hint"
              maxLength={254}
              placeholder="you@example.com"
              required
            />
          </label>
          <p id="signup-email-hint" className="microcopy muted">
            {fr
              ? "Utilisez une adresse personnelle que vous garderez après la graduation."
              : "Use a personal email you will keep after graduation."}
          </p>
        </div>
        <div className="signupPasswords">
          <div className="signupField">
            <label>
              {fr ? "Créer un mot de passe" : "Create a password"}
              <input
                className="input"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                aria-describedby="signup-password-hint"
                required
              />
            </label>
            <p id="signup-password-hint" className="microcopy muted">
              {fr
                ? `Au moins ${MIN_PASSWORD_LENGTH} caractères.`
                : `At least ${MIN_PASSWORD_LENGTH} characters.`}
            </p>
          </div>
          <label>
            {fr ? "Confirmer le mot de passe" : "Confirm password"}
            <input
              className="input"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </label>
        </div>
        <div className="joinNotice">
          <strong>
            {fr
              ? "Créer un compte ne donne pas accès au réseau."
              : "Creating an account does not grant alumni access."}
          </strong>
          <br />
          {destination !== "/join"
            ? fr
              ? "Après la confirmation de votre courriel, consultez et acceptez votre invitation du personnel."
              : "After confirming your email, review and accept your staff invitation."
            : fr
              ? "Ensuite, envoyez votre demande à l'école pour vérification."
              : "Next, submit your request for the school's review."}
        </div>
        {result.error && (
          <div className="notice" role="alert">
            {errors[result.error]}
          </div>
        )}
        <button className="btn btnPrimary btnWide" disabled={pending}>
          {pending
            ? fr
              ? "Création…"
              : "Creating account…"
            : fr
              ? "Créer mon compte"
              : "Create my account"}
        </button>
      </form>
      <p className="joinDivider">
        {fr ? "Vous avez déjà un compte ?" : "Already have an account?"}{" "}
        <Link
          href={
            destination === "/join" ? "/login" : `/login?next=${encodeURIComponent(destination)}`
          }
        >
          {fr ? "Se connecter" : "Sign in"}
        </Link>
      </p>
    </section>
  );
}
