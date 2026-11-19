"use client";

import { useActionState, useState } from "react";
import { manageInvitation, type InvitationResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ui } from "@/components/admin/parts";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export type Invitation = {
  id: string;
  email: string;
  role: string;
  status: "open" | "accepted" | "revoked" | "expired";
  when: string;
};

export type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  joined: string;
};

const ROLE: Record<string, string> = { school_admin: "School admin", reviewer: "Reviewer" };
const STATUS: Record<Invitation["status"], [string, "warning" | "success" | "neutral"]> = {
  open: ["Waiting", "warning"],
  accepted: ["Accepted", "success"],
  revoked: ["Revoked", "neutral"],
  expired: ["Expired", "neutral"],
};

/**
 * S1.3 Staff: a platform admin invites a school admin or a reviewer and sees who the school's staff are (ADR 0005,
 * amended 2026-11-04). Changing a role or removing someone stays with the school's admins on /admin/staff.
 */
export function StaffPanel({
  slug,
  staff,
  invitations,
}: {
  slug: string;
  staff: StaffMember[];
  invitations: Invitation[];
}) {
  const [result, action, pending] = useActionState<InvitationResult, FormData>(manageInvitation, {
    error: null,
  });
  const [copied, setCopied] = useState(false);

  return (
    <section className={ui.panel} aria-labelledby="console-staff">
      <h2 id="console-staff">Staff</h2>
      <p className={ui.fieldHint}>
        Invite a school admin or a reviewer. They accept while signed in with that email. Emails
        aren&apos;t sent yet, so copy the link and send it to them.
      </p>
      <form action={action} className={ui.formRow}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="intent" value="invite" />
        <label className={ui.field}>
          Email
          <Input type="email" name="email" placeholder="name@school.ca" required />
        </label>
        <label className={ui.field}>
          Role
          <NativeSelect name="role" defaultValue="school_admin">
            <option value="school_admin">School admin</option>
            <option value="reviewer">Reviewer</option>
          </NativeSelect>
        </label>
        <div className={ui.formActions} style={{ alignSelf: "end", justifyContent: "flex-start" }}>
          <Button loading={pending}>{pending ? "Sending…" : "Send invitation"}</Button>
        </div>
      </form>

      {result.link && (
        <Alert variant="success" role="status">
          <p>
            Send this link to {result.link.email} ({ROLE[result.link.role]?.toLowerCase()}). It
            works once, only for that address, and expires in 7 days. Getting a new link cancels
            this one.
          </p>
          <div className={ui.copyBox}>
            <Input readOnly value={result.link.url} aria-label="Invitation link" />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(result.link!.url);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </Alert>
      )}
      {result.error && (
        <Alert variant="error" role="alert">
          {result.error}
        </Alert>
      )}

      <h3 id="console-team">Current staff</h3>
      {staff.length > 0 ? (
        <div className={ui.tableBox} role="region" aria-labelledby="console-team" tabIndex={0}>
          <table className={ui.dataTable} aria-labelledby="console-team">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name || s.email}</strong>
                    {s.name && <span className={ui.cellSub}>{s.email}</span>}
                  </td>
                  <td>{ROLE[s.role] ?? s.role}</td>
                  <td>
                    <Badge variant="success">Active</Badge>
                    <span className={ui.cellSub}>Joined {s.joined}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No staff yet. Invite the school&apos;s first admin above.</p>
      )}
      <p className={ui.fieldHint}>
        To change a role or remove someone, the school&apos;s admins use their Staff page.
      </p>

      {invitations.length > 0 && (
        <>
          <h3 id="console-invitations">Invitations</h3>
          <div
            className={ui.tableBox}
            role="region"
            aria-labelledby="console-invitations"
            tabIndex={0}
          >
            <table className={ui.dataTable} aria-labelledby="console-invitations">
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
                      <Badge variant={STATUS[inv.status][1]}>{STATUS[inv.status][0]}</Badge>
                      <span className={ui.cellSub}>{inv.when}</span>
                    </td>
                    <td>
                      {inv.status === "open" && (
                        <form
                          action={action}
                          className={ui.formActions}
                          style={{ justifyContent: "flex-start" }}
                        >
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="invitation" value={inv.id} />
                          <button
                            className={ui.textButton}
                            name="intent"
                            value="link"
                            disabled={pending}
                          >
                            New link
                          </button>
                          <button
                            className={ui.textButton}
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
        </>
      )}
    </section>
  );
}
