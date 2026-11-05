"use client";

import { useActionState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { requestAccess, updateRequest, type JoinResult } from "./actions";

const TEXT = {
  en: {
    firstName: "First name",
    lastName: "Last name",
    maidenName: "Last name at school, if different (optional)",
    gradYear: "Graduation year",
    studentId: "Student ID (optional)",
    studentIdHint: "If you remember it. It only helps the school find you faster.",
    note: "Anything that helps the school recognise you (optional)",
    submit: "Submit for school review",
    save: "Save request details",
    privacy:
      "Only authorised school staff can read this request. Alumni access stays locked until a reviewer approves it.",
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
    studentId: "Matricule (facultatif)",
    studentIdHint:
      "Si vous vous en souvenez. Il aide seulement l'école à vous retrouver plus vite.",
    note: "Tout ce qui aide l'école à vous reconnaître (facultatif)",
    submit: "Envoyer ma demande",
    save: "Enregistrer les modifications",
    privacy:
      "Seul le personnel autorisé de l'école peut lire cette demande. L'accès au réseau reste bloqué jusqu'à l'approbation d'un réviseur.",
    sending: "Envoi…",
    errors: {
      missing: "Veuillez indiquer votre nom et votre année de graduation.",
      tooMany: "Trop de demandes. Veuillez réessayer dans une heure.",
      failed: "Une erreur est survenue. Veuillez réessayer.",
    },
  },
};

export type RequestDetails = {
  first_name: string;
  last_name: string;
  maiden_name: string | null;
  grad_year: number;
  school_student_id: string | null;
  note: string | null;
};

export function JoinForm({ initial }: { initial?: RequestDetails }) {
  const { locale } = useLanguage();
  const t = TEXT[locale];
  const [result, action, pending] = useActionState<JoinResult, FormData>(
    async (previous, form) => {
      const result = await (initial ? updateRequest : requestAccess)(previous, form);
      if (result.next) window.location.assign(result.next);
      return result;
    },
    {
      error: null,
    },
  );
  const thisYear = new Date().getFullYear();
  return (
    <form action={action} className="authForm">
      <label>
        {t.firstName}
        <input
          className="input"
          name="first_name"
          defaultValue={initial?.first_name}
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
          defaultValue={initial?.last_name}
          autoComplete="family-name"
          maxLength={80}
          required
        />
      </label>
      <label>
        {t.maidenName}
        <input
          className="input"
          name="maiden_name"
          maxLength={80}
          defaultValue={initial?.maiden_name ?? ""}
        />
      </label>
      <label>
        {t.gradYear}
        <input
          className="input"
          name="grad_year"
          defaultValue={initial?.grad_year}
          type="number"
          inputMode="numeric"
          min={1900}
          max={thisYear + 1}
          required
        />
      </label>
      <label>
        {t.studentId}
        <input
          className="input"
          name="school_student_id"
          maxLength={40}
          autoComplete="off"
          aria-describedby="student-id-hint"
          defaultValue={initial?.school_student_id ?? ""}
        />
      </label>
      {/* Outside the label, so the field's name stays short; the input reads it as its description. */}
      <p id="student-id-hint" className="microcopy muted joinFieldHint">
        {t.studentIdHint}
      </p>
      <label>
        {t.note}
        <textarea
          className="input"
          name="note"
          rows={3}
          maxLength={1000}
          defaultValue={initial?.note ?? ""}
        />
      </label>
      <p className="microcopy muted">{t.privacy}</p>
      <button className="btn btnPrimary btnWide" disabled={pending}>
        {pending ? t.sending : initial ? t.save : t.submit}
      </button>
      {result.error && (
        <div className="notice" role="alert">
          {t.errors[result.error]}
        </div>
      )}
    </form>
  );
}
