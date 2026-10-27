import { Nav } from "@/components/Nav";
import { requireAccess } from "@/lib/auth/account";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { JoinForm } from "./JoinForm";

// Sign-up at this school: reached after the emailed code, by anyone with no membership or open request here.
// The school's staff approve every request (DEC-01). ONB-03 adds consent capture and Turnstile.
export default async function JoinPage() {
  const { school } = await requireAccess("/join");
  const { shortName } = schoolBranding(school);
  const fr = (await getServerLocale()) === "fr";
  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <h1>{fr ? `Rejoindre le réseau ${shortName}` : `Join the ${shortName} network`}</h1>
          <p className="muted">
            {fr
              ? `${shortName} vérifie chaque demande avant d'ouvrir l'annuaire. Vous recevrez un courriel dès qu'elle sera approuvée.`
              : `${shortName} checks every request before opening the directory. You will get an email as soon as it is approved.`}
          </p>
          <JoinForm />
        </section>
      </main>
    </>
  );
}
