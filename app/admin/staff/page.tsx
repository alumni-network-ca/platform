import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, dateLabel, read } from "@/lib/admin/data";
import { ActionForm } from "@/components/admin/ActionForm";
import { manageStaff } from "./actions";
export default async function Staff() {
  const { supabase, school, user } = await requireStaff("/admin/staff", "staff.manage");
  const { t, locale } = await adminCopy();
  const [staff, invitations] = await Promise.all([
    read(supabase.rpc("school_staff", { p_inst: school.id })),
    read(
      supabase
        .from("staff_invitations")
        .select("id,email,role,expires_at")
        .eq("institution_id", school.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at"),
    ),
  ]);
  const admins = staff.filter((s) => s.role === "school_admin").length;
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.staff}</h1>
          <p>{t.staffIntro}</p>
        </div>
      </div>
      <section className="panel">
        <ActionForm action={manageStaff} label={t.invite} t={t}>
          <input type="hidden" name="operation" value="invite" />
          <div className="formRow">
            <label className="field">
              {t.inviteEmail}
              <input className="input" name="email" type="email" required maxLength={254} />
            </label>
            <label className="field">
              {t.role}
              <select className="input" name="role">
                <option value="reviewer">{t.reviewer}</option>
                <option value="school_admin">{t.schoolAdmin}</option>
              </select>
            </label>
          </div>
        </ActionForm>
      </section>
      <div className="tableBox">
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
                    <ActionForm action={manageStaff} label={t.changeRole} disabled={last} t={t}>
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
                    <span className="cellSub">{dateLabel(s.joined_at, locale)}</span>
                  </td>
                  <td>
                    {last ? (
                      <p className="fieldHint">{t.onlyAdmin}</p>
                    ) : (
                      <ActionForm
                        action={manageStaff}
                        label={t.remove}
                        t={t}
                        danger
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
      </div>
      <section className="panel">
        <h2>{t.openInvitations}</h2>
        {invitations.length ? (
          invitations.map((inv) => (
            <div key={inv.id} className="panel">
              <strong>{inv.email}</strong>
              <p>
                {inv.role === "school_admin" ? t.schoolAdmin : t.reviewer} · {t.expires}{" "}
                {dateLabel(inv.expires_at, locale)}
              </p>
              <div className="panelGrid">
                <ActionForm action={manageStaff} label={t.resend} t={t}>
                  <input type="hidden" name="operation" value="resend" />
                  <input type="hidden" name="invitation" value={inv.id} />
                </ActionForm>
                <ActionForm action={manageStaff} label={t.revoke} t={t} danger>
                  <input type="hidden" name="operation" value="revoke" />
                  <input type="hidden" name="invitation" value={inv.id} />
                </ActionForm>
              </div>
            </div>
          ))
        ) : (
          <p>{t.empty}</p>
        )}
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
