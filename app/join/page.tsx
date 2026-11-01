import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { JoinProgress } from "@/components/JoinProgress";
import { getAccount } from "@/lib/auth/account";
import { canOpen, homeFor } from "@/lib/auth/home";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { JoinForm } from "./JoinForm";
import { SignupForm } from "./SignupForm";

// The same public entry point is shared in school emails and in the guest navigation.
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { school, user, state } = await getAccount();
  if (user && !canOpen(state, "/join")) redirect(homeFor(state));
  const { shortName } = schoolBranding(school);
  const locale = await getServerLocale();
  const fr = locale === "fr";
  const expired = (await searchParams).confirmation === "expired";
  return (
    <>
      <Nav />
      <main className="joinPage">
        <JoinProgress step={user ? 1 : 0} locale={locale} />
        {user ? (
          <div className="joinRequestLayout">
            <section className="joinCard">
              <span className="tag tagGood">
                {fr ? "✓ Compte créé · Courriel confirmé" : "✓ Account created · Email confirmed"}
              </span>
              <span className="joinEyebrow">{fr ? "Étape 2 de 3" : "Step 2 of 3"}</span>
              <h1>{fr ? "Demandez l'accès au réseau" : "Request alumni access"}</h1>
              <p className="muted">
                {fr
                  ? shortName +
                    " vérifie vos renseignements avant d'approuver votre accès au réseau."
                  : "Tell the school who you are. A " +
                    shortName +
                    " reviewer will check your details before approving your admission."}
              </p>
              <JoinForm />
            </section>
            <aside className="joinAside">
              <div className="joinDarkPanel">
                <h2>{fr ? "La suite" : "What happens next"}</h2>
                <p>
                  <strong>{fr ? "1. Vérification par l'école" : "1. School review"}</strong>
                  <br />
                  {fr
                    ? "Un réviseur compare vos renseignements aux dossiers de l'école."
                    : "A reviewer checks your details against the school's records."}
                </p>
                <p>
                  <strong>{fr ? "2. Une mise à jour" : "2. An update"}</strong>
                  <br />
                  {fr
                    ? "Connectez-vous pour voir la décision ou répondre à une question."
                    : "Sign in to see the decision or reply if the reviewer needs more information."}
                </p>
                <p>
                  <strong>{fr ? "3. Votre profil d'ancien" : "3. Your alumni profile"}</strong>
                  <br />
                  {fr
                    ? "Une fois votre demande approuvée, créez votre profil et choisissez sa visibilité."
                    : "After approval, complete your profile and choose its visibility."}
                </p>
              </div>
              <p className="microcopy muted">
                {fr ? "Connecté en tant que" : "Signed in as"}
                <br />
                <strong>{user.email}</strong>
              </p>
            </aside>
          </div>
        ) : (
          <div className="joinSplit">
            <section className="joinIntro">
              <span className="joinEyebrow">
                {fr ? "Nouveau sur le réseau ?" : "New to the network?"}
              </span>
              <h1>
                {fr ? (
                  "Tout commence par votre compte."
                ) : (
                  <>
                    It starts with
                    <br />
                    your account.
                  </>
                )}
              </h1>
              <p className="joinLead">
                {fr
                  ? "Créez votre compte, puis présentez-vous à " +
                    shortName +
                    ". Un réviseur de l'école approuvera votre accès au réseau."
                  : "Create your account, then tell " +
                    shortName +
                    " who you are. A school reviewer will approve your alumni access."}
              </p>
              <ol className="joinJourney">
                <li>
                  <span className="joinDot joinCurrent" aria-hidden="true">
                    1
                  </span>
                  <div>
                    <h3>{fr ? "Créez votre compte" : "Create your account"}</h3>
                    <p>
                      {fr
                        ? "Choisissez votre adresse courriel et votre mot de passe."
                        : "Choose the email and password you'll use to sign in."}
                    </p>
                  </div>
                </li>
                <li>
                  <span className="joinDot" aria-hidden="true">
                    2
                  </span>
                  <div>
                    <h3>{fr ? "Demandez l'accès au réseau" : "Request alumni access"}</h3>
                    <p>
                      {fr
                        ? "Indiquez votre nom à l'école et votre année de graduation."
                        : "Share your name at school and graduation year."}
                    </p>
                  </div>
                </li>
                <li>
                  <span className="joinDot" aria-hidden="true">
                    3
                  </span>
                  <div>
                    <h3>{fr ? "Attendez l'approbation de l'école" : "Wait for school approval"}</h3>
                    <p>
                      {fr
                        ? "Après l'approbation, créez votre profil et rejoignez la communauté."
                        : "Once approved, set up your profile and join the community."}
                    </p>
                  </div>
                </li>
              </ol>
              <div className="joinNotice">
                <strong>
                  {fr ? "Vos renseignements restent privés" : "Private from the start"}
                </strong>
                <br />
                {fr
                  ? "Seul le personnel autorisé de l'école voit votre demande. Votre profil reste masqué jusqu'à sa publication."
                  : "Only authorised school staff see your request. Your profile stays hidden until you publish it."}
              </div>
            </section>
            <SignupForm shortName={shortName} expired={expired} />
          </div>
        )}
      </main>
    </>
  );
}
