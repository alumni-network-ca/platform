// Types for transactional email (EML-01, EML-08, ADR 0007): the renderer (lib/email/render.ts), the Resend
// transport (lib/email/transport.ts) and the outbox worker (lib/email/outbox.ts). Settings live in config/email.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums, Tables } from "@/lib/database";

/** One kind of email: a key of email_templates. */
export type EmailTemplateKey = Enums<"email_template_key">;

/** A row of email_outbox: one email, queued by a business event in its own transaction. */
export type OutboxRow = Tables<"email_outbox">;

/** The values a template's {placeholders} are filled with. A missing one renders as empty text. */
export type Placeholders = Partial<
  Record<
    | "first_name"
    | "school_name"
    | "sign_in_link"
    | "action_link"
    | "confirm_link"
    | "reason"
    | "message"
    | "graduation_year"
    | "onboarding_link",
    string | null
  >
>;

/** How an email looks for one school. */
export type EmailBrand = {
  /** "Herzliah Alumni Network": the header and the sender's display name. */
  networkName: string;
  /** Absolute https URL of the school's logo, or null to show the name only. */
  logoUrl: string | null;
  /** #RRGGBB for the header rule and the links: lib/theme.ts schoolPrimary(), already validated. */
  primaryColor: string;
  locale: "en" | "fr";
};

/** A template after rendering: the subject, the plain-text part and the branded HTML part. */
export type RenderedEmail = { subject: string; text: string; html: string };

/** What the transport sends. */
export type OutgoingEmail = {
  /** The outbox id: Resend's idempotency key, so a retried row is never delivered twice (E2). */
  id: string;
  to: string;
  /** "Herzliah Alumni Network": the sender's display name. */
  fromName: string;
  replyTo: string | null;
  subject: string;
  text: string;
  html: string;
};

/** Sends one email; resolves with the provider's message id, if it gave one. */
export type Transport = (email: OutgoingEmail) => Promise<{ providerId: string | null }>;

/** What one worker run did, by outcome. Also the cron route's response body. */
export type DeliveryResult = { sent: number; retried: number; failed: number; skipped: number };

/** The secret-key Supabase client the worker reads and updates the outbox with. */
export type OutboxClient = SupabaseClient<Database>;

/** What the worker runs against; tests pass their own. */
export type OutboxDeps = {
  client: OutboxClient;
  transport: Transport;
  now: () => Date;
};
