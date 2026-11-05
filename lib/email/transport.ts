import "server-only";
import { serverEnv } from "@/config/env/server";
import { secrets } from "@/config/env/secrets";

// Where emails go (ADR 0007): Resend when RESEND_API_KEY is set (staging, production), otherwise SMTP, which is
// Mailpit locally and in CI. With neither, nothing is sent and the outbox rows wait.

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

// Quotes keep a name with a comma or an accent from being read as several addresses.
const from = (name: string) =>
  `"${name.replace(/["\\\r\n]/g, "")}" <noreply@${serverEnv.emailFromDomain}>`;

const resend =
  (apiKey: string): Transport =>
  async (email) => {
    const response = await fetch("https://api.resend.com/emails", {
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
    });
    if (!response.ok) {
      // Only the status: the response can echo the recipient (logs keep ids and statuses only).
      const message = `Resend responded ${response.status}`;
      if ([400, 403, 422].includes(response.status)) throw new PermanentEmailError(message);
      throw new Error(message);
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { providerId: body.id ?? null };
  };

const smtp =
  (url: string): Transport =>
  async (email) => {
    const { createTransport } = await import("nodemailer");
    const info = await createTransport(url).sendMail({
      from: from(email.fromName),
      to: email.to,
      replyTo: email.replyTo ?? undefined,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: { "X-Outbox-Id": email.id },
    });
    return { providerId: info.messageId ?? null };
  };

/** The configured transport, or null when this environment cannot send email. */
export function configuredTransport(): Transport | null {
  const apiKey = secrets.resendApiKey;
  if (apiKey) return resend(apiKey);
  const url = secrets.emailSmtpUrl;
  if (url) return smtp(url);
  return null;
}
