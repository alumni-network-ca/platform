import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSchool } from "@/lib/tenant/server";
import { PasswordForm } from "@/app/account/password/PasswordForm";
import { AuthCard, AuthPage } from "@/components/auth/parts";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired");
  const school = await getSchool();
  return (
    <AuthPage>
      <AuthCard>
        <PasswordForm
          email={user.email ?? ""}
          recovery
          continueTo={school ? "/auth/home" : "/console"}
        />
      </AuthCard>
    </AuthPage>
  );
}
