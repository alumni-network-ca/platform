import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read } from "@/lib/admin/data";
import { ActionForm } from "@/components/admin/ActionForm";
import { format } from "@/lib/i18n";
import { manageStaff } from "./actions";

const DAY = 86_400_000;

// A4.1 Staff and roles (docs/design/staff-invite.md §2): the team, invitations by state, one way to invite.
export default async function Staff() {
  const { supabase, school, user } = await requireStaff("/admin/staff", "staff.manage");
  const { t, locale } = await adminCopy();
  // Request-time server rendering: invitation states use the time of this request.
  const now = new Date().getTime();
  const [staff, invitations] = await Promise.all([
    read(supabase.rpc("school_staff", { p_inst: school.id })),
    read(
      supabase
        .from("staff_invitations")
        .select("id,email,role,created_at,expires_at,revoked_at,invited_by")
        .eq("institution_id", school.id)
        .is("accepted_at", null)
        .or(`revoked_at.is.null,revoked_at.gt.${new Date(now - 30 * DAY).toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
  ]);
  const admins = staff.filter((s) => s.role === "school_admin").length;
  const names = new Map(staff.map((s) => [s.user_id, s.name || s.email]));
  const date = (value: string | null) => dateLabel(value, locale);
  const roleLabel = (role: string) => (role === "school_admin" ? t.schoolAdmin : t.reviewer);
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.staff}</h1>
          <p>{t.staffIntro}</p>
        </div>
        <Link className="btn btnPrimary" href="/admin/staff/invite">
          {t.inviteStaff}
        </Link>
      </div>
      <section className="tableBox" aria-labelledby="staff-team">
        <h2 id="staff-team" className="tableTitle">
          {t.team}
        </h2>
        <table className="dataTable">
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.role}</th>
              <th>{t.status}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const last = s.role === "school_admin" && admins === 1;
              return (
                <tr key={s.user_id}>
                  <td>
                    <strong>
                      {s.name || s.email} {s.user_id === user.id ? t.you : ""}
                    </strong>
                    {s.name && <span className="cellSub">{s.email}</span>}
                  </td>
                  <td>
                    <ActionForm
                      action={manageStaff}
                      label={t.changeRole}
                      disabled={last}
                      t={t}
                      variant="light"
                      compact
                    >
                      <input type="hidden" name="operation" value="role" />
                      <input type="hidden" name="user" value={s.user_id} />
                      <label className="field">
                        {t.role}
                        <select
                          className="input"
                          name="role"
                          aria-label={t.role + " · " + (s.name || s.email)}
                          defaultValue={s.role}
                          disabled={last}
                        >
                          <option value="reviewer">{t.reviewer}</option>
                          <option value="school_admin">{t.schoolAdmin}</option>
                        </select>
                      </label>
                    </ActionForm>
                  </td>
                  <td>
                    <span className="tag tagGood">{t.active}</span>
                    <span className="cellSub">{date(s.joined_at)}</span>
                  </td>
                  <td>
                    {last ? (
                      <p className="fieldHint">{t.onlyAdmin}</p>
                    ) : (
                      <ActionForm
                        action={manageStaff}
                        label={t.remove}
                        t={t}
                        variant="danger"
                        compact
                        confirm={t.confirmRemove}
                      >
                        <input type="hidden" name="operation" value="remove" />
                        <input type="hidden" name="user" value={s.user_id} />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="tableBox" aria-labelledby="staff-invitations">
        <h2 id="staff-invitations" className="tableTitle">
          {t.invitations}
        </h2>
        {invitations.length ? (
          <table className="dataTable">
            <thead>
              <tr>
                <th>{t.invitedAddress}</th>
                <th>{t.role}</th>
                <th>{t.status}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => {
                const state = inv.revoked_at
                  ? "revoked"
                  : Date.parse(inv.expires_at) <= now
                    ? "expired"
                    : "open";
                const by = inv.invited_by && names.get(inv.invited_by);
                return (
                  <tr key={inv.id} className={state === "revoked" ? "rowMuted" : undefined}>
                    <td>
                      <strong>{inv.email}</strong>
                      {by && <span className="cellSub">{format(t.invitedBy, { name: by })}</span>}
                    </td>
                    <td>{roleLabel(inv.role)}</td>
                    <td>
                      {state === "open" && (
                        <>
                          <span className="tag">{t.statusSent}</span>
                          <span className="cellSub">
                            {format(t.sentUntil, {
                              sent: date(inv.created_at),
                              date: date(inv.expires_at),
                            })}
                          </span>
                        </>
                      )}
                      {state === "expired" && (
                        <>
                          <span className="tag tagWarn">{t.statusExpired}</span>
                          <span className="cellSub">
                            {format(t.expiredOn, {
                              sent: date(inv.created_at),
                              date: date(inv.expires_at),
                            })}
                          </span>
                        </>
                      )}
                      {state === "revoked" && (
                        <>
                          <span className="tag">{t.statusRevoked}</span>
                          <span className="cellSub">
                            {format(t.revokedOn, { date: date(inv.revoked_at) })}
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      {state === "open" && (
                        <div className="panelGrid">
                          <ActionForm
                            action={manageStaff}
                            label={t.resend}
                            t={t}
                            variant="light"
                            compact
                          >
                            <input type="hidden" name="operation" value="resend" />
                            <input type="hidden" name="invitation" value={inv.id} />
                          </ActionForm>
                          <ActionForm
                            action={manageStaff}
                            label={t.revoke}
                            t={t}
                            variant="danger"
                            compact
                          >
                            <input type="hidden" name="operation" value="revoke" />
                            <input type="hidden" name="invitation" value={inv.id} />
                          </ActionForm>
                        </div>
                      )}
                      {state === "expired" && (
                        <ActionForm
                          action={manageStaff}
                          label={t.sendNewInvitation}
                          t={t}
                          variant="light"
                          compact
                        >
                          <input type="hidden" name="operation" value="reinvite" />
                          <input type="hidden" name="invitation" value={inv.id} />
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="tableEmpty">{t.noInvitations}</p>
        )}
        <p className="fieldHint tableNote">{t.invitationsNote}</p>
      </section>
      <div className="panelGrid">
        <section className="panel">
          <h2>{t.schoolAdmin}</h2>
          <p>{t.schoolAdminHelp}</p>
        </section>
        <section className="panel">
          <h2>{t.reviewer}</h2>
          <p>{t.reviewerHelp}</p>
        </section>
      </div>
      <p className="fieldHint">{t.staffNote}</p>
      {/* TODO(FND-11): show verified two-factor status. */}
    </>
  );
}
