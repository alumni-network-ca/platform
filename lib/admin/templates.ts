import type { Enums } from "@/lib/database";
export const templateKeys = [
  "access_approved",
  "access_needs_info",
  "access_rejected",
  "welcome",
  "staff_invitation",
  "annual_confirmation",
  "confirmation_reminder_1",
  "confirmation_reminder_2",
] as const satisfies readonly Enums<"email_template_key">[];
// EML-01/03's renderer must supply graduation_year and onboarding_link before sending these variants.
export const templatePlaceholders: Record<Enums<"email_template_key">, readonly string[]> = {
  access_approved: [
    "first_name",
    "school_name",
    "graduation_year",
    "onboarding_link",
    "sign_in_link",
  ],
  access_needs_info: ["first_name", "school_name", "message", "sign_in_link", "action_link"],
  access_rejected: ["first_name", "school_name", "reason"],
  welcome: ["first_name", "school_name", "graduation_year", "sign_in_link"],
  staff_invitation: ["first_name", "school_name", "action_link"],
  annual_confirmation: ["first_name", "school_name", "confirm_link"],
  confirmation_reminder_1: ["first_name", "school_name", "confirm_link"],
  confirmation_reminder_2: ["first_name", "school_name", "confirm_link"],
};
