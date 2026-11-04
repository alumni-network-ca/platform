import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy } from "@/lib/admin/data";
import { InviteForm } from "./InviteForm";

// A5.1 Invite a staff member (docs/design/staff-invite.md §2): the only way in from the Staff page.
export default async function InviteStaff() {
  await requireStaff("/admin/staff/invite", "staff.manage");
  const { t } = await adminCopy();
  return (
    <>
      <Link className="backLink" href="/admin/staff">
        {t.backToStaff}
      </Link>
      <div className="shellTitle">
        <div>
          <h1>{t.inviteStaff}</h1>
          <p>{t.inviteLead}</p>
        </div>
      </div>
      <InviteForm t={t} />
    </>
  );
}
