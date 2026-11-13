import { vi } from "vitest";

// Test builders for the email outbox (unit/lib/email/outbox.test.ts). Test-only: never imported by app code.

/** An outbox row as claim_email_outbox returns it: claimed once, for an approval email. */
export function outboxRow(overrides: Record<string, unknown> = {}) {
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

/**
 * A stand-in for the secret-key Supabase client: claim_email_outbox returns `claimed`, each table read returns its
 * canned row (override with `tables`, null for none), and every outbox update is recorded in `updates`.
 */
export function fakeOutboxClient(
  claimed: ReturnType<typeof outboxRow>[],
  tables: Record<string, unknown> = {},
) {
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
