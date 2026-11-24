import { requireStaff } from "@/lib/auth/staff";

// A reviewer gets a 403 here, decided in the layout before loading.tsx streams the skeleton (as for settings).
export default async function SchoolPageLayout({ children }: { children: React.ReactNode }) {
  await requireStaff("/admin/school-page", "settings.manage");
  return children;
}
