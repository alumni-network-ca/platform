"use client";

import { useActionState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { SignOutButton } from "@/components/SignOutButton";
import { acceptInvitation, type AcceptResult } from "./actions";

const TEXT = {
  en: {
    accept: "Accept the invitation",
    accepting: "Accepting…",
    failed: (email: string) =>
      `This invitation is not for ${email}, has expired, or was already used. Sign in with the invited address, or ask for a new link.`,
    other: "Sign in with another address",
  },
  fr: {
    accept: "Accepter l'invitation",
    accepting: "Acceptation…",
    failed: (email: string) =>
      `Cette invitation n'est pas destinée à ${email}, a expiré ou a déjà été utilisée. Connectez-vous avec l'adresse invitée, ou demandez un nouveau lien.`,
    other: "Se connecter avec une autre adresse",
  },
};

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const { locale } = useLanguage();
  const t = TEXT[locale];
  const [result, action, pending] = useActionState<AcceptResult, FormData>(acceptInvitation, {
    failed: false,
  });
  const back = `/login?next=${encodeURIComponent(`/staff/accept?token=${token}`)}`;
  return (
    <form action={action} className="authForm">
      <input type="hidden" name="token" value={token} />
      <button className="btn btnPrimary btnWide" disabled={pending}>
        {pending ? t.accepting : t.accept}
      </button>
      {result.failed && (
        <div className="notice" role="alert">
          {t.failed(email)}
        </div>
      )}
      <SignOutButton to={back} label={t.other} />
    </form>
  );
}
