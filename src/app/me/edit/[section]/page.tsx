import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelLink, FormAlert, ProfileForm, SubmitButton } from "@/components/profile/ProfileForm";
import { SectionFields } from "@/components/profile/SectionFields";
import { format, translations } from "@/lib/i18n";
import { isSection } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { saveSection } from "../../actions";
import { BackArrow } from "@/components/icons";
import { frame, textLink } from "@/components/alumni/parts";
import { FormHead, formBody, formCard, formFooter } from "@/components/profile/FormCard";
import { cn } from "@/lib/utils";

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
    <main className={cn(frame.form, frame.narrow)}>
      <ProfileForm
        className="contents"
        action={saveSection.bind(null, section)}
        t={t}
        unsavedWarning={m.unsaved}
      >
        <section className={formCard}>
          <div className={formBody}>
            <FormHead
              above={
                <Link className={cn(textLink, "text-base")} href="/me">
                  <BackArrow />
                  {m.backToProfile}
                </Link>
              }
              title={title}
              intro={intro}
            />
            <FormAlert />
            <SectionFields section={section} me={me} />
          </div>
          <div className={formFooter}>
            <CancelLink href="/me" label={m.cancel} />
            <SubmitButton label={m.save} />
          </div>
        </section>
      </ProfileForm>
    </main>
  );
}
