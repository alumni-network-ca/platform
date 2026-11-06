import { requireStaff } from "@/lib/auth/staff";

// A reviewer gets a 403 here. Checked in the layout so the status is decided before loading.tsx streams the
// skeleton (after that it is a 200); the page checks again, from the same cached read.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireStaff("/admin/settings", "settings.manage");
  return children;
}
