import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelLink, FormAlert, ProfileForm, SubmitButton } from "@/components/profile/ProfileForm";
import { SectionFields } from "@/components/profile/SectionFields";
import { format, translations } from "@/lib/i18n";
import { isSection } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { saveSection } from "../../actions";
import { BackArrow } from "@/components/icons";

// One section of the profile, edited with the onboarding wizard's fields (PRF-02: the sections mirror it).
export default async function EditSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const me = await loadMyProfile(`/me/edit/${section}`);
  if (!me.profile.onboarding_completed_at) redirect("/onboarding");
  const { t } = me;
  const m = translations[me.locale].me;
  const school = me.school.shortName;
  const titles = {
    about: [t.aboutTitle, t.aboutIntro],
    education: [t.educationTitle, format(t.educationIntro, { school })],
    career: [t.careerTitle, t.careerIntro],
    networking: [t.networkingTitle, t.networkingIntro],
    contact: [t.contactTitle, t.contactIntro],
  } as const;
  const [title, intro] = titles[section];

  return (
    <main className="onb meNarrow">
      <ProfileForm
        className="onbContents"
        action={saveSection.bind(null, section)}
        t={t}
        unsavedWarning={m.unsaved}
      >
        <section className="onbCard">
          <div className="onbBody">
            <div className="onbHead">
              <Link className="meBackLink" href="/me">
                <BackArrow />
                {m.backToProfile}
              </Link>
              <h1>{title}</h1>
              <p>{intro}</p>
            </div>
            <FormAlert />
            <SectionFields section={section} me={me} />
          </div>
          <div className="onbFooter">
            <CancelLink href="/me" label={m.cancel} />
            <SubmitButton label={m.save} />
          </div>
        </section>
      </ProfileForm>
    </main>
  );
}
