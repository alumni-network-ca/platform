"use client";
import { useActionState } from "react";
import { errorMessage, type ActionResult, type AdminCopy } from "@/lib/admin/forms";
import { CopyLink } from "./CopyLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function ActionForm({
  action,
  children,
  label,
  t,
  confirm,
  disabled = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  label: string;
  t: AdminCopy;
  confirm?: string;
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
            <Input readOnly value={state.link} onFocus={(e) => e.target.select()} />
          </label>
          <CopyLink value={state.link} label={t.copyLink} done={t.linkCopied} />
        </div>
      )}
      <div className="formActions">
        <Button loading={pending} disabled={disabled}>
          {label}
        </Button>
      </div>
    </form>
  );
}
