import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { format } from "@/lib/i18n";
import { CHANNELS, LANGUAGES, MAX, type Section } from "@/lib/profile/fields";
import type { MyProfile } from "@/lib/profile/server";
import { OfferChoices } from "./Choices";
import {
  OptionText,
  fieldset,
  legend,
  optionCard,
  optionGrid,
  optionInput,
  subSection,
} from "./FormCard";
import { SelectInput, TextArea, TextInput, field, fieldHint, fieldLabel } from "./ProfileForm";
import { EducationRows, RoleRows } from "./Repeaters";

// The fields of each profile section, shared by the onboarding wizard (one step each) and /me (one edit page
// each). Server-rendered; the inputs are client components that show the action's errors.

/** Fields side by side, as many as fit. */
const grid = "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4.5";

/** Suggestions for the country field, named in the reader's language. */
const COUNTRIES = ["CA", "US", "IL", "FR", "GB", "BE", "CH", "MA"];

export function SectionFields({ section, me }: { section: Section; me: MyProfile }): ReactNode {
  const { t, profile: p } = me;
  switch (section) {
    case "welcome":
      return (
        <fieldset className={fieldset}>
          <legend className={legend}>{t.languageLegend}</legend>
          <div className={optionGrid}>
            {/* Each language is named in itself. */}
            {(
              [
                ["en", "English"],
                ["fr", "Français"],
              ] as const
            ).map(([code, label]) => (
              <label key={code} className={optionCard}>
                <input
                  type="radio"
                  name="locale"
                  value={code}
                  defaultChecked={me.locale === code}
                  className={optionInput}
                />
                <OptionText title={label} lang={code} />
              </label>
            ))}
          </div>
          <span className={fieldHint}>{t.languageHint}</span>
        </fieldset>
      );

    case "about": {
      const regions = new Intl.DisplayNames([me.locale], { type: "region" });
      return (
        <>
          <div className={grid}>
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
            <div className={field}>
              <span className={fieldLabel}>{t.gradClass}</span>
              <span className="flex h-11 items-center gap-2 rounded-md bg-secondary px-3 text-md font-semibold tabular-nums">
                {p.grad_year}
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <BadgeCheck aria-hidden className="size-3.5" />
                  {t.gradConfirmed}
                </span>
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
          <fieldset className={fieldset}>
            <legend className={legend}>{t.languages}</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((code) => (
                <label
                  key={code}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border-strong bg-card px-3.5 py-2 text-base font-medium transition-colors hover:border-input has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
                >
                  <input
                    type="checkbox"
                    name="languages"
                    value={code}
                    defaultChecked={p.languages.includes(code)}
                    className="accent-primary"
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
          <div className={grid}>
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
          <div className={subSection}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg leading-snug font-bold">{t.previousRoles}</h2>
              <span className="text-sm text-muted-foreground">{t.previousRolesHint}</span>
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
          <p className={fieldHint}>{t.noCommitment}</p>
        </>
      );
    }

    case "contact":
      return (
        <div className={subSection}>
          {CHANNELS.map((type) => {
            const saved = me.channels.get(type);
            return (
              <div
                key={type}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 max-[720px]:grid-cols-1"
              >
                <TextInput
                  name={type}
                  label={t.channels[type]}
                  defaultValue={saved?.value ?? (type === "email" ? me.user.email : "")}
                  placeholder={t.placeholders[type]}
                  type={type === "email" ? "email" : type === "phone" ? "tel" : "url"}
                  autoComplete={type === "email" ? "email" : type === "phone" ? "tel" : "url"}
                  maxLength={MAX.channel}
                />
                {/* Level with the field beside it, under its label; under the field on a phone. */}
                <label className="mt-[27px] inline-flex h-11 cursor-pointer items-center gap-2 text-base whitespace-nowrap max-[720px]:mt-0 max-[720px]:h-auto">
                  <input
                    type="checkbox"
                    name={`${type}_public`}
                    defaultChecked={saved?.is_public ?? false}
                    className="size-4 accent-primary"
                  />
                  {t.showOnProfile}
                  <span className="sr-only"> ({t.channels[type]})</span>
                </label>
              </div>
            );
          })}
        </div>
      );
  }
}
