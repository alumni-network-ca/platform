import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { JoinProgress } from "@/components/JoinProgress";
import { requireAccess } from "@/lib/auth/account";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { ReplyForm } from "./ReplyForm";

const STATES = ["pending", "needs-info", "rejected", "suspended"] as const;
type AccountPage = (typeof STATES)[number];
const isAccountPage = (value: string): value is AccountPage =>
  (STATES as readonly string[]).includes(value);

export default async function AccountStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  if (!isAccountPage(state)) notFound();
  const { school, supabase, user } = await requireAccess("/account/" + state);
  const { shortName } = schoolBranding(school);
  const locale = await getServerLocale();
  const fr = locale === "fr";
  const { data: request, error } = await supabase
    .from("access_requests")
    .select("first_name, last_name, grad_year, school_student_id, info_request, decision_reason")
    .eq("institution_id", school.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load the request: " + error.message);
  const content: Record<AccountPage, { title: string; body: string; badge: string }> = {
    pending: fr
      ? {
          title: "Votre demande est entre les mains de " + shortName,
          body: "Votre compte est créé et votre demande a été envoyée. Un réviseur de l'école confirmera votre statut d'ancien avant d'autoriser votre accès.",
          badge: "En attente de l'approbation de l'école",
        }
      : {
          title: "Your request is with " + shortName,
          body: "Your account is created and your request has been submitted. A school reviewer will confirm your alumni status before granting access.",
          badge: "Awaiting school approval",
        },
    "needs-info": fr
      ? {
          title: shortName + " a une question",
          body: "Votre compte est prêt. Le réviseur a besoin de renseignements supplémentaires avant d'approuver votre accès.",
          badge: "Votre réponse est nécessaire",
        }
      : {
          title: shortName + " has a question",
          body: "Your account is ready. Before approving your alumni access, the reviewer needs a little more information.",
          badge: "Your reply is needed",
        },
    rejected: fr
      ? {
          title: "Votre demande n'a pas été approuvée",
          body:
            "Votre compte existe toujours, mais l'accès au réseau n'a pas été accordé. Si vous pensez qu'il s'agit d'une erreur, communiquez avec le bureau des anciens de " +
            shortName +
            ".",
          badge: "Vérification terminée",
        }
      : {
          title: "Your request was not approved",
          body:
            "Your sign-in account still exists, but alumni access has not been granted. If you think this is a mistake, contact the " +
            shortName +
            " alumni office.",
          badge: "School review complete",
        },
    suspended: fr
      ? {
          title: "Votre accès est suspendu",
          body: "Communiquez avec le bureau des anciens de " + shortName + " pour le rétablir.",
          badge: "Accès suspendu",
        }
      : {
          title: "Your access is suspended",
          body: "Contact the " + shortName + " alumni office to restore it.",
          badge: "Access suspended",
        },
  };
  const t = content[state];
  return (
    <>
      <Nav />
      <main className="joinPage">
        {state === "pending" && <JoinProgress step={2} locale={locale} />}
        <section className="joinCard joinCentered">
          <span className={"tag" + (state === "pending" ? " tagWarn" : "")}>{t.badge}</span>
          <h1>{t.title}</h1>
          <p className="muted">{t.body}</p>
          {state === "pending" && (
            <>
              <ol className="joinJourney">
                <li>
                  <span className="joinDot joinDone" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <h3>{fr ? "Compte créé" : "Account created"}</h3>
                    <p>
                      {fr ? "Courriel confirmé" : "Email confirmed"} · {user.email}
                    </p>
                  </div>
                </li>
                <li>
                  <span className="joinDot joinDone" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <h3>{fr ? "Demande envoyée" : "Alumni request submitted"}</h3>
                    <p>
                      {request?.first_name} {request?.last_name} · {fr ? "Promotion" : "Class of"}{" "}
                      {request?.grad_year}
                      {request?.school_student_id &&
                        ` · ${fr ? "Matricule" : "Student ID"} ${request.school_student_id}`}
                    </p>
                  </div>
                </li>
                <li aria-current="step">
                  <span className="joinDot joinWaiting" aria-hidden="true">
                    3
                  </span>
                  <div>
                    <h3>{fr ? "Vérification par l'école en attente" : "School review pending"}</h3>
                    <p>
                      {fr
                        ? "Un réviseur approuvera la demande ou demandera plus de renseignements."
                        : "A school reviewer will approve your request or ask for more details."}
                    </p>
                  </div>
                </li>
                <li>
                  <span className="joinDot" aria-hidden="true">
                    4
                  </span>
                  <div>
                    <h3 className="muted">
                      {fr
                        ? "Accès au réseau et création du profil"
                        : "Alumni access and profile setup"}
                    </h3>
                    <p>
                      {fr
                        ? "Disponible après l'approbation de l'école."
                        : "Available after school approval."}
                    </p>
                  </div>
                </li>
              </ol>
              <div className="joinNotice">
                <strong>
                  {fr ? "L'annuaire est encore verrouillé." : "The alumni directory is locked."}
                </strong>
                <br />
                {fr
                  ? "Vous pourrez utiliser le réseau après l'approbation de votre demande."
                  : "You'll be able to use the network once a reviewer approves you."}
              </div>
              <p className="muted microcopy">
                {fr
                  ? "Vous pouvez fermer cette page. Connectez-vous de nouveau pour consulter votre demande."
                  : "You can close this page. Sign in again anytime to check your request."}
              </p>
              <div className="joinActions">
                <Link className="btn btnLight" href="/join/edit">
                  {fr ? "Modifier ma demande" : "Edit my request"}
                </Link>
                <a className="btn btnPrimary" href="/auth/home">
                  {fr ? "Vérifier l'état de ma demande" : "Check request status"}
                </a>
              </div>
            </>
          )}
          {state === "needs-info" && <ReplyForm question={request?.info_request} />}
          {state === "rejected" && request?.decision_reason && (
            <blockquote className="joinNotice">{request.decision_reason}</blockquote>
          )}
        </section>
      </main>
    </>
  );
}
