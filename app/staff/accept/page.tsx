import { Nav } from "@/components/Nav";
import { requireAccess } from "@/lib/auth/account";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { AcceptForm } from "./AcceptForm";

// Where a staff invitation link leads (SA-02, ADM-06). The person signs in first, with a code if they are new;
// accepting needs the session's email to be the invited one.
export default async function AcceptStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const { school, user } = await requireAccess(`/staff/accept?token=${encodeURIComponent(token)}`);
  const { networkName } = schoolBranding(school);
  const fr = (await getServerLocale()) === "fr";
  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <h1>{fr ? `Rejoindre l'équipe de ${networkName}` : `Join the ${networkName} staff`}</h1>
          <p className="muted">
            {fr
              ? `Vous êtes connecté en tant que ${user.email}. En acceptant, vous pourrez gérer le réseau de l'école selon le rôle prévu dans l'invitation.`
              : `You are signed in as ${user.email}. Accepting lets you manage the school's network with the role in the invitation.`}
          </p>
          <AcceptForm token={token} email={user.email ?? ""} />
        </section>
      </main>
    </>
  );
}
