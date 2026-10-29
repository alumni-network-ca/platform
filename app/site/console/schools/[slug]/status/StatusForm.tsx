"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { setSchoolStatus, type StatusResult } from "./actions";

export function StatusForm({ slug, suspended }: { slug: string; suspended: boolean }) {
  const [result, action, pending] = useActionState<StatusResult, FormData>(setSchoolStatus, {
    error: null,
  });
  const [typed, setTyped] = useState("");
  const label = suspended ? "Reactivate school" : "Suspend school";

  return (
    <form action={action} className="formStack">
      <input type="hidden" name="slug" value={slug} />
      {suspended ? (
        <>
          <input type="hidden" name="status" value="active" />
          <p>
            Reactivating opens the school&apos;s address again. Its staff and members get their
            access back on their next page load.
          </p>
        </>
      ) : (
        <fieldset className="formStack" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="field">What do you want to do?</legend>
          <label className="choice">
            <input type="radio" name="status" value="suspended" defaultChecked />
            <span>
              <strong>Suspend</strong>
              <span className="cellSub">
                The school&apos;s address stops answering. Nobody can sign in, and its staff lose
                their access. All data is kept, and you can reactivate it at any time.
              </span>
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="status" value="offboard" disabled />
            <span>
              <strong>Offboard</strong>
              <span className="cellSub">
                Export the school&apos;s data, then delete it after the retention period (DEC-08).
                Comes with the retention job.
              </span>
            </span>
          </label>
        </fieldset>
      )}
      <label className="field">
        Reason{suspended ? " (optional)" : ""}
        <textarea name="reason" rows={2} maxLength={500} required={!suspended} />
        <span className="fieldHint">Kept in the school&apos;s audit log.</span>
      </label>
      <label className="field">
        Type {slug} to confirm
        <input
          className="input"
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
      {result.error && (
        <div className="notice" role="alert">
          {result.error}
        </div>
      )}
      <div className="formActions">
        <Link className="btn btnLight" href={`/console/schools/${slug}`}>
          Cancel
        </Link>
        <button
          className={`btn ${suspended ? "btnPrimary" : "btnDanger"}`}
          disabled={pending || typed.trim() !== slug}
        >
          {pending ? "Saving…" : label}
        </button>
      </div>
    </form>
  );
}
