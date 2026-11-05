// Transactional email settings (EML-01, EML-08, ADR 0007). Environment values (the Resend key, the sender domain,
// the cron secret) are read through config/env/; everything fixed lives here.
import type { Enums } from "@/lib/database";

/** Resend's send endpoint. The outbox id goes in the Idempotency-Key header, so a retry is never delivered twice. */
export const RESEND_API_URL = "https://api.resend.com/emails";

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
] as const satisfies readonly Enums<"email_template_key">[];

/** Wait before attempt 2, 3, 4 and 5; after the fifth failure the row is failed for good. */
export const RETRY_MINUTES = [1, 5, 30, 120] as const;
export const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;

/** Rows one immediate send claims (the emails of one event), and rows one cron sweep sends. */
export const IMMEDIATE_BATCH = 20;
export const SWEEP_BATCH = 50;

/** last_error is cut to this length: an error message, never an address or a body. */
export const MAX_ERROR_LENGTH = 500;

/** Where every link in the emails lands; sign-in sends each person on to the right page. */
export const SIGN_IN_PATH = "/login";

/** Header rule and link colour when the school has not set a valid primary_color. */
export const DEFAULT_EMAIL_COLOR = "#1f3a5f";

/** Under every email. {network} is the school's network name. */
export const EMAIL_FOOTER = {
  en: "You receive this email because of your request or membership with the {network}. Reply to reach the alumni office.",
  fr: "Vous recevez ce courriel en lien avec votre demande ou votre adhésion au {network}. Répondez pour joindre le bureau des anciens.",
} as const;
