import "server-only";
import {
  RESEND_ALREADY_ACCEPTED,
  RESEND_API_URL,
  RESEND_PERMANENT_STATUSES,
  RESEND_TIMEOUT_MS,
  SENDER_LOCAL_PART,
  SIGN_IN_PATH,
} from "@/config/email";
import { serverEnv } from "@/config/env/server";
import { secrets } from "@/config/env/secrets";
import { PermanentDataError, PermanentEmailError } from "@/lib/email/errors";
import { renderEmail } from "@/lib/email/render";
import { schoolBranding } from "@/lib/school";
import { schoolPrimary } from "@/lib/theme";
import { schoolUrl, type Origin } from "@/lib/tenant/address";
import type {
  EmailTemplateKey,
  OutboxClient,
  OutboxRow,
  OutgoingEmail,
  Placeholders,
  Transport,
} from "@/types/email";

// Builders for transactional email (EML-01, ADR 0007): the Resend transport, and the email for an outbox row.
// The worker that uses them is lib/email/outbox.ts; settings are in config/email.ts, types in types/email.ts.

// ---- Transport: every email goes through Resend, in every environment. A missing RESEND_API_KEY or
// EMAIL_FROM_DOMAIN throws here, before any row is claimed, instead of leaving emails queued.

/** Resend, with the key and sender domain read now, so a missing one fails before anything is claimed. */
export function resendTransport(): Transport {
  const apiKey = secrets.resendApiKey;
  // Quotes keep a name with a comma or an accent from being read as several addresses.
  const address = `${SENDER_LOCAL_PART}@${serverEnv.emailFromDomain}`;
  const from = (name: string) => `"${name.replace(/["\\\r\n]/g, "")}" <${address}>`;

  return async (email) => {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.id,
      },
      body: JSON.stringify({
        from: from(email.fromName),
        to: [email.to],
        reply_to: email.replyTo ?? undefined,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      // A timeout rejects like a network error: the row is retried later.
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (response.status === 409) {
      const { name } = (await response.json().catch(() => ({}))) as { name?: string };
      if (name === RESEND_ALREADY_ACCEPTED) return { providerId: null };
    }
    if (!response.ok) {
      // Only the status: the response can echo the recipient (logs keep ids and statuses only).
      const message = `Resend responded ${response.status}`;
      if (RESEND_PERMANENT_STATUSES.includes(response.status))
        throw new PermanentEmailError(message);
      throw new Error(message);
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { providerId: body.id ?? null };
  };
}

// ---- Email for an outbox row

/**
 * The email for one outbox row: loads the approved template, the school and the request or profile the row is about,
 * and renders it. Null when the school has no approved template any more.
 */
export async function buildEmail(
  client: OutboxClient,
  row: OutboxRow,
  origin: Origin,
): Promise<OutgoingEmail | null> {
  if (!row.institution_id) throw new PermanentDataError("outbox row has no school");
  const [template, school, person] = await Promise.all([
    client
      .from("email_templates")
      .select("subject, body")
      .eq("institution_id", row.institution_id)
      .eq("key", row.template_key as EmailTemplateKey)
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
  const values: Placeholders = {
    ...person,
    school_name: brand.shortName,
    sign_in_link: schoolUrl(origin, school.data.slug, SIGN_IN_PATH),
    // Sign-in sends each person to the right page (onboarding, the needs-info answer); these keep the old links.
    onboarding_link: schoolUrl(origin, school.data.slug, SIGN_IN_PATH),
    action_link:
      row.template_key === "access_needs_info"
        ? schoolUrl(origin, school.data.slug, SIGN_IN_PATH)
        : null,
  };
  const rendered = renderEmail(template.data, values, {
    networkName: brand.networkName,
    logoUrl: brand.logo ? schoolUrl(origin, school.data.slug, brand.logo) : null,
    primaryColor: schoolPrimary(school.data.branding),
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
async function loadSubject(client: OutboxClient, row: OutboxRow): Promise<Placeholders> {
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
