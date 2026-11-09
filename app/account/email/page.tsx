import { requireAccess } from "@/lib/auth/account";
import { EmailChange } from "./EmailChange";
import { AuthCard, AuthPage } from "@/components/auth/parts";

// Changing the sign-in email (ADR 0014). Open to anyone signed in at this school; PRF-02 links it from /me.
export default async function ChangeEmailPage() {
  const { user } = await requireAccess("/account/email");
  return (
    <AuthPage>
      <AuthCard>
        <EmailChange currentEmail={user.email ?? ""} />
      </AuthCard>
    </AuthPage>
  );
}
