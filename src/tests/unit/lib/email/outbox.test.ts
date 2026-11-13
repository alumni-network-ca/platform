import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { MAX_ATTEMPTS, SENDABLE_TEMPLATES } from "@/config/email";
import { fakeOutboxClient, outboxRow } from "@/tests/factories/email";
import type { OutgoingEmail } from "@/types/email";
import { PermanentEmailError } from "@/lib/email/errors";
import { deliverOutbox } from "@/lib/email/outbox";

const origin = {
  protocol: "http:",
  host: "localhost:3000",
  rootDomain: "localhost",
  isPreview: false,
} as const;
const now = new Date("2026-11-05T12:00:00Z");

describe("deliverOutbox", () => {
  let sent: OutgoingEmail[];
  const transport = vi.fn(async (email: OutgoingEmail) => {
    sent.push(email);
    return { providerId: "msg-1" };
  });
  beforeEach(() => {
    sent = [];
    transport.mockClear();
  });

  it("claims only the templates it can fill, for the given event", async () => {
    const { client, rpc } = fakeOutboxClient([]);
    await deliverOutbox({ origin, subjectId: "request-1" }, { client, transport, now: () => now });
    expect(rpc).toHaveBeenCalledWith("claim_email_outbox", {
      p_keys: [...SENDABLE_TEMPLATES],
      p_subject: "request-1",
      p_limit: 20,
    });
    expect(SENDABLE_TEMPLATES).not.toContain("staff_invitation");
  });

  it("sends with the outbox id as idempotency key, the school's sender and links, then marks it sent", async () => {
    const { client, updates } = fakeOutboxClient([outboxRow()]);
    const result = await deliverOutbox({ origin }, { client, transport, now: () => now });
    expect(result).toEqual({ sent: 1, retried: 0, failed: 0, skipped: 0 });
    expect(sent[0]).toMatchObject({
      id: "outbox-1",
      to: "ari@example.test",
      fromName: "Herzliah Alumni Network",
      replyTo: "alumni@herzliah.test",
      subject: "Welcome to Herzliah",
      text: "Hi Ari: http://herzliah.localhost:3000/login",
    });
    expect(updates).toEqual([
      {
        id: "outbox-1",
        patch: {
          status: "sent",
          provider_message_id: "msg-1",
          sent_at: now.toISOString(),
          last_error: null,
        },
      },
    ]);
  });

  it("puts the school's question and reason in the matching emails only", async () => {
    const tables = {
      email_templates: { subject: "s", body: "{message}|{reason}" },
      access_requests: {
        first_name: "Ari",
        grad_year: 1988,
        info_request: "Which homeroom?",
        decision_reason: "Not a graduate",
      },
    };
    for (const [key, text] of [
      ["access_needs_info", "Which homeroom?|"],
      ["access_rejected", "|Not a graduate"],
    ]) {
      sent = [];
      const { client } = fakeOutboxClient([outboxRow({ template_key: key })], tables);
      await deliverOutbox({ origin }, { client, transport, now: () => now });
      expect(sent[0]!.text).toBe(text);
    }
  });

  it("uses the record's preferred name for membership emails", async () => {
    const { client } = fakeOutboxClient(
      [outboxRow({ template_key: "membership_reactivated", subject_id: "profile-1" })],
      {
        alumni_profiles: { first_name: "Ariel", preferred_name: "Ari", grad_year: 1988 },
      },
    );
    await deliverOutbox({ origin }, { client, transport, now: () => now });
    expect(sent[0]!.text).toContain("Hi Ari:");
  });

  it("retries a failure later with backoff", async () => {
    const { client, updates } = fakeOutboxClient([outboxRow({ attempts: 2 })]);
    const failing = vi.fn().mockRejectedValue(new Error("network error"));
    const result = await deliverOutbox({ origin }, { client, transport: failing, now: () => now });
    expect(result.retried).toBe(1);
    expect(updates[0]!.patch).toEqual({
      status: "queued",
      last_error: "network error",
      next_attempt_at: new Date(now.getTime() + 5 * 60_000).toISOString(),
    });
  });

  it("gives up after the last attempt, or at once on a permanent error", async () => {
    for (const [attempts, error] of [
      [MAX_ATTEMPTS, new Error("network error")],
      [1, new PermanentEmailError("Resend responded 422")],
    ] as const) {
      const { client, updates } = fakeOutboxClient([outboxRow({ attempts })]);
      const failing = vi.fn().mockRejectedValue(error);
      const result = await deliverOutbox(
        { origin },
        { client, transport: failing, now: () => now },
      );
      expect(result.failed).toBe(1);
      expect(updates[0]!.patch).toEqual({ status: "failed", last_error: error.message });
    }
  });

  it("skips a row whose template the school no longer has approved", async () => {
    const { client, updates } = fakeOutboxClient([outboxRow()], { email_templates: null });
    const result = await deliverOutbox({ origin }, { client, transport, now: () => now });
    expect(result.skipped).toBe(1);
    expect(transport).not.toHaveBeenCalled();
    expect(updates[0]!.patch).toMatchObject({ status: "skipped_no_template" });
  });

  it.each([
    ["RESEND_API_KEY", { RESEND_API_KEY: "", EMAIL_FROM_DOMAIN: "alumninetwork.ca" }],
    ["EMAIL_FROM_DOMAIN", { RESEND_API_KEY: "re_test", EMAIL_FROM_DOMAIN: "" }],
  ])("fails without %s, before claiming anything", async (name, env) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const { client, rpc } = fakeOutboxClient([outboxRow()]);
    await expect(deliverOutbox({ origin }, { client, now: () => now })).rejects.toThrow(
      `${name} is not set`,
    );
    expect(rpc).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
