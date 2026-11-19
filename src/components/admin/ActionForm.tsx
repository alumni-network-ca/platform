"use client";
import { useActionState } from "react";
import { errorMessage, type ActionResult, type AdminCopy } from "@/lib/admin/forms";
import { CopyLink } from "./CopyLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ui } from "@/components/admin/parts";
import { Alert } from "@/components/ui/alert";
export function ActionForm({
  action,
  children,
  label,
  t,
  disabled = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  label: string;
  t: AdminCopy;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className={ui.adminStack}>
      {children}
      {state.error && (
        <Alert variant="error" role="alert">
          {errorMessage(state.error, t)}
        </Alert>
      )}
      {state.saved && (
        <Alert variant="success" role="status">
          {t.saved}
        </Alert>
      )}
      {state.link && (
        <div className={ui.linkRow}>
          <label className={ui.field}>
            {t.invitationLink}
            <Input readOnly value={state.link} onFocus={(e) => e.target.select()} />
          </label>
          <CopyLink value={state.link} label={t.copyLink} done={t.linkCopied} />
        </div>
      )}
      <div className={ui.formActions}>
        <Button loading={pending} disabled={disabled}>
          {label}
        </Button>
      </div>
    </form>
  );
}
