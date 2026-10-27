"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { CodeInput } from "@/components/CodeInput";
import { Nav } from "@/components/Nav";
import { useSchool } from "@/components/SchoolProvider";
import { safeNext } from "@/lib/auth/next";
import { schoolBranding } from "@/lib/school";
import { createClient } from "@/lib/supabase/client";

// Passwordless sign-in (DEC-15, ADR 0014): one form for new and returning people. The email gets a 6-digit
// code; the code works on any device. What the page says never depends on whether the address is known (S4).

const RESEND_AFTER_SECONDS = 60;

const TEXT = {
  en: {
    title: (network: string) => `Sign in to ${network}`,
    intro:
      "Enter your email address and we'll send you a 6-digit code. No password needed. New here? The same form starts your sign-up.",
    email: "Email address",
    send: "Send me a code",
    sending: "Sending…",
    haveCode: "I already have a code",
    sentTo: (email: string) => `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
    code: "6-digit code",
    signIn: "Sign in",
    checking: "Checking…",
    resend: "Send a new code",
    resendIn: (seconds: number) => `New code available in ${seconds} s`,
    otherEmail: "Use a different email",
    badCode: "That code is wrong or has expired.",
    tooSoon: "Please wait a minute before asking for another code.",
    failed: "Something went wrong. Please try again.",
    home: "← Home",
  },
  fr: {
    title: (network: string) => `Connexion à ${network}`,
    intro:
      "Entrez votre adresse courriel et nous vous enverrons un code à 6 chiffres, sans mot de passe. Nouveau ? Le même formulaire lance votre inscription.",
    email: "Adresse courriel",
    send: "M'envoyer un code",
    sending: "Envoi…",
    haveCode: "J'ai déjà un code",
    sentTo: (email: string) =>
      `Nous avons envoyé un code à 6 chiffres à ${email}. Il expire dans 10 minutes.`,
    code: "Code à 6 chiffres",
    signIn: "Se connecter",
    checking: "Vérification…",
    resend: "Envoyer un nouveau code",
    resendIn: (seconds: number) => `Nouveau code disponible dans ${seconds} s`,
    otherEmail: "Utiliser une autre adresse",
    badCode: "Ce code est erroné ou expiré.",
    tooSoon: "Veuillez patienter une minute avant de demander un autre code.",
    failed: "Une erreur est survenue. Veuillez réessayer.",
    home: "← Accueil",
  },
};

function SignIn() {
  const { locale } = useLanguage();
  const t = TEXT[locale];
  const { networkName } = schoolBranding(useSchool());
  const next = safeNext(useSearchParams().get("next"));
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setMessage("");
    const address = email.trim();
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setMessage(error.status === 429 ? t.tooSoon : t.failed);
      return;
    }
    setSentTo(address);
    setCode("");
    setStep("code");
    setWait(RESEND_AFTER_SECONDS);
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setMessage(t.badCode);
      return;
    }
    // A full page load, so the proxy and the server read the new session cookies.
    window.location.assign(next ? `/auth/home?next=${encodeURIComponent(next)}` : "/auth/home");
  }

  function restart() {
    setStep("email");
    setSentTo("");
    setCode("");
    setMessage("");
  }

  const emailField = (
    <label>
      {t.email}
      <input
        className="input"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
    </label>
  );

  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <h1>{t.title(networkName)}</h1>
          <p className="muted">{t.intro}</p>

          {step === "email" ? (
            <form onSubmit={sendCode} className="authForm">
              {emailField}
              <button className="btn btnPrimary btnWide" disabled={busy}>
                {busy ? t.sending : t.send}
              </button>
              <button type="button" className="textButton" onClick={() => setStep("code")}>
                {t.haveCode}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="authForm">
              {sentTo ? (
                <p className="notice" role="status">
                  {t.sentTo(sentTo)}
                </p>
              ) : (
                emailField
              )}
              <CodeInput label={t.code} value={code} onChange={setCode} />
              <button className="btn btnPrimary btnWide" disabled={busy}>
                {busy ? t.checking : t.signIn}
              </button>
              {sentTo && (
                <button
                  type="button"
                  className="textButton"
                  onClick={() => sendCode()}
                  disabled={busy || wait > 0}
                >
                  {wait > 0 ? t.resendIn(wait) : t.resend}
                </button>
              )}
              <button type="button" className="textButton" onClick={restart}>
                {t.otherEmail}
              </button>
            </form>
          )}

          {message && (
            <div className="notice" role="alert">
              {message}
            </div>
          )}

          <div className="authFooter">
            <Link href="/">{t.home}</Link>
          </div>
        </section>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}
