import { afterEach, expect, it, vi } from "vitest";
import { translations } from "@/lib/i18n";
import { sendSchoolInquiry } from "@/app/site/contact-actions";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/tenant/server", () => ({ getSchool: async () => null }));
vi.mock("@/lib/i18n-server", () => ({
  getServerTranslations: async () => ({ locale: "en", t: translations.en }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rpc.mockReset();
});

function inquiry() {
  const form = new FormData();
  form.set("inquiry", "quote");
  form.set("name", "Ari Example");
  form.set("school", "Example School");
  form.set("email", "ari@example.test");
  form.set("message", "<b>Tell me more.</b>");
  return form;
}

it("delivers a quote inquiry with the visitor's reply address and a stable retry key", async () => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM_DOMAIN", "alumninetwork.ca");
  vi.stubEnv("PLATFORM_CONTACT_EMAIL", "schools@example.test");
  rpc.mockResolvedValue({ data: true, error: null });
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    if (fetchMock.mock.calls.length === 1) return new Response(null, { status: 503 });
    return Response.json({ id: "mock-delivery" });
  });

  const form = inquiry();
  await expect(sendSchoolInquiry("idle", form)).resolves.toBe("failed");
  await expect(sendSchoolInquiry("failed", form)).resolves.toBe("sent");
  const [, init] = fetchMock.mock.calls[1]!;
  expect(JSON.parse(String(init!.body))).toMatchObject({
    to: ["schools@example.test"],
    reply_to: "ari@example.test",
    subject: translations.en.schoolsLanding.quoteSubject,
    text: expect.stringContaining("<b>Tell me more.</b>"),
    html: expect.stringContaining("&lt;b&gt;Tell me more.&lt;/b&gt;"),
  });
  expect(new Headers(init!.headers).get("Idempotency-Key")).toBe(
    new Headers(fetchMock.mock.calls[0]![1]!.headers).get("Idempotency-Key"),
  );
});

it("rejects invalid submissions and stops sending when the rate limit is reached", async () => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM_DOMAIN", "alumninetwork.ca");
  const fetchMock = vi.spyOn(globalThis, "fetch");
  const form = inquiry();
  form.set("email", "not-an-email");
  await expect(sendSchoolInquiry("idle", form)).resolves.toBe("invalid");
  expect(rpc).not.toHaveBeenCalled();

  rpc.mockResolvedValue({ data: false, error: null });
  await expect(sendSchoolInquiry("idle", inquiry())).resolves.toBe("limited");
  expect(fetchMock).not.toHaveBeenCalled();
});
