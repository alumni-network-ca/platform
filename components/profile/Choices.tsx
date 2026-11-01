"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "@/lib/i18n";
import type { Visibility } from "@/lib/profile/fields";
import { FieldErrorText, FormAlert, SubmitButton, type ProfileCopy } from "./ProfileForm";

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
      className="onbFieldset"
      onChange={(event) => setCount(event.currentTarget.querySelectorAll("input:checked").length)}
    >
      <legend>
        {t.openTo} <small>{format(t.selected, { count })}</small>
      </legend>
      <div className="onbOptions">
        {options.map((option) => (
          <label key={option.key} className="onbOption">
            <input
              type="checkbox"
              name="offers"
              value={option.key}
              defaultChecked={selected.includes(option.key)}
            />
            <span className="onbOptionText">
              <strong>{option.label}</strong>
              {option.hint && <span>{option.hint}</span>}
            </span>
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
  const shown = preview.tags.slice(0, 2);
  const more = preview.tags.length - shown.length;
  const previewTitle = members ? t.previewMembers : t.previewHidden;
  return (
    <>
      <section className="onbCard" ref={card}>
        {progress !== undefined && (
          <div className="onbProgress">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="onbBody">
          {head}
          <FormAlert />
          <fieldset className="onbFieldset">
            <legend>{t.visibility}</legend>
            {choices.map(([value, label, hint]) => (
              <label key={value} className="onbOption">
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  defaultChecked={initial === value}
                  onChange={() => setVisibility(value)}
                />
                <span className="onbOptionText">
                  <strong>{label}</strong>
                  <span>{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="onbField" hidden={!askConsent}>
            <label className="onbConsent">
              <input
                type="checkbox"
                name="consent"
                onChange={(event) => setConsent(event.target.checked)}
                aria-describedby="consent-error"
              />
              <span>{consentText}</span>
            </label>
            <FieldErrorText name="consent" id="consent-error" />
          </div>
        </div>
        <div className="onbFooter">
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
      <aside className="onbPreview" aria-label={previewTitle}>
        <div className="onbPreviewInner">
          <span className="onbPreviewTitle" aria-hidden="true">
            {previewTitle}
          </span>
          <div className="onbPreviewCard" data-hidden={!members}>
            <span className="onbAvatar" aria-hidden="true">
              {preview.initials}
            </span>
            <span className="onbPreviewWho">
              <strong>
                {preview.name} <span>· {preview.classOf}</span>
              </strong>
              {preview.line && <span>{preview.line}</span>}
            </span>
            {shown.length > 0 && (
              <span className="onbTags">
                {shown.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
                {more > 0 && <span>+{more}</span>}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
