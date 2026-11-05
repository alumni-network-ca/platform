import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, read } from "@/lib/admin/data";
import { schoolBranding } from "@/lib/school";
import { InviteForm } from "./InviteForm";

// A5.1 Invite a staff member (docs/design/staff-invite.md §2): the only way in from the Staff page.
export default async function InviteStaff() {
  const { supabase, school } = await requireStaff("/admin/staff/invite", "staff.manage");
  const { t } = await adminCopy();
  const [settings, templates] = await Promise.all([
    read(
      supabase
        .from("institutions")
        .select("default_locale,email_display_name")
        .eq("id", school.id)
        .single(),
    ),
    read(
      supabase
        .from("email_templates")
        .select("institution_id,locale,subject")
        .eq("key", "staff_invitation")
        .eq("status", "approved")
        .or(`institution_id.eq.${school.id},institution_id.is.null`),
    ),
  ]);
  // Same choice as resolve_email_template: the invitee has no account yet, so the school's language, then the
  // school's other approved language, then the platform default.
  const locale = settings.default_locale;
  const own = templates.filter((row) => row.institution_id === school.id);
  const template =
    own.find((row) => row.locale === locale) ??
    own[0] ??
    templates.find((row) => row.institution_id === null && row.locale === locale);
  const subject = template?.subject.replaceAll("{school_name}", schoolBranding(school).shortName);
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
      <InviteForm t={t} subject={subject ?? null} sender={settings.email_display_name} />
    </>
  );
}
