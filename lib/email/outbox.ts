import "server-only";
import {
  IMMEDIATE_BATCH,
  MAX_ATTEMPTS,
  MAX_ERROR_LENGTH,
  RETRY_MINUTES,
  SENDABLE_TEMPLATES,
} from "@/config/email";
import { buildEmail, resendTransport } from "@/factories/email";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Origin } from "@/lib/tenant/address";
import type { DeliveryResult, OutboxClient, OutboxDeps, OutboxRow, Transport } from "@/types/email";
import { PermanentDataError, PermanentEmailError } from "./errors";

// The outbox worker (EML-01, ADR 0007). Business events queue a row in email_outbox in their own transaction;
// this sends the rows: right after the action (lib/email/send.ts) and from the cron sweeper (/api/cron/email).
// Logs carry ids and statuses only, never addresses, bodies or links.

export async function deliverOutbox(
  options: { origin: Origin; subjectId?: string; limit?: number },
  deps?: Partial<OutboxDeps>,
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, retried: 0, failed: 0, skipped: 0 };
  // Throws when RESEND_API_KEY or EMAIL_FROM_DOMAIN is missing, before any row is claimed.
  const transport = deps?.transport ?? resendTransport();
  const client = deps?.client ?? createAdminClient();
  const now = deps?.now ?? (() => new Date());

  const { data: rows, error } = await client.rpc("claim_email_outbox", {
    p_keys: [...SENDABLE_TEMPLATES],
    p_subject: options.subjectId,
    p_limit: options.limit ?? IMMEDIATE_BATCH,
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
  client: OutboxClient,
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
    const message = (cause instanceof Error ? cause.message : String(cause)).slice(
      0,
      MAX_ERROR_LENGTH,
    );
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

async function update(client: OutboxClient, id: string, patch: Partial<OutboxRow>) {
  const { error } = await client.from("email_outbox").update(patch).eq("id", id);
  if (error) throw new Error(`[email] could not update outbox row ${id}: ${error.code}`);
}
