import "server-only";
import { after } from "next/server";
import { getOrigin } from "@/lib/tenant/server";
import { deliverOutbox } from "./outbox";

/**
 * Sends the emails a server action just queued for this request or profile, after the response is sent, so the
 * person never waits on the mail server. If this fails, the cron sweeper (/api/cron/email) retries the rows.
 */
export async function sendQueuedEmails(subjectId: string) {
  // The links in the email point at the school's address on this deployment; read it while the request is live.
  const origin = await getOrigin();
  after(async () => {
    try {
      await deliverOutbox({ origin, subjectId });
    } catch (error) {
      console.error(
        `[email] immediate send for ${subjectId} failed; the sweeper will retry`,
        error,
      );
    }
  });
}
