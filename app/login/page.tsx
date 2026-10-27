"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CodeInput } from "@/components/CodeInput";
import { useLanguage } from "@/components/LanguageProvider";
import { Nav } from "@/components/Nav";
import { useSchool } from "@/components/SchoolProvider";
import { safeNext } from "@/lib/auth/next";
import { schoolBranding } from "@/lib/school";
import { createClient } from "@/lib/supabase/client";

// Sign-in (ADR 0014, ADR 0015): an emailed 6-digit code, or a password for people who set one after signing in
// with a code. One form for new and returning people; a new account always starts with a code, which proves
// the address. What the page says never depends on whether the address is known or has a password (S4).

const RESEND_AFTER_SECONDS = 60;

const TEXT = {
  en: {
    title: (network: string) => `Sign in to ${network}`,
    intro:
      "Enter your email address and we'll send you a 6-digit code, or use your password if you set one. New here? The same form starts your sign-up.",
    email: "Email address",
    send: "Send me a code",
    sending: "Sending…",
    usePassword: "Sign in with a password",
    haveCode: "I already have a code",
    sentTo: (email: string) => `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
    code: "6-digit code",
    password: "Password",
    signIn: "Sign in",
    checking: "Checking…",
    resend: "Send a new code",
    resendIn: (seconds: number) => `New code available in ${seconds} s`,
    otherEmail: "Use a different email",
    useCode: "Email me a code instead",
    noPassword:
      "No password yet, or forgot it? Sign in with a code, then set a new one from the Password link in the menu.",
    badCode: "That code is wrong or has expired.",
    badPassword: "Wrong email or password.",
    tooSoon:
      "We can't send another code right now. Wait a few minutes, or sign in with your password if you set one.",
    tooManyTries: "Too many attempts. Wait a few minutes and try again.",
    failed: "Something went wrong. Please try again.",
    home: "← Home",
  },
  fr: {
    title: (network: string) => `Connexion à ${network}`,
    intro:
      "Entrez votre adresse courriel et nous vous enverrons un code à 6 chiffres, ou utilisez votre mot de passe si vous en avez choisi un. Nouveau ? Le même formulaire lance votre inscription.",
    email: "Adresse courriel",
    send: "M'envoyer un code",
    sending: "Envoi…",
    usePassword: "Se connecter avec un mot de passe",
    haveCode: "J'ai déjà un code",
    sentTo: (email: string) =>
      `Nous avons envoyé un code à 6 chiffres à ${email}. Il expire dans 10 minutes.`,
    code: "Code à 6 chiffres",
    password: "Mot de passe",
    signIn: "Se connecter",
    checking: "Vérification…",
    resend: "Envoyer un nouveau code",
    resendIn: (seconds: number) => `Nouveau code disponible dans ${seconds} s`,
    otherEmail: "Utiliser une autre adresse",
    useCode: "Recevoir plutôt un code par courriel",
    noPassword:
      "Pas encore de mot de passe, ou oublié ? Connectez-vous avec un code, puis choisissez-en un nouveau avec le lien Mot de passe du menu.",
    badCode: "Ce code est erroné ou expiré.",
    badPassword: "Adresse courriel ou mot de passe erroné.",
    tooSoon:
      "Impossible d'envoyer un autre code pour le moment. Patientez quelques minutes, ou connectez-vous avec votre mot de passe si vous en avez un.",
    tooManyTries: "Trop de tentatives. Patientez quelques minutes et réessayez.",
    failed: "Une erreur est survenue. Veuillez réessayer.",
    home: "← Accueil",
  },
};

function SignIn() {
  const { locale } = useLanguage();
  const t = TEXT[locale];
  const { networkName } = schoolBranding(useSchool());
  const next = safeNext(useSearchParams().get("next"));
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  function goHome() {
    // A full page load, so the proxy and the server read the new session cookies.
    window.location.assign(next ? `/auth/home?next=${encodeURIComponent(next)}` : "/auth/home");
  }

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
    goHome();
  }

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      // One message for an unknown email, an account without a password and a wrong password (S4).
      setMessage(error.status === 429 ? t.tooManyTries : t.badPassword);
      return;
    }
    goHome();
  }

  function switchTo(nextStep: "email" | "code" | "password") {
    setStep(nextStep);
    setMessage("");
    setCode("");
    setPassword("");
    if (nextStep !== "code") setSentTo("");
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

          {step === "email" && (
            <form onSubmit={sendCode} className="authForm">
              {emailField}
              <button className="btn btnPrimary btnWide" disabled={busy}>
                {busy ? t.sending : t.send}
              </button>
              <button
                type="button"
                className="btn btnLight btnWide"
                onClick={() => switchTo("password")}
              >
                {t.usePassword}
              </button>
              <button type="button" className="textButton" onClick={() => switchTo("code")}>
                {t.haveCode}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={signInWithPassword} className="authForm">
              <label>
                {t.email}
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                {t.password}
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button className="btn btnPrimary btnWide" disabled={busy}>
                {busy ? t.checking : t.signIn}
              </button>
              <p className="muted microcopy">{t.noPassword}</p>
              <button type="button" className="textButton" onClick={() => switchTo("email")}>
                {t.useCode}
              </button>
            </form>
          )}

          {step === "code" && (
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
              <button type="button" className="textButton" onClick={() => switchTo("email")}>
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
