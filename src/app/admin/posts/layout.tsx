import { requireStaff } from "@/lib/auth/staff";

// Only staff who manage posts (school admins); a reviewer gets a 403. Checked in the layout so the status is decided
// before a loading skeleton streams (as app/admin/settings/layout.tsx).
export default async function PostsLayout({ children }: { children: React.ReactNode }) {
  await requireStaff("/admin/posts", "posts.manage");
  return children;
}
