import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { getPlatformAdmin } from "@/lib/auth/platform";
import { createClient } from "@/lib/supabase/server";
import { AuthCard, AuthPage, Footer, muted, pageTitle, stack } from "@/components/auth/parts";

// Shown to a signed-in account that is not a platform admin.
export default async function NoAccessPage() {
  if (await getPlatformAdmin()) redirect("/");
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login?next=%2F");
  return (
    <AuthPage>
      <AuthCard>
        <div className={stack()}>
          <h1 className={pageTitle}>No access to the console</h1>
          <p className={muted}>
            {user.email} is not a platform admin. To use a school&apos;s network, go to its own
            address, such as herzliah.alumninetwork.ca.
          </p>
        </div>
        <Footer>
          <SignOutButton to="/login" label="Sign in with another account" />
        </Footer>
      </AuthCard>
    </AuthPage>
  );
}
