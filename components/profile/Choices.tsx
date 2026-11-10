"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/profile/fields";
import { Avatar, Tags } from "@/components/alumni/parts";
import {
  FormProgress,
  OptionText,
  consentBox,
  fieldset as fieldsetClass,
  formBody,
  formCard,
  formFooter,
  legend,
  optionCard,
  optionGrid,
  optionInput,
} from "./FormCard";
import { FieldErrorText, FormAlert, SubmitButton, field, type ProfileCopy } from "./ProfileForm";

/** The "Open to" options, with a live count of what is ticked. */
export function OfferChoices({
  options,
  selected,
  t,
}: {
  options: { key: string; label: string; hint?: string }[];
  selected: string[];
  t: ProfileCopy;
}) {
  const [count, setCount] = useState(selected.length);
  const fieldset = useRef<HTMLFieldSetElement>(null);
  // Boxes ticked before React hydrated are in the page but not yet in the count.
  useEffect(() => {
    setCount(fieldset.current?.querySelectorAll("input:checked").length ?? 0);
  }, []);
  return (
    <fieldset
      ref={fieldset}
      className={fieldsetClass}
      onChange={(event) => setCount(event.currentTarget.querySelectorAll("input:checked").length)}
    >
      <legend className={legend}>
        {t.openTo}{" "}
        <span className="font-normal text-muted-foreground tabular-nums">
          {format(t.selected, { count })}
        </span>
      </legend>
      <div className={optionGrid}>
        {options.map((option) => (
          <label key={option.key} className={optionCard}>
            <input
              type="checkbox"
              name="offers"
              value={option.key}
              defaultChecked={selected.includes(option.key)}
              className={optionInput}
            />
            <OptionText title={option.label} hint={option.hint} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type PreviewCard = {
  initials: string;
  name: string;
  classOf: string;
  line: string;
  tags: string[];
};

/**
 * The last step: who sees the profile, the consent, and a preview of the directory card (PRF-05). The finish
 * button names what will happen and stays disabled until the consent is ticked.
 */
export function PublishChoices({
  t,
  school,
  initial,
  consentText,
  preview,
  progress,
  head,
  back,
  settings,
}: {
  t: ProfileCopy;
  school: string;
  initial: Visibility;
  consentText: React.ReactNode;
  preview: PreviewCard;
  /** How far through the wizard, in percent (the onboarding step only). */
  progress?: number;
  /** The step's heading, drawn on the server. */
  head: React.ReactNode;
  back: React.ReactNode;
  /**
   * On /me: the consent is asked only to publish without one on file, and the button just saves. Without it
   * (onboarding), the consent is always needed and the button names what finishing does.
   */
  settings?: { saveLabel: string; hasConsent: boolean };
}) {
  const [visibility, setVisibility] = useState<Visibility>(initial);
  const [consent, setConsent] = useState(false);
  const card = useRef<HTMLElement>(null);
  // The inputs are uncontrolled, so a choice made before React hydrated stays in the page; this reads it into
  // the button label and the preview.
  useEffect(() => {
    const picked = card.current?.querySelector<HTMLInputElement>('[name="visibility"]:checked');
    const ticked = card.current?.querySelector<HTMLInputElement>('[name="consent"]');
    if (picked) setVisibility(picked.value === "members" ? "members" : "hidden");
    if (ticked) setConsent(ticked.checked);
  }, []);
  const members = visibility === "members";
  const askConsent = !settings || (members && !settings.hasConsent);
  const blocked = askConsent && !consent;
  const choices: [Visibility, string, string][] = [
    ["members", format(t.visMembers, { school }), t.visMembersHint],
    ["hidden", t.visHidden, t.visHiddenHint],
  ];
  const previewTitle = members ? t.previewMembers : t.previewHidden;
  return (
    // The card and its preview share one column, so the preview lines up under the card beside the onboarding steps.
    <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
      <section className={cn(formCard, "flex-none")} ref={card}>
        {progress !== undefined && <FormProgress value={progress} />}
        <div className={formBody}>
          {head}
          <FormAlert />
          <fieldset className={fieldsetClass}>
            <legend className={legend}>{t.visibility}</legend>
            {choices.map(([value, label, hint]) => (
              <label key={value} className={optionCard}>
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  defaultChecked={initial === value}
                  onChange={() => setVisibility(value)}
                  className={optionInput}
                />
                <OptionText title={label} hint={hint} />
              </label>
            ))}
          </fieldset>
          <div className={field} hidden={!askConsent}>
            <label className={consentBox}>
              <input
                type="checkbox"
                name="consent"
                onChange={(event) => setConsent(event.target.checked)}
                aria-describedby="consent-error"
                className={cn(optionInput, "mt-0.5")}
              />
              <span>{consentText}</span>
            </label>
            <FieldErrorText name="consent" id="consent-error" />
          </div>
        </div>
        <div className={formFooter}>
          {back}
          <SubmitButton
            label={
              blocked
                ? t.acceptFirst
                : settings
                  ? settings.saveLabel
                  : members
                    ? t.publish
                    : t.finishPrivate
            }
            disabled={blocked}
          />
        </div>
      </section>
      <aside className="flex flex-col gap-2.5" aria-label={previewTitle}>
        <span
          className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase"
          aria-hidden="true"
        >
          {previewTitle}
        </span>
        {/* Faded while the profile stays hidden: no one will see this card. */}
        <div
          className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-5 py-4.5 transition-opacity data-[hidden=true]:opacity-45"
          data-hidden={!members}
        >
          <Avatar initials={preview.initials} size="lg" />
          <span className="flex flex-[1_1_240px] flex-col gap-[3px] text-base text-subtle-foreground">
            <strong className="text-[1rem] font-extrabold text-foreground">
              {preview.name}{" "}
              <span className="font-medium text-muted-foreground">· {preview.classOf}</span>
            </strong>
            {preview.line && <span>{preview.line}</span>}
          </span>
          {preview.tags.length > 0 && <Tags labels={preview.tags} max={2} />}
        </div>
      </aside>
    </div>
  );
}
