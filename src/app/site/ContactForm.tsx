"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import type { translations } from "@/lib/i18n";
import { sendSchoolInquiry, type ContactStatus } from "./contact-actions";
import styles from "./landing.module.css";

type Copy = Pick<
  (typeof translations)[keyof typeof translations]["schoolsLanding"],
  "demo" | "quote" | "contact"
>;

export function ContactForm({ copy, inquiry }: { copy: Copy; inquiry: "demo" | "quote" }) {
  const [status, action, pending] = useActionState<ContactStatus, FormData>(
    sendSchoolInquiry,
    "idle",
  );
  const [values, setValues] = useState({ inquiry, name: "", school: "", email: "", message: "" });
  const t = copy.contact;

  function update(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.currentTarget;
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  return (
    <div className={styles.contactPanel}>
      {status === "sent" ? (
        <p className={styles.contactStatus} role="status">
          {t.sent}
        </p>
      ) : (
        <form action={action} className={styles.contactForm}>
          <fieldset disabled={pending}>
            <label className={styles.contactWide}>
              {t.inquiry}
              <select name="inquiry" value={values.inquiry} onChange={update}>
                <option value="demo">{copy.demo}</option>
                <option value="quote">{copy.quote}</option>
              </select>
            </label>
            <label>
              {t.name}
              <input
                name="name"
                autoComplete="name"
                maxLength={120}
                required
                value={values.name}
                onChange={update}
              />
            </label>
            <label>
              {t.school}
              <input
                name="school"
                autoComplete="organization"
                maxLength={160}
                required
                value={values.school}
                onChange={update}
              />
            </label>
            <label className={styles.contactWide}>
              {t.email}
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={values.email}
                onChange={update}
              />
            </label>
            <label className={styles.contactWide}>
              {t.message}
              <textarea
                name="message"
                rows={4}
                maxLength={2000}
                value={values.message}
                onChange={update}
              />
            </label>
            <input name="website" hidden autoComplete="off" tabIndex={-1} />
            <button type="submit" className={styles.primary}>
              {pending ? t.sending : t.submit}
            </button>
          </fieldset>
          {status !== "idle" && (
            <p className={styles.contactStatus} role="alert">
              {t[status]}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
