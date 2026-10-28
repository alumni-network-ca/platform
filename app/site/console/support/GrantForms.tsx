"use client";

import { useActionState } from "react";
import { manageGrant, type GrantResult } from "./actions";

export type ActiveGrant = {
  id: string;
  school: string;
  address: string;
  by: string;
  mine: boolean;
  endsIn: string;
  reason: string;
};

export function ActiveGrants({ grants }: { grants: ActiveGrant[] }) {
  const [result, action, pending] = useActionState<GrantResult, FormData>(manageGrant, {
    error: null,
  });
  return (
    <>
      {grants.map((g) => (
        <section key={g.id} className="panel panelWarn">
          <div className="shellTitle">
            <div>
              <h2>
                Active: {g.school} · ends in {g.endsIn}
              </h2>
              <p className="fieldHint">
                Reason: “{g.reason}” · opened by {g.by}
              </p>
            </div>
            <div className="formActions">
              <a className="btn btnLight" href={g.address}>
                Go to the school
              </a>
              {g.mine && (
                <form action={action}>
                  <input type="hidden" name="intent" value="end" />
                  <input type="hidden" name="grant" value={g.id} />
                  <button className="btn btnDanger" disabled={pending}>
                    End now
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      ))}
      {result.error && (
        <div className="notice" role="alert">
          {result.error}
        </div>
      )}
    </>
  );
}

export function OpenGrantForm({
  schools,
  preselect,
}: {
  schools: { id: string; name: string; slug: string }[];
  preselect?: string;
}) {
  const [result, action, pending] = useActionState<GrantResult, FormData>(manageGrant, {
    error: null,
  });
  const selected = schools.find((s) => s.slug === preselect)?.id;
  return (
    <section className="panel">
      <h2>Open a grant</h2>
      <form action={action} className="formStack">
        <input type="hidden" name="intent" value="open" />
        <div className="formRow">
          <label className="field">
            School
            <select className="select" name="school" defaultValue={selected} required>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            For how long
            <select className="select" name="hours" defaultValue="1">
              <option value="1">1 hour</option>
              <option value="4">4 hours</option>
              <option value="8">8 hours (maximum)</option>
            </select>
          </label>
        </div>
        <label className="field">
          Reason (required; the school sees this)
          <textarea
            name="reason"
            rows={3}
            minLength={5}
            maxLength={500}
            placeholder="e.g. The school admin asked us to fix a wrongly approved record"
            required
          />
        </label>
        {result.opened && (
          <div className="notice noticeGood" role="status">
            Grant opened. It ends on its own, or you can end it early above.
          </div>
        )}
        {result.error && (
          <div className="notice" role="alert">
            {result.error}
          </div>
        )}
        <div className="formActions">
          <button className="btn btnPrimary" disabled={pending}>
            {pending ? "Opening…" : "Open grant"}
          </button>
        </div>
      </form>
    </section>
  );
}
