import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { SignOutButton } from "@/components/SignOutButton";
import { dateLabel } from "@/lib/admin/data";
import { getAccount } from "@/lib/auth/account";
import { isStaff } from "@/lib/auth/home";
import { format, translations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { previewInvitation } from "@/lib/staff/invitation";
import { AcceptForm } from "./AcceptForm";
import { InvitationLanding } from "./InvitationLanding";

type Problem = "wrong_account" | "expired" | "revoked" | "used";

// Where a staff invitation link leads (SA-02, ADM-06; docs/design/staff-invite.md §3). Signed out, it shows the
// invitation and the way in (A6.1); signed in with the invited address, the acceptance (A6.4); otherwise why the
// link doesn't work (A6.7). accept_staff_invitation remains the check that the session's email is the invited one.
export default async function AcceptStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const { school, supabase, user, state } = await getAccount();
  const invitation = await previewInvitation(supabase, token, school.id);
  const email = (user?.email ?? "").toLowerCase();
  // Someone who already joined with this link goes straight to their admin pages.
  if (invitation.status === "accepted" && state && isStaff(state) && email === invitation.email)
    redirect("/admin");

  const locale = await getServerLocale();
  const t = translations[locale].staffInvite;
  const { shortName } = schoolBranding(school);
  const self = `/staff/accept?token=${encodeURIComponent(token)}`;
  const date = (value: string | null) => dateLabel(value, locale);

  if (invitation.status === "invalid") {
    return (
      <>
        <Nav />
        <main className="joinPage">
          <section className="joinCard joinCentered" aria-labelledby="invite-title">
            <span className="tag">{t.invalidChip}</span>
            <h1 id="invite-title">{t.invalidTitle}</h1>
            <p className="muted">{t.invalidBody}</p>
            <div className="authFooter">
              <Link href="/">{t.home}</Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  const problem: Problem | null =
    invitation.status === "accepted"
      ? "used"
      : invitation.status !== "open"
        ? invitation.status
        : user && email !== invitation.email
          ? "wrong_account"
          : null;
  const inviter = invitation.inviterName ?? t.platformTeam;
  const reviewer = invitation.role === "reviewer";
  const role = reviewer ? t.roleReviewer : t.roleSchoolAdmin;
  const facts = (
    <dl className="inviteFacts">
      <dt>{t.factRole}</dt>
      <dd>{reviewer ? t.roleReviewerTitle : t.roleSchoolAdminTitle}</dd>
      <dt>{t.factInvitedBy}</dt>
      <dd>{inviter}</dd>
      <dt>{t.factFor}</dt>
      <dd>{invitation.email}</dd>
    </dl>
  );

  if (problem) {
    const copy = {
      wrong_account: {
        chip: t.wrongChip,
        tone: "tagWarn",
        title: t.wrongTitle,
        body: format(t.wrongBody, { current: email, inviter, email: invitation.email }),
      },
      expired: {
        chip: t.expiredChip,
        tone: "tagWarn",
        title: t.expiredTitle,
        body: format(t.expiredBody, {
          sent: date(invitation.invitedAt),
          date: date(invitation.expiresAt),
        }),
      },
      revoked: {
        chip: t.revokedChip,
        tone: "",
        title: t.revokedTitle,
        body: format(t.revokedBody, { date: date(invitation.endedAt) }),
      },
      used: {
        chip: t.usedChip,
        tone: "tagGood",
        title: t.usedTitle,
        body: format(t.usedBody, { date: date(invitation.endedAt), email: invitation.email }),
      },
    }[problem];
    return (
      <>
        <Nav />
        <main className="joinPage">
          <section className="joinCard joinCentered" aria-labelledby="invite-title">
            <span className={`tag ${copy.tone}`}>{copy.chip}</span>
            <h1 id="invite-title">{copy.title}</h1>
            <p className="muted">{copy.body}</p>
            {facts}
            {problem === "expired" && <p>{format(t.expiredAction, { inviter })}</p>}
            {problem === "revoked" && <p>{format(t.revokedAction, { inviter })}</p>}
            {(problem === "wrong_account" || (problem === "used" && user)) && (
              <div className="formActions">
                <SignOutButton to={problem === "used" ? "/login" : self} label={t.wrongAction} />
              </div>
            )}
            {problem === "used" && !user && (
              <Link className="btn btnPrimary" href="/login">
                {t.usedAction}
              </Link>
            )}
            {problem === "wrong_account" && <p className="microcopy muted">{t.wrongFine}</p>}
          </section>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main className="joinPage joinSignupPage">
          <div className="joinSplit">
            <section className="joinIntro">
              <span className="joinEyebrow">{format(t.eyebrow, { school: shortName })}</span>
              <h1>{format(t.invitedYou, { inviter, school: shortName })}</h1>
              <p className="joinLead">
                {format(reviewer ? t.leadReviewer : t.leadSchoolAdmin, { school: shortName })}
              </p>
              <dl className="inviteFacts">
                <dt>{t.factRole}</dt>
                <dd>{reviewer ? t.roleReviewerTitle : t.roleSchoolAdminTitle}</dd>
                <dt>{t.factInvitedBy}</dt>
                <dd>{inviter}</dd>
                <dt>{t.factFor}</dt>
                <dd>{invitation.email}</dd>
                <dt>{t.factValidUntil}</dt>
                <dd>{date(invitation.expiresAt)}</dd>
              </dl>
              <ol className="joinJourney">
                <li>
                  <span className="joinDot joinCurrent" aria-hidden="true">
                    1
                  </span>
                  <div>
                    <h3>{t.stepOne}</h3>
                    <p>{t.stepOneHelp}</p>
                  </div>
                </li>
                <li>
                  <span className="joinDot" aria-hidden="true">
                    2
                  </span>
                  <div>
                    <h3>{t.stepTwo}</h3>
                    <p>{t.stepTwoHelp}</p>
                  </div>
                </li>
              </ol>
            </section>
            <InvitationLanding t={t} email={invitation.email} inviter={inviter} next={self} />
          </div>
        </main>
      </>
    );
  }

  const can = reviewer
    ? [t.reviewerCan1, t.reviewerCan2, t.reviewerCan3]
    : [t.schoolAdminCan1, t.schoolAdminCan2, t.schoolAdminCan3];
  const cannot = reviewer ? [t.reviewerCant1, t.reviewerCant2] : [t.schoolAdminCant1];
  return (
    <>
      <Nav />
      <main className="joinPage">
        <ol className="joinProgress" aria-label={t.steps}>
          <li>
            <span className="joinDot joinDone" aria-hidden="true">
              1
            </span>
            {t.stepOne}
          </li>
          <li aria-current="step">
            <span className="joinDot joinCurrent" aria-hidden="true">
              2
            </span>
            {t.stepTwo}
          </li>
        </ol>
        <section className="joinCard joinCentered" aria-labelledby="invite-title">
          <div className="joinStack">
            <span className="joinEyebrow">{format(t.eyebrow, { school: shortName })}</span>
            <h1 id="invite-title">{format(t.acceptTitle, { school: shortName, role })}</h1>
            <p className="muted">
              {format(t.invitedOn, { inviter, date: date(invitation.invitedAt) })}
            </p>
          </div>
          <dl className="inviteFacts">
            <dt>{t.signedInAs}</dt>
            <dd>
              {invitation.email} <span className="tag tagGood">{t.matches}</span>
            </dd>
            <dt>{t.factRole}</dt>
            <dd>{reviewer ? t.roleReviewerTitle : t.roleSchoolAdminTitle}</dd>
            <dt>{t.factSchool}</dt>
            <dd>{school.name}</dd>
          </dl>
          <div className="inviteLists">
            <div>
              <h3>{format(t.canTitle, { role })}</h3>
              <ul className="inviteCan">
                {can.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>{t.cantTitle}</h3>
              <ul className="inviteCant">
                {cannot.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="joinNotice">{format(t.personalData, { school: shortName })}</p>
          <AcceptForm
            token={token}
            t={{ accept: t.acceptButton, accepting: t.accepting, failed: t.acceptFailed }}
          />
          <p className="joinDivider">
            {t.notYou} <SignOutButton to={self} label={t.switchAccount} />
          </p>
          <p className="microcopy muted">
            {format(t.staysOpen, { date: date(invitation.expiresAt) })}
          </p>
        </section>
      </main>
    </>
  );
}
