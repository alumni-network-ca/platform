import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { OfferChoices, PublishChoices } from "@/components/profile/Choices";
import {
  FormAlert,
  ProfileForm,
  SelectInput,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/profile/ProfileForm";
import { EducationRows, RoleRows } from "@/components/profile/Repeaters";
import { homeFor } from "@/lib/auth/home";
import { format } from "@/lib/i18n";
import {
  CHANNELS,
  LANGUAGES,
  MAX,
  STEPS,
  initials,
  isStep,
  resumeStep,
  type Step,
} from "@/lib/profile/fields";
import { loadMyProfile, type MyProfile } from "@/lib/profile/server";
import { finish, saveStep } from "../actions";

// One step of the onboarding wizard (ONB-05; design OnbAbout, OnbCareer, OnbNetwork, OnbPublish). The welcome,
// education and contact steps are not drawn on the canvas: they reuse the drawn steps' layout.

/** Suggestions for the country field, named in the reader's language. */
const COUNTRIES = ["CA", "US", "IL", "FR", "GB", "BE", "CH", "MA"];

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  if (!isStep(step)) notFound();
  const me = await loadMyProfile(`/onboarding/${step}`);
  if (me.profile.onboarding_completed_at) redirect(homeFor(me.state));
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
              <StepFields step={step} me={me} />
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

function StepFields({ step, me }: { step: Exclude<Step, "publish">; me: MyProfile }): ReactNode {
  const { t, profile: p } = me;
  switch (step) {
    case "welcome":
      return (
        <fieldset className="onbFieldset">
          <legend>{t.languageLegend}</legend>
          <div className="onbOptions">
            {/* Each language is named in itself. */}
            {(
              [
                ["en", "English"],
                ["fr", "Français"],
              ] as const
            ).map(([code, label]) => (
              <label key={code} className="onbOption">
                <input
                  type="radio"
                  name="locale"
                  value={code}
                  defaultChecked={me.locale === code}
                />
                <span className="onbOptionText">
                  <strong lang={code}>{label}</strong>
                </span>
              </label>
            ))}
          </div>
          <span className="onbHint">{t.languageHint}</span>
        </fieldset>
      );

    case "about": {
      const regions = new Intl.DisplayNames([me.locale], { type: "region" });
      return (
        <>
          <div className="onbGrid">
            <TextInput
              name="first_name"
              label={t.firstName}
              defaultValue={p.first_name}
              maxLength={MAX.name}
              autoComplete="given-name"
              required
            />
            <TextInput
              name="last_name"
              label={t.lastName}
              defaultValue={p.last_name}
              maxLength={MAX.name}
              autoComplete="family-name"
              required
            />
            <TextInput
              name="maiden_name"
              label={format(t.maidenName, { school: me.school.shortName })}
              defaultValue={me.maidenName}
              hint={t.maidenHint}
              maxLength={MAX.name}
              optional
            />
            <div className="onbField">
              <span className="onbLabel">{t.gradClass}</span>
              <span className="onbStatic">
                {p.grad_year} <small>{t.gradConfirmed}</small>
              </span>
            </div>
            <TextInput
              name="city"
              label={t.city}
              defaultValue={p.city}
              maxLength={MAX.place}
              autoComplete="address-level2"
            />
            <TextInput
              name="country"
              label={t.country}
              defaultValue={p.country}
              maxLength={MAX.place}
              autoComplete="country-name"
              list="onb-countries"
            />
            <datalist id="onb-countries">
              {COUNTRIES.map((code) => (
                <option key={code} value={regions.of(code)} />
              ))}
            </datalist>
          </div>
          <fieldset className="onbFieldset">
            <legend>{t.languages}</legend>
            <div className="onbChips">
              {LANGUAGES.map((code) => (
                <label key={code} className="onbChip">
                  <input
                    type="checkbox"
                    name="languages"
                    value={code}
                    defaultChecked={p.languages.includes(code)}
                  />
                  {t.languageNames[code]}
                </label>
              ))}
            </div>
          </fieldset>
          <TextArea name="bio" label={t.bio} defaultValue={p.bio} maxLength={MAX.bio} optional />
        </>
      );
    }

    case "education":
      return (
        <EducationRows
          t={t}
          initial={me.education.map((row) => ({
            school: row.school,
            degree: row.degree ?? "",
            field_of_study: row.field_of_study ?? "",
            graduation_year: row.graduation_year,
          }))}
        />
      );

    case "career":
      return (
        <>
          <div className="onbGrid">
            <SelectInput
              name="career_field_id"
              label={t.careerField}
              defaultValue={p.career_field_id}
              placeholder={t.chooseField}
              options={me.careerFields.map((field) => ({ value: field.id, label: field.label }))}
            />
            <TextInput
              name="job_title"
              label={t.jobTitle}
              defaultValue={p.job_title}
              maxLength={MAX.title}
              autoComplete="organization-title"
            />
            <TextInput
              name="employer"
              label={t.employer}
              defaultValue={p.employer}
              maxLength={MAX.title}
              autoComplete="organization"
            />
          </div>
          <div className="onbSection">
            <div className="onbSectionHead">
              <h2>{t.previousRoles}</h2>
              <span>{t.previousRolesHint}</span>
            </div>
            <RoleRows initial={me.experience} t={t} />
          </div>
        </>
      );

    case "networking": {
      const hints: Record<string, string> = t.offerHints;
      return (
        <>
          <OfferChoices
            t={t}
            selected={me.offers}
            options={me.offerTypes.map((offer) => ({ ...offer, hint: hints[offer.key] }))}
          />
          <p className="onbHint">{t.noCommitment}</p>
        </>
      );
    }

    case "contact":
      return (
        <div className="onbSection">
          {CHANNELS.map((type) => {
            const saved = me.channels.get(type);
            return (
              <div key={type} className="onbChannel">
                <TextInput
                  name={type}
                  label={t.channels[type]}
                  defaultValue={saved?.value ?? (type === "email" ? me.user.email : "")}
                  placeholder={t.placeholders[type]}
                  type={type === "email" ? "email" : type === "phone" ? "tel" : "url"}
                  autoComplete={type === "email" ? "email" : type === "phone" ? "tel" : "url"}
                  maxLength={MAX.channel}
                />
                <label className="onbCheck">
                  <input
                    type="checkbox"
                    name={`${type}_public`}
                    defaultChecked={saved?.is_public ?? false}
                  />
                  {t.showOnProfile}
                  <span className="srOnly"> ({t.channels[type]})</span>
                </label>
              </div>
            );
          })}
        </div>
      );
  }
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
