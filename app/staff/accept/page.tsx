import Link from "next/link";
import { redirect } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AbilityList,
  AuthCard,
  AuthPage,
  Callout,
  Divider,
  Facts,
  Footer,
  Journey,
  StepBar,
  eyebrow,
  fine,
  footerLink,
  intro,
  introTitle,
  lead,
  muted,
  pageTitle,
  split,
  stack,
} from "@/components/auth/parts";

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
      <AuthPage>
        <AuthCard size="wide" aria-labelledby="invite-title">
          <div className={stack()}>
            <Badge className="mb-1 py-1">{t.invalidChip}</Badge>
            <h1 id="invite-title" className={pageTitle}>
              {t.invalidTitle}
            </h1>
            <p className={muted}>{t.invalidBody}</p>
          </div>
          <Footer>
            <Link className={footerLink} href="/">
              {t.home}
            </Link>
          </Footer>
        </AuthCard>
      </AuthPage>
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
  const roleTitle = reviewer ? t.roleReviewerTitle : t.roleSchoolAdminTitle;
  const facts = (
    <Facts
      sunken
      items={[
        [t.factRole, roleTitle],
        [t.factInvitedBy, inviter],
        [t.factFor, invitation.email],
      ]}
    />
  );

  if (problem) {
    const copy = {
      wrong_account: {
        chip: t.wrongChip,
        tone: "warning" as const,
        title: t.wrongTitle,
        body: format(t.wrongBody, { current: email, inviter, email: invitation.email }),
      },
      expired: {
        chip: t.expiredChip,
        tone: "warning" as const,
        title: t.expiredTitle,
        body: format(t.expiredBody, {
          sent: date(invitation.invitedAt),
          date: date(invitation.expiresAt),
        }),
      },
      revoked: {
        chip: t.revokedChip,
        tone: "neutral" as const,
        title: t.revokedTitle,
        body: format(t.revokedBody, { date: date(invitation.endedAt) }),
      },
      used: {
        chip: t.usedChip,
        tone: "success" as const,
        title: t.usedTitle,
        body: format(t.usedBody, { date: date(invitation.endedAt), email: invitation.email }),
      },
    }[problem];
    return (
      <AuthPage>
        <AuthCard size="wide" aria-labelledby="invite-title">
          <div className={stack()}>
            <Badge variant={copy.tone} className="mb-1 py-1">
              {copy.chip}
            </Badge>
            <h1 id="invite-title" className={pageTitle}>
              {copy.title}
            </h1>
            <p className={muted}>{copy.body}</p>
          </div>
          {facts}
          {problem === "expired" && <p>{format(t.expiredAction, { inviter })}</p>}
          {problem === "revoked" && <p>{format(t.revokedAction, { inviter })}</p>}
          {(problem === "wrong_account" || (problem === "used" && user)) && (
            <SignOutButton
              to={problem === "used" ? "/login" : self}
              label={t.wrongAction}
              variant="default"
              className="self-start"
            />
          )}
          {problem === "used" && !user && (
            <Button asChild className="self-start">
              <Link href="/login">{t.usedAction}</Link>
            </Button>
          )}
          {problem === "wrong_account" && <p className={fine}>{t.wrongFine}</p>}
        </AuthCard>
      </AuthPage>
    );
  }

  if (!user) {
    return (
      <AuthPage compact>
        <div className={split}>
          <section className={intro({ compact: true })}>
            <span className={eyebrow}>{format(t.eyebrow, { school: shortName })}</span>
            <h1 className={introTitle}>{format(t.invitedYou, { inviter, school: shortName })}</h1>
            <p className={lead}>
              {format(reviewer ? t.leadReviewer : t.leadSchoolAdmin, { school: shortName })}
            </p>
            <Facts
              items={[
                [t.factRole, roleTitle],
                [t.factInvitedBy, inviter],
                [t.factFor, invitation.email],
                [t.factValidUntil, date(invitation.expiresAt)],
              ]}
            />
            <Journey
              compact
              steps={[
                { state: "current", title: t.stepOne, body: t.stepOneHelp },
                { state: "todo", title: t.stepTwo, body: t.stepTwoHelp },
              ]}
            />
          </section>
          <InvitationLanding t={t} email={invitation.email} inviter={inviter} next={self} />
        </div>
      </AuthPage>
    );
  }

  const can = reviewer
    ? [t.reviewerCan1, t.reviewerCan2, t.reviewerCan3]
    : [t.schoolAdminCan1, t.schoolAdminCan2, t.schoolAdminCan3];
  const cannot = reviewer ? [t.reviewerCant1, t.reviewerCant2] : [t.schoolAdminCant1];
  return (
    <AuthPage>
      <StepBar
        label={t.steps}
        steps={[
          { label: t.stepOne, state: "done" },
          { label: t.stepTwo, state: "current" },
        ]}
      />
      <AuthCard size="wide" aria-labelledby="invite-title">
        <div className={stack()}>
          <span className={eyebrow}>{format(t.eyebrow, { school: shortName })}</span>
          <h1 id="invite-title" className={pageTitle}>
            {format(t.acceptTitle, { school: shortName, role })}
          </h1>
          <p className={muted}>
            {format(t.invitedOn, { inviter, date: date(invitation.invitedAt) })}
          </p>
        </div>
        <Facts
          sunken
          items={[
            [
              t.signedInAs,
              <>
                {invitation.email}
                <Badge variant="success">{t.matches}</Badge>
              </>,
            ],
            [t.factRole, roleTitle],
            [t.factSchool, school.name],
          ]}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5">
          <div>
            <h3 className="mb-2 text-md font-bold">{format(t.canTitle, { role })}</h3>
            <AbilityList can items={can} />
          </div>
          <div>
            <h3 className="mb-2 text-md font-bold">{t.cantTitle}</h3>
            <AbilityList can={false} items={cannot} />
          </div>
        </div>
        <Callout as="p">{format(t.personalData, { school: shortName })}</Callout>
        <AcceptForm
          token={token}
          t={{ accept: t.acceptButton, accepting: t.accepting, failed: t.acceptFailed }}
        />
        <Divider>
          {t.notYou} <SignOutButton to={self} label={t.switchAccount} className="text-sm" />
        </Divider>
        <p className={fine}>{format(t.staysOpen, { date: date(invitation.expiresAt) })}</p>
      </AuthCard>
    </AuthPage>
  );
}
