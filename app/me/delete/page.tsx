import Link from "next/link";
import {
  FieldErrorText,
  FormAlert,
  ProfileForm,
  SubmitButton,
  field,
} from "@/components/profile/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";
import { format, translations } from "@/lib/i18n";
import { REAUTH_MINUTES, signedInRecently } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { deleteMyProfile } from "../actions";
import { BackArrow } from "@/components/icons";
import { frame, textLink } from "@/components/alumni/parts";
import {
  FormHead,
  consentBox,
  formBody,
  formCard,
  formFooter,
  optionInput,
} from "@/components/profile/FormCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Deleting this school's profile (PRF-06). It needs a recent sign-in (re-authentication); the action checks it
// again. The login itself stays: it may belong to other schools, and DEC-08's purge job handles the rest.
export default async function DeletePage() {
  const me = await loadMyProfile("/me/delete");
  const { t } = me;
  const m = translations[me.locale].me;
  const school = me.school.shortName;
  const recent = signedInRecently(me.user.last_sign_in_at, new Date());

  return (
    <main className={cn(frame.form, frame.narrow)}>
      <section className={formCard}>
        <div className={formBody}>
          <FormHead
            above={
              <Link className={cn(textLink, "text-base")} href="/me">
                <BackArrow />
                {m.backToProfile}
              </Link>
            }
            title={format(m.deleteTitle, { school })}
            intro={format(m.deleteIntro, { school })}
          />
          <ul className="list-disc pl-5 text-md leading-relaxed text-subtle-foreground">
            <li>{m.deleteErased}</li>
            <li>{m.deleteRequest}</li>
          </ul>
          {!recent && (
            <div className="flex flex-col items-start gap-2 rounded-lg bg-warning-soft px-4.5 py-4 text-warning">
              <h2 className="text-[1rem] font-bold">{m.reauthTitle}</h2>
              <p>{format(m.reauthBody, { minutes: REAUTH_MINUTES })}</p>
              <SignOutButton
                to="/login?next=%2Fme%2Fdelete"
                label={m.reauthButton}
                variant="secondary"
                size="sm"
                className="mt-1"
              />
            </div>
          )}
        </div>
        {recent && (
          <ProfileForm action={deleteMyProfile} t={t}>
            <div className={cn(formBody, "pt-0 max-[720px]:pt-0")}>
              <FormAlert />
              <div className={field}>
                <label className={consentBox}>
                  <input
                    type="checkbox"
                    name="confirm"
                    aria-describedby="confirm-error"
                    className={cn(optionInput, "mt-0.5")}
                  />
                  <span>{m.deleteConfirm}</span>
                </label>
                <FieldErrorText name="confirm" id="confirm-error" />
              </div>
            </div>
            <div className={formFooter}>
              <Button asChild variant="secondary">
                <Link href="/me">{m.cancel}</Link>
              </Button>
              <SubmitButton label={m.deleteButton} danger />
            </div>
          </ProfileForm>
        )}
      </section>
    </main>
  );
}
