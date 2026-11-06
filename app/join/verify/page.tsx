import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { JoinProgress } from "@/components/JoinProgress";
import { SIGNUP_CONFIRMATION } from "@/config/auth";
import { getAccount } from "@/lib/auth/account";
import { homeFor } from "@/lib/auth/home";
import { signupDestination } from "@/lib/auth/next";
import { getServerLocale } from "@/lib/i18n-server";
import { ConfirmationResend } from "./ConfirmationResend";
import { Mail } from "lucide-react";

const COOKIE = SIGNUP_CONFIRMATION.cookies;

/** Seconds until the confirmation email can be sent again. */
function resendDelay(lastSent: number) {
  const cooldown = SIGNUP_CONFIRMATION.resendCooldownMs;
  return Math.max(
    0,
    Math.min(cooldown / 1000, Math.ceil((lastSent + cooldown - Date.now()) / 1000)),
  );
}

export default async function VerifySignupPage() {
  const { user, state } = await getAccount();
  const store = await cookies();
  const email = store.get(COOKIE.email)?.value;
  const destination = signupDestination(store.get(COOKIE.next)?.value);
  if (user)
    redirect(
      destination === "/join"
        ? homeFor(state)
        : `/auth/home?next=${encodeURIComponent(destination)}`,
    );
  const lastSent = Number(store.get(COOKIE.sent)?.value ?? 0);
  const retryIn = resendDelay(lastSent);
  const locale = await getServerLocale();
  const fr = locale === "fr";
  return (
    <>
      <Nav />
      <main className="joinPage">
        {destination === "/join" && <JoinProgress step={0} locale={locale} />}
        <section className="joinCard joinCentered">
          <span className="joinIcon" aria-hidden="true">
            <Mail className="size-6" />
          </span>
          <span className="joinEyebrow">
            {fr ? "Terminez la création de votre compte" : "Finish creating your account"}
          </span>
          <h1>{fr ? "Confirmez votre adresse courriel" : "Confirm your email"}</h1>
          <p className="muted">
            {email ? (
              fr ? (
                <>
                  Nous avons envoyé un lien de confirmation à <strong>{email}</strong>.
                </>
              ) : (
                <>
                  We sent a confirmation link to <strong>{email}</strong>.
                </>
              )
            ) : fr ? (
              "Ouvrez le courriel de confirmation que vous avez reçu."
            ) : (
              "Open the confirmation email we sent you."
            )}{" "}
            {fr
              ? "Cliquez sur « Confirmer mon adresse courriel » pour continuer."
              : "Select “Confirm my email” to continue."}
          </p>
          <div className="joinNotice">
            {destination !== "/join"
              ? fr
                ? "Après la confirmation de votre courriel, vous pourrez consulter et accepter votre invitation du personnel."
                : "After confirming your email, you'll return to review and accept your staff invitation."
              : fr
                ? "La confirmation du courriel ne confirme pas votre statut d'ancien. Ensuite, vous soumettrez votre demande d'accès à un réviseur de l'école."
                : "Email confirmation is the first step. Next, submit your alumni request. A school reviewer must approve it before you can access the network."}
          </div>
          <p className="muted microcopy">
            {fr
              ? "Vous ne trouvez pas le courriel ? Vérifiez vos indésirables et votre adresse."
              : "Can't find the email? Check your spam folder and make sure you used the right address."}
          </p>
          {email && <ConfirmationResend retryIn={retryIn} />}
          <div className="authFooter">
            <Link
              href={
                destination === "/join" ? "/join" : `/join?next=${encodeURIComponent(destination)}`
              }
            >
              {fr ? "Changer d'adresse" : "Change email"}
            </Link>
            <Link
              href={
                destination === "/join"
                  ? "/login"
                  : `/login?next=${encodeURIComponent(destination)}`
              }
            >
              {fr ? "Déjà confirmé ? Se connecter" : "Already confirmed? Sign in"}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
