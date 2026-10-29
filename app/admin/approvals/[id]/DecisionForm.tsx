"use client";
import { useActionState, useState } from "react";
import type { Database } from "@/lib/database";
import { format } from "@/lib/i18n";
import { errorMessage, type AdminCopy } from "@/lib/admin/forms";
import { decideRequest } from "./actions";
type Match = Database["public"]["Functions"]["access_request_matches"]["Returns"][number];
export function DecisionForm({
  id,
  year,
  matches,
  t,
}: {
  id: string;
  year: number;
  matches: Match[];
  t: AdminCopy;
}) {
  const [choice, setChoice] = useState("approve");
  const [reason, setReason] = useState<string>(t.notGraduate);
  const [state, action, pending] = useActionState(decideRequest.bind(null, id), { error: null });
  const linkable = matches.filter((m) => !m.claimed);
  return (
    <form action={action} className="panel">
      <fieldset className="adminStack">
        <legend>{t.decision}</legend>
        {(
          [
            ["approve", t.approve],
            ["needs_info", t.needsInfo],
            ["reject", t.reject],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="choice">
            <input
              type="radio"
              name="decision"
              value={key}
              checked={choice === key}
              onChange={() => setChoice(key)}
            />
            {label}
          </label>
        ))}
        {choice === "approve" && (
          <>
            <label className="field">
              {t.linkRecord}
              <select className="input" name="profile" defaultValue={linkable[0]?.profile_id ?? ""}>
                {linkable.map((m) => (
                  <option key={m.profile_id} value={m.profile_id}>
                    {m.first_name} {m.last_name}, {m.grad_year}
                  </option>
                ))}
                <option value="">{t.createRecord}</option>
              </select>
            </label>
            <p className="fieldHint">{t.approveNote}</p>
          </>
        )}
        {choice === "needs_info" && (
          <>
            <label className="field">
              {t.question}
              <textarea
                name="question"
                className="input"
                required
                maxLength={1000}
                rows={4}
                defaultValue={format(t.defaultQuestion, { year })}
              />
            </label>
            <p className="fieldHint">{t.infoNote}</p>
          </>
        )}
        {choice === "reject" && (
          <>
            <label className="field">
              {t.reasonApplicant}
              <select
                className="input"
                name="reject_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value={t.notGraduate}>{t.notGraduate}</option>
                <option value={t.duplicate}>{t.duplicate}</option>
                <option value="other">{t.other}</option>
              </select>
            </label>
            {reason === "other" && (
              <label className="field">
                {t.reasonApplicant}
                <textarea name="other_reason" className="input" required maxLength={1000} />
              </label>
            )}
            <p className="fieldHint">{t.rejectNote}</p>
          </>
        )}
      </fieldset>
      {state.error && (
        <p role="alert" className="notice">
          {errorMessage(state.error, t)}
        </p>
      )}
      <div className="formActions">
        <span className="fieldHint">{t.logged}</span>
        <button className="btn btnPrimary" disabled={pending}>
          {choice === "approve" ? t.approve : choice === "needs_info" ? t.needsInfo : t.reject}
        </button>
      </div>
    </form>
  );
}
