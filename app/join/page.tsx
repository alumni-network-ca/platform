import { redirect } from "next/navigation";
import { JoinProgress } from "@/components/JoinProgress";
import { getAccount } from "@/lib/auth/account";
import { canOpen, homeFor } from "@/lib/auth/home";
import { invitationToken, signupDestination } from "@/lib/auth/next";
import { format, translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { previewInvitation } from "@/lib/staff/invitation";
import { JoinForm } from "./JoinForm";
import { SignupForm } from "./SignupForm";
import { Check } from "lucide-react";
import {
  AuthCard,
  AuthPage,
  Callout,
  Journey,
  eyebrow,
  fine,
  intro,
  introTitle,
  lead,
  muted,
  pageTitle,
  split,
  stack,
} from "@/components/auth/parts";
import { Badge } from "@/components/ui/badge";

// The same public entry point is shared in school emails and in the guest navigation.
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string; next?: string }>;
}) {
  const query = await searchParams;
  const destination = signupDestination(query.next);
  const { school, supabase, user, state } = await getAccount();
  if (user && destination !== "/join")
    redirect(`/auth/home?next=${encodeURIComponent(destination)}`);
  if (user && !canOpen(state, "/join")) redirect(homeFor(state));
  const { shortName } = schoolBranding(school);
  const locale = await getServerLocale();
  const fr = locale === "fr";
  const expired = query.confirmation === "expired";
  // A staff invitation fixes the address (A6.2). One that can't be accepted goes back to its page, which says why.
  const invitation =
    destination === "/join"
      ? null
      : await previewInvitation(supabase, invitationToken(destination) ?? "", school.id);
  if (invitation && invitation.status !== "open") redirect(destination);
  const staff = translations[locale].staffInvite;
  return (
    <AuthPage compact={!user}>
      {destination === "/join" && (
        <JoinProgress step={user ? 1 : 0} locale={locale} compact={!user} />
      )}
      {user ? (
        <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-7 max-[800px]:grid-cols-1">
          <AuthCard size="side">
            <div className={stack()}>
              <Badge variant="success" className="mb-1 py-1">
                <Check aria-hidden strokeWidth={3} />
                {fr ? "Compte créé · Courriel confirmé" : "Account created · Email confirmed"}
              </Badge>
              <span className={eyebrow}>{fr ? "Étape 2 de 3" : "Step 2 of 3"}</span>
              <h1 className={pageTitle}>
                {fr ? "Demandez l'accès au réseau" : "Request alumni access"}
              </h1>
              <p className={muted}>
                {fr
                  ? shortName +
                    " vérifie vos renseignements avant d'approuver votre accès au réseau."
                  : "Tell the school who you are. A " +
                    shortName +
                    " reviewer will check your details before approving your admission."}
              </p>
            </div>
            <JoinForm />
          </AuthCard>
          <aside className="grid min-w-0 gap-5">
            <div className="grid gap-5 rounded-lg bg-brand p-6 text-brand-foreground">
              <h2 className="text-xl font-bold tracking-[-0.02em]">
                {fr ? "La suite" : "What happens next"}
              </h2>
              {(fr
                ? [
                    [
                      "1. Vérification par l'école",
                      "Un réviseur compare vos renseignements aux dossiers de l'école.",
                    ],
                    [
                      "2. Une mise à jour",
                      "Connectez-vous pour voir la décision ou répondre à une question.",
                    ],
                    [
                      "3. Votre profil d'ancien",
                      "Une fois votre demande approuvée, créez votre profil et choisissez sa visibilité.",
                    ],
                  ]
                : [
                    [
                      "1. School review",
                      "A reviewer checks your details against the school's records.",
                    ],
                    [
                      "2. An update",
                      "Sign in to see the decision or reply if the reviewer needs more information.",
                    ],
                    [
                      "3. Your alumni profile",
                      "After approval, complete your profile and choose its visibility.",
                    ],
                  ]
              ).map(([title, body]) => (
                <p key={title} className="text-base text-on-brand-soft">
                  <strong className="text-brand-foreground">{title}</strong>
                  <br />
                  {body}
                </p>
              ))}
            </div>
            <p className={fine}>
              {fr ? "Connecté en tant que" : "Signed in as"}
              <br />
              <strong className="text-foreground">{user.email}</strong>
            </p>
          </aside>
        </div>
      ) : (
        <div className={split}>
          {invitation?.status === "open" ? (
            <section className={intro({ compact: true })}>
              <span className={eyebrow}>{format(staff.eyebrow, { school: shortName })}</span>
              <h1 className={introTitle}>{staff.createTitle}</h1>
              <p className={lead}>
                {format(staff.signupLead, {
                  inviter: invitation.inviterName ?? staff.platformTeam,
                  email: invitation.email,
                  role: invitation.role === "reviewer" ? staff.roleReviewer : staff.roleSchoolAdmin,
                })}
              </p>
            </section>
          ) : (
            <section className={intro({ compact: true })}>
              <span className={eyebrow}>
                {fr ? "Nouveau sur le réseau ?" : "New to the network?"}
              </span>
              <h1 className={introTitle}>
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
              <p className={lead}>
                {fr
                  ? "Créez votre compte, puis présentez-vous à " +
                    shortName +
                    ". Un réviseur de l'école approuvera votre accès au réseau."
                  : "Create your account, then tell " +
                    shortName +
                    " who you are. A school reviewer will approve your alumni access."}
              </p>
              <Journey
                compact
                steps={[
                  {
                    state: "current",
                    title: fr ? "Créez votre compte" : "Create your account",
                    body: fr
                      ? "Choisissez votre adresse courriel et votre mot de passe."
                      : "Choose the email and password you'll use to sign in.",
                  },
                  {
                    state: "todo",
                    title: fr ? "Demandez l'accès au réseau" : "Request alumni access",
                    body: fr
                      ? "Indiquez votre nom à l'école et votre année de graduation."
                      : "Share your name at school and graduation year.",
                  },
                  {
                    state: "todo",
                    title: fr ? "Attendez l'approbation de l'école" : "Wait for school approval",
                    body: fr
                      ? "Après l'approbation, créez votre profil et rejoignez la communauté."
                      : "Once approved, set up your profile and join the community.",
                  },
                ]}
              />
              <Callout compact>
                <strong>
                  {fr ? "Vos renseignements restent privés" : "Private from the start"}
                </strong>
                <br />
                {fr
                  ? "Seul le personnel autorisé de l'école voit votre demande. Votre profil reste masqué jusqu'à sa publication."
                  : "Only authorised school staff see your request. Your profile stays hidden until you publish it."}
              </Callout>
            </section>
          )}
          <SignupForm
            shortName={shortName}
            expired={expired}
            destination={destination}
            invitedEmail={invitation?.status === "open" ? invitation.email : undefined}
          />
        </div>
      )}
    </AuthPage>
  );
}
