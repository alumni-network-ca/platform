"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { MIN_PASSWORD_LENGTH, SIGNUP_CONFIRMATION } from "@/config/auth";
import { createAccount, type SignupResult } from "./signup-actions";
import { ConfirmationResend } from "./verify/ConfirmationResend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

export function SignupForm({
  shortName,
  expired,
  destination,
  invitedEmail,
}: {
  shortName: string;
  expired: boolean;
  destination: string;
  /** A staff invitation's address (A6.2): fixed, and the form also asks for a name. */
  invitedEmail?: string;
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
        name: "Entrez votre prénom et votre nom.",
        weak: `Choisissez un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères.`,
        mismatch: "Les deux mots de passe sont différents.",
        tooMany: "Trop de tentatives. Patientez quelques minutes et réessayez.",
        failed: "Impossible de créer le compte pour le moment. Veuillez réessayer.",
      }
    : {
        email: "Please enter a valid email address.",
        name: "Enter your first and last name.",
        weak: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
        mismatch: "The two passwords are different.",
        tooMany: "Too many attempts. Wait a few minutes and try again.",
        failed: "We couldn't create the account right now. Please try again.",
      };
  if (result.confirmationSent) {
    return (
      <section className="joinCard" aria-labelledby="confirmation-sent-title">
        <div role="status" className="joinStack">
          <span className="joinIcon" aria-hidden="true">
            <Mail className="size-6" />
          </span>
          <h2 id="confirmation-sent-title">
            {fr ? "Vérifiez votre boîte de réception" : "Check your inbox"}
          </h2>
          <p className="muted">
            {fr
              ? "Un courriel de confirmation a été envoyé. Consultez votre boîte de réception et cliquez sur le lien pour continuer."
              : "A confirmation email has been sent. Please check your inbox and click the link to continue."}
          </p>
        </div>
        <p className="muted microcopy">
          {fr
            ? "Vous ne trouvez pas le courriel ? Vérifiez vos indésirables."
            : "Can't find the email? Check your spam folder."}
        </p>
        <ConfirmationResend retryIn={SIGNUP_CONFIRMATION.resendCooldownMs / 1000} />
        <div className="authFooter">
          <Link
            href={
              destination === "/join" ? "/login" : `/login?next=${encodeURIComponent(destination)}`
            }
          >
            {fr ? "Déjà confirmé ? Se connecter" : "Already confirmed? Sign in"}
          </Link>
        </div>
      </section>
    );
  }
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
        {invitedEmail && (
          <div className="signupField">
            <div className="signupPasswords">
              <label>
                {fr ? "Prénom" : "First name"}
                <Input name="first_name" autoComplete="given-name" maxLength={100} required />
              </label>
              <label>
                {fr ? "Nom" : "Last name"}
                <Input name="last_name" autoComplete="family-name" maxLength={100} required />
              </label>
            </div>
            <p className="microcopy muted">
              {fr
                ? `Le personnel de ${shortName} voit votre nom sur la page du personnel et dans le journal d'audit.`
                : `Other ${shortName} staff see your name on the Staff page and in the audit log.`}
            </p>
          </div>
        )}
        <div className="signupField">
          <label>
            {fr ? "Adresse courriel" : "Email address"}
            <Input
              name="email"
              type="email"
              autoComplete="email"
              aria-describedby="signup-email-hint"
              maxLength={254}
              placeholder="you@example.com"
              defaultValue={invitedEmail}
              readOnly={!!invitedEmail}
              required
            />
          </label>
          <p id="signup-email-hint" className="microcopy muted">
            {invitedEmail
              ? fr
                ? "Fixée par l'invitation; elle ne peut pas être modifiée ici."
                : "Set by the invitation, so it can't be changed here."
              : fr
                ? "Utilisez une adresse personnelle que vous garderez après la graduation."
                : "Use a personal email you will keep after graduation."}
          </p>
        </div>
        <div className="signupPasswords">
          <div className="signupField">
            <label>
              {fr ? "Créer un mot de passe" : "Create a password"}
              <Input
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
            <Input
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
        <Button size="lg" className="w-full" disabled={pending}>
          {pending
            ? fr
              ? "Création…"
              : "Creating account…"
            : fr
              ? "Créer mon compte"
              : "Create my account"}
        </Button>
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
