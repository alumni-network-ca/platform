import type { ReactNode } from "react";
import { format } from "@/lib/i18n";
import { CHANNELS, LANGUAGES, MAX, type Section } from "@/lib/profile/fields";
import type { MyProfile } from "@/lib/profile/server";
import { OfferChoices } from "./Choices";
import { SelectInput, TextArea, TextInput } from "./ProfileForm";
import { EducationRows, RoleRows } from "./Repeaters";

// The fields of each profile section, shared by the onboarding wizard (one step each) and /me (one edit page
// each). Server-rendered; the inputs are client components that show the action's errors.

/** Suggestions for the country field, named in the reader's language. */
const COUNTRIES = ["CA", "US", "IL", "FR", "GB", "BE", "CH", "MA"];

export function SectionFields({ section, me }: { section: Section; me: MyProfile }): ReactNode {
  const { t, profile: p } = me;
  switch (section) {
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
