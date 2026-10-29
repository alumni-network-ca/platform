"use client";

import { useActionState, useState } from "react";
import { manageInvitation, type InvitationResult } from "./actions";

export type Invitation = {
  id: string;
  email: string;
  role: string;
  status: "open" | "accepted" | "revoked" | "expired";
  when: string;
};

const ROLE: Record<string, string> = { school_admin: "School admin", reviewer: "Reviewer" };
const STATUS: Record<Invitation["status"], [string, string]> = {
  open: ["Waiting", "tagWarn"],
  accepted: ["Accepted", "tagGood"],
  revoked: ["Revoked", ""],
  expired: ["Expired", ""],
};

export function Invitations({ slug, invitations }: { slug: string; invitations: Invitation[] }) {
  const [result, action, pending] = useActionState<InvitationResult, FormData>(manageInvitation, {
    error: null,
  });
  const [copied, setCopied] = useState(false);

  return (
    <section className="panel">
      <h2>School admins</h2>
      <p className="fieldHint">
        Invite the first school admin. They accept while signed in with that email, then invite the
        rest of their staff themselves. Emails are not sent yet, so copy the link and send it to
        them.
      </p>
      <form action={action} className="formRow">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="intent" value="invite" />
        <label className="field">
          Email
          <input
            className="input"
            type="email"
            name="email"
            placeholder="principal@school.ca"
            required
          />
        </label>
        <div className="formActions" style={{ alignSelf: "end", justifyContent: "flex-start" }}>
          <button className="btn btnPrimary" disabled={pending}>
            {pending ? "Inviting…" : "Invite school admin"}
          </button>
        </div>
      </form>

      {result.link && (
        <div className="notice noticeGood" role="status">
          <p>
            Send this link to {result.link.email}. It works once, only for that address, and expires
            in 7 days. Getting a new link cancels this one.
          </p>
          <div className="copyBox">
            <input
              className="input"
              readOnly
              value={result.link.url}
              aria-label="Invitation link"
            />
            <button
              type="button"
              className="btn btnLight"
              onClick={async () => {
                await navigator.clipboard.writeText(result.link!.url);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
      {result.error && (
        <div className="notice" role="alert">
          {result.error}
        </div>
      )}

      {invitations.length > 0 && (
        <div className="tableBox">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td>{ROLE[inv.role] ?? inv.role}</td>
                  <td>
                    <span className={`tag ${STATUS[inv.status][1]}`}>{STATUS[inv.status][0]}</span>
                    <span className="cellSub">{inv.when}</span>
                  </td>
                  <td>
                    {inv.status === "open" && (
                      <form
                        action={action}
                        className="formActions"
                        style={{ justifyContent: "flex-start" }}
                      >
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="invitation" value={inv.id} />
                        <button
                          className="textButton"
                          name="intent"
                          value="link"
                          disabled={pending}
                        >
                          New link
                        </button>
                        <button
                          className="textButton"
                          name="intent"
                          value="revoke"
                          disabled={pending}
                        >
                          Revoke
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
