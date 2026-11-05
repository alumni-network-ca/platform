import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { deliverOutbox, MAX_ATTEMPTS, SENDABLE_TEMPLATES } from "./outbox";
import { PermanentEmailError, type OutgoingEmail } from "./transport";

const origin = {
  protocol: "http:",
  host: "localhost:3000",
  rootDomain: "localhost",
  isPreview: false,
} as const;
const now = new Date("2026-11-05T12:00:00Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "outbox-1",
    institution_id: "school-1",
    template_key: "access_approved",
    locale: "en",
    to_email: "ari@example.test",
    to_user_id: "user-1",
    subject_id: "request-1",
    status: "sending",
    attempts: 1,
    ...overrides,
  };
}

/** A stand-in for the Supabase client: canned rows per table, and every outbox update recorded. */
function fakeClient(claimed: ReturnType<typeof row>[], tables: Record<string, unknown> = {}) {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const data: Record<string, unknown> = {
    email_templates: {
      subject: "Welcome to {school_name}",
      body: "Hi {first_name}: {sign_in_link}",
    },
    institutions: {
      id: "school-1",
      name: "Herzliah High School",
      slug: "herzliah",
      default_locale: "en",
      branding: { short_name: "Herzliah", primary_color: "#0B3D91" },
      reply_to_email: "alumni@herzliah.test",
      email_display_name: null,
    },
    access_requests: {
      first_name: "Ari",
      grad_year: 1988,
      info_request: null,
      decision_reason: null,
    },
    alumni_profiles: { first_name: "Ari", preferred_name: null, grad_year: 1988 },
    ...tables,
  };
  const rpc = vi.fn().mockResolvedValue({ data: claimed, error: null });
  const from = (table: string) => {
    const query = {
      select: () => query,
      eq: (column: string, value: string) => {
        if (pending && column === "id") {
          updates.push({ id: value, patch: pending });
          pending = null;
          return Promise.resolve({ error: null });
        }
        return query;
      },
      maybeSingle: () => Promise.resolve({ data: data[table] ?? null, error: null }),
      single: () => Promise.resolve({ data: data[table], error: null }),
      update: (patch: Record<string, unknown>) => {
        pending = patch;
        return query;
      },
    };
    let pending: Record<string, unknown> | null = null;
    return query;
  };
  return { client: { rpc, from } as never, rpc, updates };
}

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
    const { client, rpc } = fakeClient([]);
    await deliverOutbox({ origin, subjectId: "request-1" }, { client, transport, now: () => now });
    expect(rpc).toHaveBeenCalledWith("claim_email_outbox", {
      p_keys: [...SENDABLE_TEMPLATES],
      p_subject: "request-1",
      p_limit: 20,
    });
    expect(SENDABLE_TEMPLATES).not.toContain("staff_invitation");
  });

  it("sends with the outbox id as idempotency key, the school's sender and links, then marks it sent", async () => {
    const { client, updates } = fakeClient([row()]);
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
      const { client } = fakeClient([row({ template_key: key })], tables);
      await deliverOutbox({ origin }, { client, transport, now: () => now });
      expect(sent[0]!.text).toBe(text);
    }
  });

  it("uses the record's preferred name for membership emails", async () => {
    const { client } = fakeClient(
      [row({ template_key: "membership_reactivated", subject_id: "profile-1" })],
      {
        alumni_profiles: { first_name: "Ariel", preferred_name: "Ari", grad_year: 1988 },
      },
    );
    await deliverOutbox({ origin }, { client, transport, now: () => now });
    expect(sent[0]!.text).toContain("Hi Ari:");
  });

  it("retries a failure later with backoff", async () => {
    const { client, updates } = fakeClient([row({ attempts: 2 })]);
    const failing = vi.fn().mockRejectedValue(new Error("SMTP down"));
    const result = await deliverOutbox({ origin }, { client, transport: failing, now: () => now });
    expect(result.retried).toBe(1);
    expect(updates[0]!.patch).toEqual({
      status: "queued",
      last_error: "SMTP down",
      next_attempt_at: new Date(now.getTime() + 5 * 60_000).toISOString(),
    });
  });

  it("gives up after the last attempt, or at once on a permanent error", async () => {
    for (const [attempts, error] of [
      [MAX_ATTEMPTS, new Error("SMTP down")],
      [1, new PermanentEmailError("Resend responded 422")],
    ] as const) {
      const { client, updates } = fakeClient([row({ attempts })]);
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
    const { client, updates } = fakeClient([row()], { email_templates: null });
    const result = await deliverOutbox({ origin }, { client, transport, now: () => now });
    expect(result.skipped).toBe(1);
    expect(transport).not.toHaveBeenCalled();
    expect(updates[0]!.patch).toMatchObject({ status: "skipped_no_template" });
  });

  it("leaves everything queued when no transport is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SMTP_URL", "");
    const { client, rpc } = fakeClient([row()]);
    const result = await deliverOutbox({ origin }, { client, now: () => now });
    expect(result).toEqual({ sent: 0, retried: 0, failed: 0, skipped: 0 });
    expect(rpc).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
