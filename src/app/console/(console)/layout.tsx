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
  if (!(await getPlatformAdmin())) return children;
  return <ConsoleShell>{children}</ConsoleShell>;
}
