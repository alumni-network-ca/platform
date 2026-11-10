"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { CopyLink } from "@/components/admin/CopyLink";
import { errorMessage, type AdminCopy } from "@/lib/admin/forms";
import { format } from "@/lib/i18n";
import { inviteStaff, type InviteResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForwardArrow } from "@/components/icons";
import { ui } from "@/components/admin/parts";
import { AbilityList } from "@/components/auth/parts";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function InviteForm({
  t,
  subject,
  sender,
}: {
  t: AdminCopy;
  /** The invitation email's subject as it will go out, or null when no template is approved. */
  subject: string | null;
  sender: string | null;
}) {
  const [state, action, pending] = useActionState<InviteResult, FormData>(inviteStaff, {
    error: null,
  });
  const [email, setEmail] = useState("");
  const roles = [
    {
      id: "reviewer",
      title: t.reviewer,
      summary: t.reviewerSummary,
      can: [t.reviewerCan1, t.reviewerCan2, t.reviewerCan3],
      cannot: [t.reviewerCant1, t.reviewerCant2],
    },
    {
      id: "school_admin",
      title: t.schoolAdmin,
      summary: t.schoolAdminSummary,
      can: [t.schoolAdminCan1, t.schoolAdminCan2, t.schoolAdminCan3, t.schoolAdminCan4],
      cannot: [t.schoolAdminCant1],
    },
  ];

  if (state.invited) {
    const { email, role, link, expires } = state.invited;
    return (
      <section className={cn(ui.panel, ui.inviteResult)} role="status">
        <h2>
          {format(t.invitationReady, {
            email,
            role: role === "reviewer" ? t.reviewer : t.schoolAdmin,
          })}
        </h2>
        <p>{format(t.invitationReadyHelp, { date: expires })}</p>
        <div className={ui.linkRow}>
          <label className={ui.field}>
            {t.invitationLink}
            <Input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
          <CopyLink value={link} label={t.copyLink} done={t.linkCopied} />
        </div>
        <div className={ui.formActions}>
          <Button asChild>
            <Link href="/admin/staff">{t.doneBackToStaff}</Link>
          </Button>
          {/* A full load starts a fresh form. */}
          <Button asChild variant="secondary">
            <a href="/admin/staff/invite">{t.inviteAnother}</a>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className={ui.inviteLayout}>
      <form action={action} className={cn(ui.panel, ui.adminStack, ui.inviteForm)}>
        <label className={cn(ui.field, ui.inviteEmail)}>
          {t.theirEmail}
          <Input
            name="email"
            type="email"
            autoComplete="off"
            maxLength={254}
            aria-describedby="invite-email-hint"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <p id="invite-email-hint" className={ui.fieldHint}>
          {t.theirEmailHint}
        </p>
        <fieldset className={ui.roleCards}>
          <legend>{t.role}</legend>
          {roles.map((role) => (
            <label key={role.id} className={ui.roleCard}>
              <span className={ui.roleCardHead}>
                <input
                  type="radio"
                  name="role"
                  value={role.id}
                  defaultChecked={role.id === "reviewer"}
                />
                <strong>{role.title}</strong>
              </span>
              <span className={ui.cellSub}>{role.summary}</span>
              <span className={ui.roleCardLabel}>{t.canLabel}</span>
              <AbilityList inline can items={role.can} />
              <span className={ui.roleCardLabel}>{t.cantLabel}</span>
              <AbilityList inline can={false} items={role.cannot} />
            </label>
          ))}
        </fieldset>
        {state.error && (
          <Alert variant="error" role="alert">
            {state.error === "alreadyStaff" ? t.alreadyStaff : errorMessage(state.error, t)}
          </Alert>
        )}
        <div className={cn(ui.formActions, ui.inviteActions)}>
          <Button loading={pending}>{t.invite}</Button>
          <Button asChild variant="secondary">
            <Link href="/admin/staff">{t.cancel}</Link>
          </Button>
        </div>
      </form>
      <aside className={ui.inviteAside}>
        <section className={cn(ui.panel, ui.inviteAsidePanel)}>
          <h2>{t.whatTheyReceive}</h2>
          {subject && (
            <div className={ui.invitePreview}>
              <strong>{subject}</strong>
              {sender && <span>{format(t.inviteFrom, { sender })}</span>}
            </div>
          )}
          <p>
            {t.inviteLinkTermsBefore}
            <strong>{email.trim() || t.inviteAddressFallback}</strong>
            {t.inviteLinkTermsAfter}
          </p>
          <p>{t.inviteNotEmailedYet}</p>
          <Link href="/admin/templates?key=staff_invitation">
            {t.seeTheEmail}
            <ForwardArrow />
          </Link>
        </section>
        <section className={cn(ui.panel, ui.inviteAsidePanel)}>
          <h2>{t.beforeAccessTitle}</h2>
          <p>{t.beforeAccess1}</p>
          <p>{t.beforeAccess2}</p>
        </section>
      </aside>
    </div>
  );
}
