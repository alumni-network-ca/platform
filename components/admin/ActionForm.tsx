"use client";
import { useActionState } from "react";
import { errorMessage, type ActionResult, type AdminCopy } from "@/lib/admin/forms";
export function ActionForm({
  action,
  children,
  label,
  t,
  confirm,
  danger = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  label: string;
  t: AdminCopy;
  confirm?: string;
  danger?: boolean;
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
        <label className="field">
          {t.invitationLink}
          <input className="input" readOnly value={state.link} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <div className="formActions">
        <button className={danger ? "btn btnDanger" : "btn btnPrimary"} disabled={pending}>
          {label}
        </button>
      </div>
    </form>
  );
}
