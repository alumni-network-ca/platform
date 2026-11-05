import { timingSafeEqual } from "node:crypto";
import { SWEEP_BATCH } from "@/config/email";
import { secrets } from "@/config/env/secrets";
import { deliverOutbox } from "@/lib/email/outbox";
import { getOrigin } from "@/lib/tenant/server";

// The outbox sweeper (EML-01): sends what the immediate send missed and retries failures with backoff. Called by
// the scheduler with `Authorization: Bearer <CRON_SECRET>`.
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = Buffer.from(`Bearer ${secrets.cronSecret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const result = await deliverOutbox({ origin: await getOrigin(), limit: SWEEP_BATCH });
  return Response.json(result);
}
