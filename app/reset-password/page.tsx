import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { getSchool } from "@/lib/tenant/server";
import { PasswordForm } from "@/app/account/password/PasswordForm";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired");
  const school = await getSchool();
  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard joinAuth">
          <PasswordForm
            email={user.email ?? ""}
            recovery
            continueTo={school ? "/auth/home" : "/console"}
          />
        </section>
      </main>
    </>
  );
}
