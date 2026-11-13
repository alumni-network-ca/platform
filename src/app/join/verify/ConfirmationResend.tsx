"use client";
import { useActionState, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { SIGNUP_CONFIRMATION } from "@/config/auth";
import { resendConfirmation, type ResendResult } from "../signup-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ConfirmationResend({ retryIn }: { retryIn: number }) {
  const { locale } = useLanguage();
  const fr = locale === "fr";
  const [wait, setWait] = useState(retryIn);
  const [result, action, pending] = useActionState<ResendResult, FormData>(
    async () => {
      const result = await resendConfirmation();
      if (result.sent) setWait(SIGNUP_CONFIRMATION.resendCooldownMs / 1000);
      return result;
    },
    { error: null, sent: false },
  );
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <Button variant="secondary" loading={pending} disabled={wait > 0}>
        {wait > 0
          ? fr
            ? `Renvoyer dans ${wait} s`
            : `Resend available in ${wait} s`
          : pending
            ? fr
              ? "Envoi…"
              : "Sending…"
            : fr
              ? "Renvoyer le courriel de confirmation"
              : "Resend confirmation email"}
      </Button>
      {result.sent && (
        <Alert variant="success" role="status" className="self-stretch">
          {fr
            ? "Le courriel de confirmation a été renvoyé."
            : "Confirmation email resent. Check your inbox."}
        </Alert>
      )}
      {result.error && (
        <Alert variant="error" role="alert" className="self-stretch">
          {result.error === "tooMany"
            ? fr
              ? "Patientez une minute avant de réessayer."
              : "Wait a minute before trying again."
            : fr
              ? "Impossible d'envoyer le courriel. Veuillez réessayer."
              : "We couldn't send the email. Please try again."}
        </Alert>
      )}
    </form>
  );
}
