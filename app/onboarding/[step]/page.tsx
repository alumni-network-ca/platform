import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Fragment } from "react";
import { PublishChoices } from "@/components/profile/Choices";
import { FormAlert, ProfileForm, SubmitButton } from "@/components/profile/ProfileForm";
import { SectionFields } from "@/components/profile/SectionFields";
import { format } from "@/lib/i18n";
import { STEPS, initials, isStep, resumeStep, type Step } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { finish, saveStep } from "../actions";
import { Check } from "lucide-react";
import { frame } from "@/components/alumni/parts";
import {
  FormHead,
  FormProgress,
  formBody,
  formCard,
  formFooter,
} from "@/components/profile/FormCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// One step of the onboarding wizard (ONB-05; design OnbAbout, OnbCareer, OnbNetwork, OnbPublish). The welcome,
// education and contact steps are not drawn on the canvas: they reuse the drawn steps' layout.

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  if (!isStep(step)) notFound();
  const me = await loadMyProfile(`/onboarding/${step}`);
  if (me.profile.onboarding_completed_at) redirect("/me");
  // Steps after the next unsaved one are not open yet.
  const resume = STEPS.indexOf(resumeStep(me.profile.onboarding_step));
  const index = STEPS.indexOf(step);
  if (index > resume) redirect(`/onboarding/${STEPS[resume]}`);

  const { t, profile: p } = me;
  const school = me.school.shortName;
  const progress = ((index + 1) / STEPS.length) * 100;
  const titles: Record<Step, [string, string]> = {
    welcome: [format(t.welcomeTitle, { school }), format(t.welcomeIntro, { school })],
    about: [t.aboutTitle, t.aboutIntro],
    education: [t.educationTitle, format(t.educationIntro, { school })],
    career: [t.careerTitle, t.careerIntro],
    networking: [t.networkingTitle, t.networkingIntro],
    contact: [t.contactTitle, t.contactIntro],
    publish: [t.publishTitle, t.publishIntro],
  };
  const [title, intro] = titles[step];
  const heading = (
    <FormHead
      above={
        step === "welcome" && (
          <Badge variant="success" className="py-1">
            {me.locale === "fr" ? `Approuvé par ${school}` : `Approved by ${school}`}
          </Badge>
        )
      }
      step={format(t.stepOf, { n: index + 1, total: STEPS.length })}
      title={title}
      intro={intro}
    />
  );
  const previous = STEPS[index - 1];
  const back = previous && (
    <Button asChild variant="secondary">
      <Link href={`/onboarding/${previous}`}>{t.back}</Link>
    </Button>
  );

  const rail = (
    // On a phone the card's "Step n of 7" and progress bar say where you are; the list would push the form down.
    <nav
      className="flex max-w-[280px] flex-[1_1_240px] flex-col gap-3.5 max-[720px]:hidden"
      aria-label={t.title}
    >
      <span
        className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase"
        aria-hidden="true"
      >
        {t.title}
      </span>
      <ol className="flex flex-col gap-1">
        {STEPS.map((name, i) => {
          const done = i < me.profile.onboarding_step && i !== index;
          const current = i === index;
          const className = cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium text-muted-foreground",
            done && "text-foreground",
            current && "bg-primary-soft font-bold text-foreground",
          );
          const content = (
            <>
              <span
                className={cn(
                  "grid size-[26px] shrink-0 place-items-center rounded-full border-2 border-input bg-card text-xs font-bold text-muted-foreground",
                  done && "border-0 bg-brand text-brand-foreground",
                  current && "border-0 bg-primary text-primary-foreground",
                )}
                aria-hidden="true"
              >
                {done ? <CheckIcon /> : i + 1}
              </span>
              {t.steps[name]}
            </>
          );
          return (
            <li key={name}>
              {i === index ? (
                <span className={className} aria-current="step">
                  {content}
                </span>
              ) : i <= resume ? (
                <Link
                  className={cn(
                    className,
                    "outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/45",
                  )}
                  href={`/onboarding/${name}`}
                >
                  {content}
                </Link>
              ) : (
                <span className={className}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      <span className="pl-3 text-sm text-muted-foreground">{t.savedNote}</span>
    </nav>
  );

  if (step === "publish") {
    const name = `${p.preferred_name || p.first_name} ${p.last_name}`;
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
      <main data-ui className={frame.form}>
        {rail}
        <ProfileForm className="contents" action={finish} t={t}>
          <PublishChoices
            t={t}
            school={school}
            initial={p.visibility}
            consentText={consentText}
            preview={{
              initials: initials(p.preferred_name || p.first_name, p.last_name),
              name,
              classOf: format(t.classOf, { year: p.grad_year }),
              line: [p.job_title, p.employer, p.city].filter(Boolean).join(" · "),
              tags: me.offerTypes.filter((o) => me.offers.includes(o.key)).map((o) => o.label),
            }}
            progress={progress}
            head={heading}
            back={back}
          />
        </ProfileForm>
      </main>
    );
  }

  return (
    <main data-ui className={frame.form}>
      {rail}
      <ProfileForm
        className="contents"
        action={saveStep.bind(null, step)}
        t={t}
        syncLocale={step === "welcome"}
      >
        <section className={formCard}>
          <FormProgress value={progress} />
          <div className={formBody}>
            {heading}
            <FormAlert />
            <SectionFields section={step} me={me} />
          </div>
          <div className={formFooter}>
            {back}
            <SubmitButton label={step === "welcome" ? t.start : t.saveAndContinue} />
          </div>
        </section>
      </ProfileForm>
    </main>
  );
}

function CheckIcon() {
  return <Check size={13} strokeWidth={3} />;
}
