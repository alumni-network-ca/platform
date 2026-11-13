"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { errorMessage, type AdminCopy } from "@/lib/admin/forms";
import { changeStatus } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ui } from "@/components/admin/parts";
import { Alert } from "@/components/ui/alert";
export function StatusForm({
  id,
  active,
  initial,
  t,
}: {
  id: string;
  active: boolean;
  initial: string;
  t: AdminCopy;
}) {
  const [status, setStatus] = useState(
    active && ["suspended", "archived", "deceased"].includes(initial)
      ? initial
      : active
        ? "suspended"
        : "active",
  );
  const [reason, setReason] = useState("");
  const [state, action, pending] = useActionState(changeStatus.bind(null, id), { error: null });
  const choices = active
    ? [
        ["suspended", t.suspend],
        ["archived", t.archive],
        ["deceased", t.markDeceased],
      ]
    : [["active", t.reactivate]];
  return (
    <form className={ui.adminStack} action={action}>
      <fieldset className={ui.adminStack}>
        <legend>{t.actions}</legend>
        {choices.map(([key, label]) => (
          <label className={ui.choice} key={key}>
            <input
              type="radio"
              name="status"
              value={key}
              checked={key === status}
              onChange={() => setStatus(key!)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className={ui.field}>
        {t.reason}
        <Textarea
          name="reason"
          required
          maxLength={2000}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {state.error && (
        <Alert variant="error" role="alert">
          {errorMessage(state.error, t)}
        </Alert>
      )}
      <div className={ui.formActions}>
        <Link href={"/admin/alumni/" + id}>{t.cancel}</Link>
        <Button variant="destructive" loading={pending} disabled={!reason.trim()}>
          {choices.find(([key]) => key === status)?.[1]}
        </Button>
      </div>
      {!reason.trim() && <p className={ui.fieldHint}>{t.addReason}</p>}
    </form>
  );
}
