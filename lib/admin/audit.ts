import type { Database, Tables } from "@/lib/database";
import type { AdminCopy } from "./forms";
export type AuditPerson = Database["public"]["Functions"]["audit_people"]["Returns"][number];
const actions = {
  "access_request.approve": "auditApprove",
  "access_request.reject": "auditReject",
  "access_request.needs_info": "auditInfo",
  "access_request.created": "auditCreated",
  "access_request.replied": "auditReplied",
  "access_request.withdrawn": "auditWithdrawn",
  "profile.admin_updated": "auditEdited",
  "profile.saved": "auditSaved",
  "profile.status": "auditStatus",
  "profile.confirmed": "auditConfirmed",
  "profile.visibility": "auditVisibility",
  "profile.self_deleted": "auditDeleted",
  "profile.data_exported": "auditExport",
  "staff.invited": "auditStaffInvited",
  "staff.joined": "auditStaffJoined",
  "staff.role_changed": "auditStaffRole",
  "staff.removed": "auditStaffRemoved",
  "staff.invitation_link_issued": "auditLink",
  "staff.invitation_revoked": "auditRevoke",
  "template.saved": "auditTemplateSaved",
  "template.approved": "auditTemplateApproved",
  "school.settings_updated": "auditSettings",
  "platform.grant_opened": "auditGrantOpened",
  "platform.grant_revoked": "auditGrantRevoked",
  "consent.accepted": "auditConsent",
  "consent.withdrawn": "auditConsent",
} as const;
export function describeAudit(
  row: Pick<
    Tables<"audit_log">,
    "actor_user_id" | "actor_kind" | "action" | "target_type" | "target_id" | "metadata"
  >,
  people: AuditPerson[],
  t: AdminCopy,
) {
  const person = people.find((p) => p.user_id === row.actor_user_id);
  const actor =
    row.actor_kind === "system_admin" || person?.kind === "support"
      ? t.support
      : row.actor_kind === "system"
        ? t.system
        : person?.label || t.former;
  const key = actions[row.action as keyof typeof actions];
  const what = key ? t[key] : t.auditEvent;
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const statuses = {
    active: t.active,
    suspended: t.suspended,
    archived: t.archived,
    deceased: t.deceased,
    hidden: t.hidden,
    members: t.published,
    deleted: t.unknown,
  };
  const statusLabel = (value: string) => statuses[value as keyof typeof statuses] ?? value;
  const details = [
    typeof metadata.from === "string" ? statusLabel(metadata.from) : null,
    typeof metadata.to === "string" ? "→ " + statusLabel(metadata.to) : null,
    typeof metadata.reason === "string" ? metadata.reason : null,
    typeof metadata.locale === "string" ? metadata.locale.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const targetHref =
    row.target_id && /^[a-f0-9-]{36}$/i.test(row.target_id)
      ? row.target_type === "alumni_profile"
        ? "/admin/alumni/" + row.target_id
        : row.target_type === "access_request"
          ? "/admin/approvals/" + row.target_id
          : null
      : null;
  return { actor, what, text: actor + " " + what, details, targetHref };
}
