import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { getPlatformAdmin } from "@/lib/auth/platform";

export const metadata: Metadata = {
  title: "Platform console",
  robots: { index: false, follow: false },
};

// The frame shows only for platform admins. Each page checks access itself (requirePlatformAdmin), so a layout
// that is not re-rendered on navigation is never the only guard.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await getPlatformAdmin();
  if (!admin) return children;
  const { count } = await admin.supabase
    .from("platform_access_grants")
    .select("id", { count: "exact", head: true })
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  return (
    <ConsoleShell email={admin.user.email ?? ""} activeGrants={count ?? 0}>
      {children}
    </ConsoleShell>
  );
}
