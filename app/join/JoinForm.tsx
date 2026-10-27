"use client";

import { useActionState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { requestAccess, type JoinResult } from "./actions";

const TEXT = {
  en: {
    firstName: "First name",
    lastName: "Last name",
    maidenName: "Last name at school, if different (optional)",
    gradYear: "Graduation year",
    note: "Anything that helps the school recognise you (optional)",
    submit: "Send my request",
    sending: "Sending…",
    errors: {
      missing: "Please fill in your name and graduation year.",
      tooMany: "Too many requests. Please try again in an hour.",
      failed: "Something went wrong. Please try again.",
    },
  },
  fr: {
    firstName: "Prénom",
    lastName: "Nom",
    maidenName: "Nom à l'école, s'il est différent (facultatif)",
    gradYear: "Année de graduation",
    note: "Tout ce qui aide l'école à vous reconnaître (facultatif)",
    submit: "Envoyer ma demande",
    sending: "Envoi…",
    errors: {
      missing: "Veuillez indiquer votre nom et votre année de graduation.",
      tooMany: "Trop de demandes. Veuillez réessayer dans une heure.",
      failed: "Une erreur est survenue. Veuillez réessayer.",
    },
  },
};

export function JoinForm() {
  const { locale } = useLanguage();
  const t = TEXT[locale];
  const [result, action, pending] = useActionState<JoinResult, FormData>(requestAccess, {
    error: null,
  });
  const thisYear = new Date().getFullYear();
  return (
    <form action={action} className="authForm">
      <label>
        {t.firstName}
        <input
          className="input"
          name="first_name"
          autoComplete="given-name"
          maxLength={80}
          required
        />
      </label>
      <label>
        {t.lastName}
        <input
          className="input"
          name="last_name"
          autoComplete="family-name"
          maxLength={80}
          required
        />
      </label>
      <label>
        {t.maidenName}
        <input className="input" name="maiden_name" maxLength={80} />
      </label>
      <label>
        {t.gradYear}
        <input
          className="input"
          name="grad_year"
          type="number"
          inputMode="numeric"
          min={1900}
          max={thisYear + 1}
          required
        />
      </label>
      <label>
        {t.note}
        <textarea className="input" name="note" rows={3} maxLength={1000} />
      </label>
      <button className="btn btnPrimary btnWide" disabled={pending}>
        {pending ? t.sending : t.submit}
      </button>
      {result.error && (
        <div className="notice" role="alert">
          {t.errors[result.error]}
        </div>
      )}
    </form>
  );
}
