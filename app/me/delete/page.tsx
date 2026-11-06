import Link from "next/link";
import { Nav } from "@/components/Nav";
import {
  FieldErrorText,
  FormAlert,
  ProfileForm,
  SubmitButton,
} from "@/components/profile/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";
import { format, translations } from "@/lib/i18n";
import { REAUTH_MINUTES, signedInRecently } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { deleteMyProfile } from "../actions";
import { BackArrow } from "@/components/icons";

// Deleting this school's profile (PRF-06). It needs a recent sign-in (re-authentication); the action checks it
// again. The login itself stays: it may belong to other schools, and DEC-08's purge job handles the rest.
export default async function DeletePage() {
  const me = await loadMyProfile("/me/delete");
  const { t } = me;
  const m = translations[me.locale].me;
  const school = me.school.shortName;
  const recent = signedInRecently(me.user.last_sign_in_at, new Date());

  return (
    <>
      <Nav />
      <main className="onb meNarrow">
        <section className="onbCard">
          <div className="onbBody">
            <div className="onbHead">
              <Link className="meBackLink" href="/me">
                <BackArrow />
                {m.backToProfile}
              </Link>
              <h1>{format(m.deleteTitle, { school })}</h1>
              <p>{format(m.deleteIntro, { school })}</p>
            </div>
            <ul className="meBullets">
              <li>{m.deleteErased}</li>
              <li>{m.deleteRequest}</li>
            </ul>
            {!recent && (
              <div className="meReauth">
                <h2>{m.reauthTitle}</h2>
                <p>{format(m.reauthBody, { minutes: REAUTH_MINUTES })}</p>
                <SignOutButton to="/login?next=%2Fme%2Fdelete" label={m.reauthButton} />
              </div>
            )}
          </div>
          {recent && (
            <ProfileForm action={deleteMyProfile} t={t}>
              <div className="onbBody meDeleteForm">
                <FormAlert />
                <div className="onbField">
                  <label className="onbConsent">
                    <input type="checkbox" name="confirm" aria-describedby="confirm-error" />
                    <span>{m.deleteConfirm}</span>
                  </label>
                  <FieldErrorText name="confirm" id="confirm-error" />
                </div>
              </div>
              <div className="onbFooter">
                <Link className="onbBack" href="/me">
                  {m.cancel}
                </Link>
                <SubmitButton label={m.deleteButton} danger />
              </div>
            </ProfileForm>
          )}
        </section>
      </main>
    </>
  );
}
