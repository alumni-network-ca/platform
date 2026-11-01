import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Fragment } from "react";
import { Nav } from "@/components/Nav";
import { PublishChoices } from "@/components/profile/Choices";
import { FormAlert, ProfileForm, SubmitButton } from "@/components/profile/ProfileForm";
import { SectionFields } from "@/components/profile/SectionFields";
import { format } from "@/lib/i18n";
import { STEPS, initials, isStep, resumeStep, type Step } from "@/lib/profile/fields";
import { loadMyProfile } from "@/lib/profile/server";
import { finish, saveStep } from "../actions";

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
    <div className="onbHead">
      {step === "welcome" && (
        <span className="tag tagGood">
          {me.locale === "fr" ? `Approuvé par ${school}` : `Approved by ${school}`}
        </span>
      )}
      <small>{format(t.stepOf, { n: index + 1, total: STEPS.length })}</small>
      <h1>{title}</h1>
      <p>{intro}</p>
    </div>
  );
  const previous = STEPS[index - 1];
  const back = previous && (
    <Link className="onbBack" href={`/onboarding/${previous}`}>
      {t.back}
    </Link>
  );

  const rail = (
    <nav className="onbRail" aria-label={t.title}>
      <span className="onbRailTitle" aria-hidden="true">
        {t.title}
      </span>
      <ol className="onbSteps">
        {STEPS.map((name, i) => {
          const done = i < me.profile.onboarding_step && i !== index;
          const className = `onbStep${done ? " onbStepDone" : ""}`;
          const content = (
            <>
              <span className="onbDot" aria-hidden="true">
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
                <Link className={className} href={`/onboarding/${name}`}>
                  {content}
                </Link>
              ) : (
                <span className={className}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      <span className="onbNote">{t.savedNote}</span>
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
      <>
        <Nav />
        <main className="onb">
          {rail}
          <ProfileForm className="onbContents" action={finish} t={t}>
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
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="onb">
        {rail}
        <ProfileForm
          className="onbContents"
          action={saveStep.bind(null, step)}
          t={t}
          syncLocale={step === "welcome"}
        >
          <section className="onbCard">
            <div className="onbProgress">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="onbBody">
              {heading}
              <FormAlert />
              <SectionFields section={step} me={me} />
            </div>
            <div className="onbFooter">
              {back}
              <SubmitButton label={step === "welcome" ? t.start : t.saveAndContinue} />
            </div>
          </section>
        </ProfileForm>
      </main>
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}
