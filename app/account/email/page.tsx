import { requireAccess } from "@/lib/auth/account";
import { EmailChange } from "./EmailChange";

// Changing the sign-in email (ADR 0014). Open to anyone signed in at this school; PRF-02 links it from /me.
export default async function ChangeEmailPage() {
  const { user } = await requireAccess("/account/email");
  return (
    <main className="authPage">
      <section className="authCard">
        <EmailChange currentEmail={user.email ?? ""} />
      </section>
    </main>
  );
}
