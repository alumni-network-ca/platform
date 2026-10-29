"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { errorMessage, type AdminCopy } from "@/lib/admin/forms";
import { changeStatus } from "../actions";
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
    <form className="adminStack" action={action}>
      <fieldset className="adminStack">
        <legend>{t.actions}</legend>
        {choices.map(([key, label]) => (
          <label className="choice" key={key}>
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
      <label className="field">
        {t.reason}
        <textarea
          className="input"
          name="reason"
          required
          maxLength={2000}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {state.error && (
        <p role="alert" className="notice">
          {errorMessage(state.error, t)}
        </p>
      )}
      <div className="formActions">
        <Link href={"/admin/alumni/" + id}>{t.cancel}</Link>
        <button className="btn btnDanger" disabled={!reason.trim() || pending}>
          {choices.find(([key]) => key === status)?.[1]}
        </button>
      </div>
      {!reason.trim() && <p className="fieldHint">{t.addReason}</p>}
    </form>
  );
}
