// Transactional email settings (EML-01, EML-08, ADR 0007). Environment values (the Resend key, the sender domain,
// the cron secret) are read through config/env/; everything fixed lives here.
import type { EmailTemplateKey } from "@/types/email";

/** Resend's send endpoint. The outbox id goes in the Idempotency-Key header, so a retry is never delivered twice. */
export const RESEND_API_URL = "https://api.resend.com/emails";

/** A Resend call that takes longer is abandoned and retried later, so a hung connection never holds a row. */
export const RESEND_TIMEOUT_MS = 10_000;

/**
 * Resend's 409 answers for a reused Idempotency-Key. "Different payload" means Resend already accepted this outbox
 * row (a retry re-rendered it after the template or the address changed), so the row counts as sent. "Still in
 * progress" is retried like any other temporary failure.
 */
export const RESEND_ALREADY_ACCEPTED = "invalid_idempotent_request";

/** Resend answers that retrying can't fix (bad request, unverified domain, invalid address): the row fails at once. */
export const RESEND_PERMANENT_STATUSES: readonly number[] = [400, 403, 422];

/** The sender is "<School> Alumni Network" <noreply@EMAIL_FROM_DOMAIN> (DEC-12). */
export const SENDER_LOCAL_PART = "noreply";

/**
 * The templates the worker can fill. Staff invitations and the annual confirmation emails need a one-time link that
 * only exists when it is created (the database keeps its hash), so their senders come with their own issues.
 */
export const SENDABLE_TEMPLATES = [
  "access_received",
  "access_approved",
  "access_needs_info",
  "access_rejected",
  "access_withdrawn",
  "membership_suspended",
  "membership_reactivated",
  "welcome",
] as const satisfies readonly EmailTemplateKey[];

/** Wait before attempt 2, 3, 4 and 5; after the fifth failure the row is failed for good. */
export const RETRY_MINUTES = [1, 5, 30, 120] as const;
export const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;

/** Rows one immediate send claims (the emails of one event), and rows one cron sweep sends. */
export const IMMEDIATE_BATCH = 20;
export const SWEEP_BATCH = 50;

/** last_error is cut to this length: an error message, never an address or a body. */
export const MAX_ERROR_LENGTH = 500;

/** The placeholders that hold links the app builds. Only these become clickable in the HTML part; an address typed
 * by a person (a name, a reason) stays plain text, so nobody can slip a link into a school-branded email. */
export const LINK_PLACEHOLDERS = [
  "sign_in_link",
  "action_link",
  "onboarding_link",
  "confirm_link",
] as const;

/** Where every link in the emails lands; sign-in sends each person on to the right page. */
export const SIGN_IN_PATH = "/login";

/** Under every email. {network} is the school's network name. */
export const EMAIL_FOOTER = {
  en: "You receive this email because of your request or membership with the {network}. Reply to reach the alumni office.",
  fr: "Vous recevez ce courriel en lien avec votre demande ou votre adhésion au {network}. Répondez pour joindre le bureau des anciens.",
} as const;
