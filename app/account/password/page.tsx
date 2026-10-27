import { Nav } from "@/components/Nav";
import { requireAccess } from "@/lib/auth/account";
import { PasswordForm } from "./PasswordForm";

// Setting or changing a password (ADR 0015). Open to anyone signed in at this school; PRF-02 links it from /me.
export default async function PasswordPage() {
  const { user } = await requireAccess("/account/password");
  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <PasswordForm email={user.email ?? ""} />
        </section>
      </main>
    </>
  );
}
