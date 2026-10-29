"use client";
import { useActionState, useRef, useState } from "react";
import type { Enums } from "@/lib/database";
import { templatePlaceholders } from "@/lib/admin/templates";
import { errorMessage, type AdminCopy } from "@/lib/admin/forms";
import { approveTemplate } from "./actions";
export function TemplateEditor({
  templateKey,
  locale,
  subject: initialSubject,
  body: initialBody,
  t,
}: {
  templateKey: Enums<"email_template_key">;
  locale: "en" | "fr";
  subject: string;
  body: string;
  t: AdminCopy;
}) {
  const [subject, setSubject] = useState(initialSubject),
    [body, setBody] = useState(initialBody);
  const active = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [state, action, pending] = useActionState(approveTemplate.bind(null, templateKey, locale), {
    error: null,
  });
  const insert = (placeholder: string) => {
    const input = active.current ?? bodyRef.current;
    if (!input) return;
    const text = input.name === "subject" ? subject : body;
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? start;
    const token = "{" + placeholder + "}";
    const next = text.slice(0, start) + token + text.slice(end);
    if (input.name === "subject") setSubject(next);
    else setBody(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    });
  };
  return (
    <form action={action} className="adminStack">
      <div className="field">
        <label htmlFor="template-subject">{t.subject}</label>
        <input
          className="input"
          id="template-subject"
          name="subject"
          required
          maxLength={200}
          value={subject}
          onFocus={(e) => (active.current = e.target)}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="template-body">{t.message}</label>
        <textarea
          className="input"
          ref={bodyRef}
          id="template-body"
          name="body"
          required
          maxLength={20000}
          rows={12}
          value={body}
          onFocus={(e) => (active.current = e.target)}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="adminChips" aria-label={t.insert}>
        {templatePlaceholders[templateKey].map((p) => (
          <button key={p} className="tag" type="button" onClick={() => insert(p)}>
            {"{" + p + "}"}
          </button>
        ))}
      </div>
      <p className="fieldHint">{t.draftNote}</p>
      {state.error && (
        <p role="alert" className="notice">
          {errorMessage(state.error, t)}
        </p>
      )}
      {state.saved && (
        <p role="status" className="notice noticeGood">
          {t.saved}
        </p>
      )}
      {/* TODO(EML-01): email preview requires the renderer. */}
      <div className="formActions">
        <button className="btn btnPrimary" disabled={pending}>
          {t.approveVersion}
        </button>
      </div>
    </form>
  );
}
