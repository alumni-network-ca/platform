import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums, Tables } from "@/lib/database";
import { schoolBranding } from "@/lib/school";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolUrl, type Origin } from "@/lib/tenant/address";
import { renderEmail, type Placeholders } from "./render";
import { configuredTransport, PermanentEmailError, type Transport } from "./transport";

// The outbox worker (EML-01, ADR 0007). Business events queue a row in email_outbox in their own transaction;
// this sends the rows: right after the action (lib/email/send.ts) and from the cron sweeper (/api/cron/email).
// Logs carry ids and statuses only, never addresses, bodies or links.

type Client = SupabaseClient<Database>;
type OutboxRow = Tables<"email_outbox">;
type TemplateKey = Enums<"email_template_key">;

/**
 * The templates this worker can fill. Staff invitations and the annual confirmation emails need a one-time link
 * that only exists when it is created (the database keeps its hash), so their senders come with their own issues.
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
] as const satisfies readonly TemplateKey[];

/** Wait before attempt 2, 3, 4 and 5; after the fifth failure the row is failed for good. */
export const RETRY_MINUTES = [1, 5, 30, 120];
export const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;

export type DeliveryResult = { sent: number; retried: number; failed: number; skipped: number };

type Deps = { client: Client; transport: Transport; now: () => Date };

class PermanentDataError extends Error {}

export async function deliverOutbox(
  options: { origin: Origin; subjectId?: string; limit?: number },
  deps?: Partial<Deps>,
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, retried: 0, failed: 0, skipped: 0 };
  const transport = deps?.transport ?? configuredTransport();
  if (!transport) {
    // No Resend key and no SMTP server (e.g. `next dev` on the shared cloud database): the rows wait.
    console.info("[email] no transport configured; outbox rows stay queued");
    return result;
  }
  const client = deps?.client ?? createAdminClient();
  const now = deps?.now ?? (() => new Date());

  const { data: rows, error } = await client.rpc("claim_email_outbox", {
    p_keys: [...SENDABLE_TEMPLATES],
    p_subject: options.subjectId,
    p_limit: options.limit ?? 20,
  });
  if (error) throw new Error(`[email] could not claim outbox rows: ${error.code}`);

  for (const row of rows ?? []) {
    const outcome = await deliverOne(client, transport, row, options.origin, now());
    result[outcome] += 1;
    console.info(`[email] ${row.id} ${row.template_key} attempt ${row.attempts}: ${outcome}`);
  }
  return result;
}

async function deliverOne(
  client: Client,
  transport: Transport,
  row: OutboxRow,
  origin: Origin,
  now: Date,
): Promise<keyof DeliveryResult> {
  try {
    const email = await buildEmail(client, row, origin);
    if (!email) {
      // The school withdrew its approved template after the row was queued: same rule as enqueue_email.
      await update(client, row.id, {
        status: "skipped_no_template",
        last_error: "no approved template",
      });
      return "skipped";
    }
    const { providerId } = await transport(email);
    await update(client, row.id, {
      status: "sent",
      provider_message_id: providerId,
      sent_at: now.toISOString(),
      last_error: null,
    });
    return "sent";
  } catch (cause) {
    const permanent = cause instanceof PermanentEmailError || cause instanceof PermanentDataError;
    const message = (cause instanceof Error ? cause.message : String(cause)).slice(0, 500);
    if (permanent || row.attempts >= MAX_ATTEMPTS) {
      await update(client, row.id, { status: "failed", last_error: message });
      return "failed";
    }
    const wait =
      RETRY_MINUTES[Math.min(Math.max(row.attempts, 1), RETRY_MINUTES.length) - 1]! * 60_000;
    await update(client, row.id, {
      status: "queued",
      last_error: message,
      next_attempt_at: new Date(now.getTime() + wait).toISOString(),
    });
    return "retried";
  }
}

async function update(client: Client, id: string, patch: Partial<OutboxRow>) {
  const { error } = await client.from("email_outbox").update(patch).eq("id", id);
  if (error) throw new Error(`[email] could not update outbox row ${id}: ${error.code}`);
}

/** Loads the template, the school and the event the row is about, and renders the email. Null: no template. */
async function buildEmail(client: Client, row: OutboxRow, origin: Origin) {
  if (!row.institution_id) throw new PermanentDataError("outbox row has no school");
  const [template, school, person] = await Promise.all([
    client
      .from("email_templates")
      .select("subject, body")
      .eq("institution_id", row.institution_id)
      .eq("key", row.template_key as TemplateKey)
      .eq("locale", row.locale)
      .eq("status", "approved")
      .maybeSingle(),
    client
      .from("institutions")
      .select("id, name, slug, default_locale, branding, reply_to_email, email_display_name")
      .eq("id", row.institution_id)
      .single(),
    loadSubject(client, row),
  ]);
  if (template.error) throw new Error(`template lookup failed: ${template.error.code}`);
  if (school.error) throw new Error(`school lookup failed: ${school.error.code}`);
  if (!template.data) return null;

  const brand = schoolBranding(school.data);
  const branding = (school.data.branding ?? {}) as Record<string, unknown>;
  const values: Placeholders = {
    ...person,
    school_name: brand.shortName,
    sign_in_link: schoolUrl(origin, school.data.slug, "/login"),
    // Sign-in sends each person to the right page (onboarding, the needs-info answer); these keep the old links.
    onboarding_link: schoolUrl(origin, school.data.slug, "/login"),
    action_link:
      row.template_key === "access_needs_info"
        ? schoolUrl(origin, school.data.slug, "/login")
        : null,
  };
  const rendered = renderEmail(template.data, values, {
    networkName: brand.networkName,
    logoUrl: brand.logo ? schoolUrl(origin, school.data.slug, brand.logo) : null,
    primaryColor: typeof branding.primary_color === "string" ? branding.primary_color : "",
    locale: row.locale,
  });
  return {
    id: row.id,
    to: row.to_email,
    fromName: school.data.email_display_name?.trim() || brand.networkName,
    replyTo: school.data.reply_to_email,
    ...rendered,
  };
}

/** The person's first name, and the school's question or reason, from the request or the record. */
async function loadSubject(client: Client, row: OutboxRow): Promise<Placeholders> {
  if (!row.subject_id) throw new PermanentDataError("outbox row has no subject");
  if (row.template_key.startsWith("access_")) {
    const { data, error } = await client
      .from("access_requests")
      .select("first_name, grad_year, info_request, decision_reason")
      .eq("id", row.subject_id)
      .maybeSingle();
    if (error) throw new Error(`request lookup failed: ${error.code}`);
    if (!data) throw new PermanentDataError("the access request no longer exists");
    return {
      first_name: data.first_name,
      graduation_year: String(data.grad_year),
      message: row.template_key === "access_needs_info" ? data.info_request : null,
      reason: row.template_key === "access_rejected" ? data.decision_reason : null,
    };
  }
  const { data, error } = await client
    .from("alumni_profiles")
    .select("first_name, preferred_name, grad_year")
    .eq("id", row.subject_id)
    .maybeSingle();
  if (error) throw new Error(`profile lookup failed: ${error.code}`);
  if (!data) throw new PermanentDataError("the profile no longer exists");
  return {
    first_name: data.preferred_name?.trim() || data.first_name,
    graduation_year: String(data.grad_year),
  };
}
