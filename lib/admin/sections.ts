export function adminSections(can: (permission: string) => boolean, pending: number) {
  // TODO(FRS-04): freshness. TODO(EXP-01): exports.
  return (
    [
      { key: "dashboard", href: "/admin", permission: "metrics.read", badge: 0 },
      { key: "approvals", href: "/admin/approvals", permission: "requests.read", badge: pending },
      { key: "alumni", href: "/admin/alumni", permission: "records.read", badge: 0 },
      { key: "templates", href: "/admin/templates", permission: "templates.manage", badge: 0 },
      { key: "staff", href: "/admin/staff", permission: "staff.manage", badge: 0 },
      { key: "audit", href: "/admin/audit", permission: "audit.read", badge: 0 },
      { key: "settings", href: "/admin/settings", permission: "settings.manage", badge: 0 },
    ] as const
  ).filter((section) => can(section.permission));
}
