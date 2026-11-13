import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read } from "@/lib/admin/data";
import { RowMenu } from "@/components/admin/RowMenu";
import { format } from "@/lib/i18n";
import { manageStaff } from "./actions";
import { Button } from "@/components/ui/button";
import { ui } from "@/components/admin/parts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      <div className={ui.shellTitle}>
        <div>
          <h1>{t.staff}</h1>
          <p>{t.staffIntro}</p>
        </div>
        <Button asChild>
          <Link href="/admin/staff/invite">{t.inviteStaff}</Link>
        </Button>
      </div>
      <section className={ui.tableBox} aria-labelledby="staff-team">
        <h2 id="staff-team" className={ui.tableTitle}>
          {t.team}
        </h2>
        <table className={ui.dataTable}>
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.role}</th>
              <th>{t.status}</th>
              <th className={ui.cellActions}>
                <span className="sr-only">{t.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const last = s.role === "school_admin" && admins === 1;
              const name = s.name || s.email || "";
              const other = s.role === "school_admin" ? "reviewer" : "school_admin";
              return (
                <tr key={s.user_id}>
                  <td>
                    <strong>
                      {name} {s.user_id === user.id ? t.you : ""}
                    </strong>
                    {s.name && <span className={ui.cellSub}>{s.email}</span>}
                  </td>
                  <td>{roleLabel(s.role)}</td>
                  <td>
                    <Badge variant="success">{t.active}</Badge>
                    <span className={ui.cellSub}>{date(s.joined_at)}</span>
                  </td>
                  <td className={ui.cellActions}>
                    {last ? (
                      <p className={ui.fieldHint}>{t.onlyAdmin}</p>
                    ) : (
                      <RowMenu
                        action={manageStaff}
                        label={format(t.actionsFor, { name })}
                        t={t}
                        items={[
                          {
                            key: "role",
                            label: format(t.changeRoleTo, { role: roleLabel(other) }),
                            fields: { operation: "role", user: s.user_id, role: other },
                            confirm: format(t.confirmRoleChange, { name, role: roleLabel(other) }),
                          },
                          {
                            key: "remove",
                            label: t.remove,
                            fields: { operation: "remove", user: s.user_id },
                            danger: true,
                            confirm: t.confirmRemove,
                          },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className={ui.tableBox} aria-labelledby="staff-invitations">
        <h2 id="staff-invitations" className={ui.tableTitle}>
          {t.invitations}
        </h2>
        {invitations.length ? (
          <table className={ui.dataTable}>
            <thead>
              <tr>
                <th>{t.invitedAddress}</th>
                <th>{t.role}</th>
                <th>{t.status}</th>
                <th className={ui.cellActions}>
                  <span className="sr-only">{t.actions}</span>
                </th>
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
                  <tr key={inv.id} className={state === "revoked" ? ui.rowMuted : undefined}>
                    <td>
                      <strong>{inv.email}</strong>
                      {by && (
                        <span className={ui.cellSub}>{format(t.invitedBy, { name: by })}</span>
                      )}
                    </td>
                    <td>{roleLabel(inv.role)}</td>
                    <td>
                      {state === "open" && (
                        <>
                          <Badge>{t.statusSent}</Badge>
                          <span className={ui.cellSub}>
                            {format(t.sentUntil, {
                              sent: date(inv.created_at),
                              date: date(inv.expires_at),
                            })}
                          </span>
                        </>
                      )}
                      {state === "expired" && (
                        <>
                          <Badge variant="warning">{t.statusExpired}</Badge>
                          <span className={ui.cellSub}>
                            {format(t.expiredOn, {
                              sent: date(inv.created_at),
                              date: date(inv.expires_at),
                            })}
                          </span>
                        </>
                      )}
                      {state === "revoked" && (
                        <>
                          <Badge>{t.statusRevoked}</Badge>
                          <span className={ui.cellSub}>
                            {format(t.revokedOn, { date: date(inv.revoked_at) })}
                          </span>
                        </>
                      )}
                    </td>
                    <td className={ui.cellActions}>
                      {state !== "revoked" && (
                        <RowMenu
                          action={manageStaff}
                          label={format(t.actionsFor, { name: inv.email })}
                          t={t}
                          items={
                            state === "open"
                              ? [
                                  {
                                    key: "resend",
                                    label: t.resend,
                                    fields: { operation: "resend", invitation: inv.id },
                                  },
                                  {
                                    key: "revoke",
                                    label: t.revoke,
                                    fields: { operation: "revoke", invitation: inv.id },
                                    danger: true,
                                    confirm: format(t.confirmRevoke, { email: inv.email }),
                                  },
                                ]
                              : [
                                  {
                                    key: "reinvite",
                                    label: t.sendNewInvitation,
                                    fields: { operation: "reinvite", invitation: inv.id },
                                  },
                                ]
                          }
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className={ui.tableEmpty}>{t.noInvitations}</p>
        )}
        <p className={cn(ui.fieldHint, ui.tableNote)}>{t.invitationsNote}</p>
      </section>
      <div className={ui.panelGrid}>
        <section className={ui.panel}>
          <h2>{t.schoolAdmin}</h2>
          <p>{t.schoolAdminHelp}</p>
        </section>
        <section className={ui.panel}>
          <h2>{t.reviewer}</h2>
          <p>{t.reviewerHelp}</p>
        </section>
      </div>
      <p className={ui.fieldHint}>{t.staffNote}</p>
      {/* TODO(FND-11): show verified two-factor status. */}
    </>
  );
}
