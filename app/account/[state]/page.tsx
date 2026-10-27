import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { requireAccess } from "@/lib/auth/account";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { replyToInfoRequest } from "./actions";

// Where people land after sign-in when they cannot use the directory yet (homeFor, ADR 0014). Each page opens
// only for the matching state. ONB-06 adds the support contact and the full EN/FR copy.
const STATES = ["pending", "needs-info", "rejected", "suspended"] as const;
type AccountPage = (typeof STATES)[number];

const isAccountPage = (value: string): value is AccountPage =>
  (STATES as readonly string[]).includes(value);

export default async function AccountStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  if (!isAccountPage(state)) notFound();
  const { school, supabase, user } = await requireAccess(`/account/${state}`);
  const { shortName } = schoolBranding(school);
  const fr = (await getServerLocale()) === "fr";
  const { data: request } = await supabase
    .from("access_requests")
    .select("first_name, info_request, decision_reason")
    .eq("institution_id", school.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const content: Record<AccountPage, { title: string; body: string }> = {
    pending: fr
      ? {
          title: `Votre demande est entre les mains de ${shortName}`,
          body: "Le bureau des anciens vérifie chaque demande, habituellement en quelques jours. Nous vous écrirons dès qu'elle sera approuvée.",
        }
      : {
          title: `Your request is with ${shortName}`,
          body: "The alumni office checks every request, usually within a few days. We will email you as soon as it is approved.",
        },
    "needs-info": fr
      ? {
          title: `${shortName} a une question`,
          body: "Répondez ci-dessous pour que votre demande reprenne sa place dans la file.",
        }
      : {
          title: `${shortName} has a question`,
          body: "Answer below and your request goes back into the queue.",
        },
    rejected: fr
      ? {
          title: "Votre demande n'a pas été approuvée",
          body: `Si vous pensez qu'il s'agit d'une erreur, communiquez avec le bureau des anciens de ${shortName}.`,
        }
      : {
          title: "Your request was not approved",
          body: `If you think this is a mistake, contact the ${shortName} alumni office.`,
        },
    suspended: fr
      ? {
          title: "Votre accès est suspendu",
          body: `Communiquez avec le bureau des anciens de ${shortName} pour le rétablir.`,
        }
      : {
          title: "Your access is suspended",
          body: `Contact the ${shortName} alumni office to restore it.`,
        },
  };

  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <h1>{content[state].title}</h1>
          <p className="muted">{content[state].body}</p>
          {state === "needs-info" && (
            <form action={replyToInfoRequest} className="authForm">
              {request?.info_request && (
                <blockquote className="notice">{request.info_request}</blockquote>
              )}
              <label>
                {fr ? "Votre réponse" : "Your answer"}
                <textarea className="input" name="reply" rows={4} maxLength={1000} required />
              </label>
              <button className="btn btnPrimary btnWide">{fr ? "Envoyer" : "Send"}</button>
            </form>
          )}
          {state === "rejected" && request?.decision_reason && (
            <blockquote className="notice">{request.decision_reason}</blockquote>
          )}
        </section>
      </main>
    </>
  );
}
