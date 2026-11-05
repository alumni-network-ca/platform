"use client";
import { useActionState } from "react";
import { errorMessage, type ActionResult, type AdminCopy } from "@/lib/admin/forms";
import { CopyLink } from "./CopyLink";
const BUTTON = { primary: "btnPrimary", light: "btnLight", danger: "btnDangerText" } as const;

export function ActionForm({
  action,
  children,
  label,
  t,
  confirm,
  variant = "primary",
  compact = false,
  disabled = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  label: string;
  t: AdminCopy;
  confirm?: string;
  /** primary: school colour (page-level saves); light: white outlined; danger: red text (design's row actions). */
  variant?: "primary" | "light" | "danger";
  /** Smaller button for table rows. */
  compact?: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form
      action={formAction}
      className="adminStack"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
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
      {state.link && (
        <div className="linkRow">
          <label className="field">
            {t.invitationLink}
            <input
              className="input"
              readOnly
              value={state.link}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <CopyLink value={state.link} label={t.copyLink} done={t.linkCopied} />
        </div>
      )}
      <div className="formActions">
        <button
          className={`btn ${BUTTON[variant]}${compact ? " btnCompact" : ""}`}
          disabled={pending || disabled}
        >
          {label}
        </button>
      </div>
    </form>
  );
}
