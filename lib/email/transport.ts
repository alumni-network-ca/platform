import "server-only";
import {
  RESEND_ALREADY_ACCEPTED,
  RESEND_API_URL,
  RESEND_PERMANENT_STATUSES,
  RESEND_TIMEOUT_MS,
  SENDER_LOCAL_PART,
} from "@/config/email";
import { serverEnv } from "@/config/env/server";
import { secrets } from "@/config/env/secrets";

// Every email goes through Resend (ADR 0007), in every environment. A missing RESEND_API_KEY or EMAIL_FROM_DOMAIN
// throws on first use instead of leaving emails queued.

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

/** A failure that retrying cannot fix, such as an address the provider rejects. */
export class PermanentEmailError extends Error {}

export type Transport = (email: OutgoingEmail) => Promise<{ providerId: string | null }>;

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
