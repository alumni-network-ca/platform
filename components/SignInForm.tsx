"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { safeNext, signupDestination } from "@/lib/auth/next";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackArrow } from "@/components/icons";

// Password sign-in only while code sign-in is unavailable. Signup is a separate school flow.
export function SignInForm({
  networkName,
  audience,
}: {
  networkName: string;
  audience: "school" | "console";
}) {
  const { locale } = useLanguage();
  const fr = locale === "fr";
  const next = safeNext(useSearchParams().get("next"));
  const signupNext = signupDestination(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setBusy(false);
        setMessage(
          error.status === 429
            ? fr
              ? "Trop de tentatives. Patientez quelques minutes et réessayez."
              : "Too many attempts. Wait a few minutes and try again."
            : fr
              ? "Adresse courriel ou mot de passe erroné."
              : "Wrong email or password.",
        );
        return;
      }
      window.location.assign(
        audience === "console"
          ? (next ?? "/console")
          : next
            ? "/auth/home?next=" + encodeURIComponent(next)
            : "/auth/home",
      );
    } catch {
      setBusy(false);
      setMessage(
        fr
          ? "Une erreur est survenue. Veuillez réessayer."
          : "Something went wrong. Please try again.",
      );
    }
  }
  return (
    <>
      <span className="joinEyebrow">{fr ? "Bon retour" : "Welcome back"}</span>
      <h1>{fr ? "Connexion à " + networkName : "Sign in to " + networkName}</h1>
      <p className="muted">
        {fr
          ? "Utilisez l'adresse courriel et le mot de passe de votre compte."
          : "Use the email and password you chose when you created your account."}
      </p>
      <form onSubmit={signIn} className="authForm">
        <label>
          {fr ? "Adresse courriel" : "Email address"}
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          {fr ? "Mot de passe" : "Password"}
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <Button size="lg" className="w-full" disabled={busy}>
          {busy ? (fr ? "Connexion…" : "Signing in…") : fr ? "Se connecter" : "Sign in"}
        </Button>
      </form>
      {message && (
        <div className="notice" role="alert">
          {message}
        </div>
      )}
      <div className="authFooter">
        <Link href="/forgot-password">
          {fr
            ? "Mot de passe oublié ou pas encore choisi ?"
            : "Forgot your password or haven't set one?"}
        </Link>
      </div>
      {audience === "school" && (
        <>
          <div className="joinNotice">
            {fr
              ? "En attente de l'approbation de l'école ? Connectez-vous pour consulter votre demande ou répondre au réviseur."
              : "Waiting for school approval? Sign in to check your request's status or reply to the reviewer."}
          </div>
          <p className="joinDivider">
            {fr ? "Pas encore de compte ?" : "Don't have an account?"}{" "}
            <Link
              href={
                signupNext === "/join" ? "/join" : `/join?next=${encodeURIComponent(signupNext)}`
              }
            >
              {fr ? "Créer un compte" : "Create an account"}
            </Link>
          </p>
        </>
      )}
      <div className="authFooter">
        <Link href="/">
          <BackArrow />
          {fr ? "Accueil" : "Home"}
        </Link>
      </div>
    </>
  );
}
