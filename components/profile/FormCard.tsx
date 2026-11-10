import type { ReactNode } from "react";
import { panel } from "@/components/alumni/parts";
import { cn } from "@/lib/utils";

// The card a profile form sits in: an onboarding step (design OnbAbout to OnbPublish) and the forms under /me, which
// reuse its layout.

export const formCard = cn(panel, "flex min-w-0 flex-[999_1_560px] flex-col");
export const formBody = "flex flex-col gap-6 px-9 py-8 max-[720px]:px-5 max-[720px]:py-6";
export const formFooter =
  "flex flex-wrap items-center justify-between gap-3 border-t px-9 py-4.5 max-[720px]:px-5 max-[720px]:py-4";

/** How far through the wizard, along the card's top edge. "Step n of 7" says it in words. */
export function FormProgress({ value }: { value: number }) {
  return (
    <div aria-hidden="true" className="h-1 overflow-hidden rounded-t-lg bg-border">
      <span className="block h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

/** The card's heading: a back link or a tag above it, the step, the title and what the step is for. */
export function FormHead({
  above,
  step,
  title,
  intro,
}: {
  above?: ReactNode;
  step?: string;
  title: string;
  intro: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      {above}
      {step && <small className="text-sm font-semibold text-muted-foreground">{step}</small>}
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="text-md leading-[1.55] text-subtle-foreground">{intro}</p>
    </div>
  );
}

/** A part of a step: the previous roles, the schools, the contact channels. */
export const subSection = "flex flex-col gap-3";

/** A group of choices with its legend ("Open to", "Who can see your profile"). */
export const fieldset = "flex min-w-0 flex-col gap-2.5";
export const legend = "mb-2.5 text-sm font-semibold";

/** Cards to pick from, as many columns as fit. */
export const optionGrid = "grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3";

/**
 * A radio or checkbox drawn as a card. A picked one gets a second line of the school's colour inside its border, so
 * nothing moves.
 */
export const optionCard =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-border-strong bg-card px-4 py-3.5 transition-colors hover:border-input has-checked:border-primary has-checked:bg-primary-soft has-checked:ring-1 has-checked:ring-primary has-checked:ring-inset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring";
export const optionInput = "mt-px size-[18px] shrink-0 accent-primary";

/** A card's two lines: what the option is, then what it means. */
export function OptionText({ title, hint, lang }: { title: string; hint?: string; lang?: string }) {
  return (
    <span className="flex flex-col gap-[3px]">
      <strong className="text-md" lang={lang}>
        {title}
      </strong>
      {hint && <span className="text-sm leading-[1.45] text-muted-foreground">{hint}</span>}
    </span>
  );
}

/** The consent box: a checkbox with the sentence that links the policies. */
export const consentBox =
  "flex cursor-pointer items-start gap-3 rounded-lg bg-background px-4.5 py-4 text-base leading-normal has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring [&_a]:text-primary [&_a]:underline";
