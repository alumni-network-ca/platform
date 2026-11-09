"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CodeInput } from "@/components/CodeInput";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Footer, footerLink, form, label, muted, pageTitle, stack } from "@/components/auth/parts";
import { Alert } from "@/components/ui/alert";

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
    password: "Set or change your password",
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
    password: "Choisir ou changer votre mot de passe",
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
      <div className={stack()}>
        <h1 className={pageTitle}>{t.title}</h1>
        <p className={muted}>{t.current(step === "done" ? newEmail.trim() : currentEmail)}</p>
      </div>
      {step === "email" && (
        <form onSubmit={start} className={form()}>
          <label className={label}>
            {t.newEmail}
            <Input
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </label>
          <Button size="lg" className="w-full" loading={busy}>
            {busy ? t.working : t.send}
          </Button>
        </form>
      )}
      {step === "codes" && (
        <form onSubmit={confirm} className={form()}>
          <Alert role="status">{t.sent}</Alert>
          <CodeInput label={t.codeNew(newEmail.trim())} value={codeNew} onChange={setCodeNew} />
          <CodeInput
            label={t.codeCurrent(currentEmail)}
            value={codeCurrent}
            onChange={setCodeCurrent}
          />
          <Button size="lg" className="w-full" loading={busy}>
            {busy ? t.working : t.confirm}
          </Button>
        </form>
      )}
      {step === "done" && (
        <Alert variant="success" role="status">
          {t.done(newEmail.trim())}
        </Alert>
      )}
      {message && (
        <Alert variant="error" role="alert">
          {message}
        </Alert>
      )}
      <Footer>
        <Link className={footerLink} href="/account/password">
          {t.password}
        </Link>
      </Footer>
    </>
  );
}
