import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import { PublishChoices } from "@/components/profile/Choices";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { format, translations } from "@/lib/i18n";
import { initials } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { saveVisibility } from "../actions";
import { BackArrow } from "@/components/icons";

// Publishing or hiding the profile (PRF-05), with the onboarding step's choices and directory preview.
export default async function VisibilityPage() {
  const me = await loadMyProfile("/me/visibility");
  if (!me.profile.onboarding_completed_at) redirect("/onboarding");
  const { t, profile: p } = me;
  const m = translations[me.locale].me;
  const school = me.school.shortName;
  // TODO(PUB-02): link the privacy policy and terms pages.
  const consentText = format(t.consent, { school })
    .split(/(\{privacy\}|\{terms\})/)
    .map((part, i) =>
      part === "{privacy}" ? (
        <a key={i} href="#">
          {t.privacyPolicy}
        </a>
      ) : part === "{terms}" ? (
        <a key={i} href="#">
          {t.terms}
        </a>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );

  return (
    <main className="onb meNarrow">
      <ProfileForm className="onbContents" action={saveVisibility} t={t}>
        <PublishChoices
          t={t}
          school={school}
          initial={p.visibility}
          consentText={consentText}
          preview={{
            initials: initials(p.preferred_name || p.first_name, p.last_name),
            name: `${p.preferred_name || p.first_name} ${p.last_name}`,
            classOf: format(t.classOf, { year: p.grad_year }),
            line: [p.job_title, p.employer, p.city].filter(Boolean).join(" · "),
            tags: me.offerTypes.filter((o) => me.offers.includes(o.key)).map((o) => o.label),
          }}
          head={
            <div className="onbHead">
              <Link className="meBackLink" href="/me">
                <BackArrow />
                {m.backToProfile}
              </Link>
              <h1>{m.visibilityTitle}</h1>
              <p>{p.visibility === "members" ? m.visibilityMembers : m.visibilityHidden}</p>
            </div>
          }
          back={
            <Link className="onbBack" href="/me">
              {m.cancel}
            </Link>
          }
          settings={{
            saveLabel: m.saveVisibility,
            hasConsent: me.consents.some((c) => c.document === "directory_publication"),
          }}
        />
      </ProfileForm>
    </main>
  );
}
