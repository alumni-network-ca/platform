"use client";

import { FormEvent, useState } from "react";
import { CodeInput } from "@/components/CodeInput";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

// Secure email change: both the new and the current address get a code, and both codes are needed
// (double_confirm_changes), so someone holding only an open session cannot move the account to their inbox.

const TEXT = {
  en: {
    title: "Change your sign-in email",
    current: (email: string) => `You sign in with ${email}.`,
    newEmail: "New email address",
    send: "Send the codes",
    sent: "We sent a code to each address. Both are needed.",
    codeNew: (email: string) => `Code sent to ${email}`,
    codeCurrent: (email: string) => `Code sent to ${email}`,
    confirm: "Change my email",
    working: "Working…",
    done: (email: string) => `Done. You now sign in with ${email}.`,
    badCode: "A code is wrong or has expired.",
    failed: "We could not start the change. Check the address and try again.",
  },
  fr: {
    title: "Changer votre adresse de connexion",
    current: (email: string) => `Vous vous connectez avec ${email}.`,
    newEmail: "Nouvelle adresse courriel",
    send: "Envoyer les codes",
    sent: "Nous avons envoyé un code à chaque adresse. Les deux sont nécessaires.",
    codeNew: (email: string) => `Code envoyé à ${email}`,
    codeCurrent: (email: string) => `Code envoyé à ${email}`,
    confirm: "Changer mon adresse",
    working: "Traitement…",
    done: (email: string) => `C'est fait. Vous vous connectez maintenant avec ${email}.`,
    badCode: "Un code est erroné ou expiré.",
    failed: "Impossible de lancer le changement. Vérifiez l'adresse et réessayez.",
  },
};

export function EmailChange({ currentEmail }: { currentEmail: string }) {
  const { locale } = useLanguage();
  const t = TEXT[locale];
  const [step, setStep] = useState<"email" | "codes" | "done">("email");
  const [newEmail, setNewEmail] = useState("");
  const [codeNew, setCodeNew] = useState("");
  const [codeCurrent, setCodeCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function start(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await createClient().auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) return setMessage(t.failed);
    setStep("codes");
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const checks: [email: string, token: string][] = [
      [newEmail.trim(), codeNew],
      [currentEmail, codeCurrent],
    ];
    for (const [email, token] of checks) {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email_change" });
      if (error) {
        setBusy(false);
        return setMessage(t.badCode);
      }
    }
    setBusy(false);
    setStep("done");
  }

  return (
    <>
      <h1>{t.title}</h1>
      <p className="muted">{t.current(step === "done" ? newEmail.trim() : currentEmail)}</p>
      {step === "email" && (
        <form onSubmit={start} className="authForm">
          <label>
            {t.newEmail}
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </label>
          <button className="btn btnPrimary btnWide" disabled={busy}>
            {busy ? t.working : t.send}
          </button>
        </form>
      )}
      {step === "codes" && (
        <form onSubmit={confirm} className="authForm">
          <p className="notice" role="status">
            {t.sent}
          </p>
          <CodeInput label={t.codeNew(newEmail.trim())} value={codeNew} onChange={setCodeNew} />
          <CodeInput
            label={t.codeCurrent(currentEmail)}
            value={codeCurrent}
            onChange={setCodeCurrent}
          />
          <button className="btn btnPrimary btnWide" disabled={busy}>
            {busy ? t.working : t.confirm}
          </button>
        </form>
      )}
      {step === "done" && (
        <p className="notice" role="status">
          {t.done(newEmail.trim())}
        </p>
      )}
      {message && (
        <div className="notice" role="alert">
          {message}
        </div>
      )}
    </>
  );
}
